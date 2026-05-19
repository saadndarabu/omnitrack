/**
 * GitHub App helpers — JWT signing, installation tokens,
 * and a thin REST client. Uses Node's built-in crypto so no
 * extra dependency (jose / jsonwebtoken / Octokit) is required.
 *
 * Server-only module. Never import from client components.
 */

import { createSign, createPrivateKey } from "crypto"

const GITHUB_API = "https://api.github.com"
const API_VERSION = "2022-11-28"
const ACCEPT = "application/vnd.github+json"

// ── Env ──────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

export function getGitHubAppId(): string {
  return requireEnv("GITHUB_APP_ID")
}

export function getGitHubAppSlug(): string {
  // app_slug is mostly cosmetic (used to build install URLs) so
  // we don't hard-fail if it's missing.
  return process.env.GITHUB_APP_SLUG ?? ""
}

/**
 * Returns the GitHub App private key.
 * Vercel/CI env vars typically store newlines as the literal
 * sequence "\n"; normalise them back to real line breaks.
 */
export function getGitHubPrivateKey(): string {
  const raw = requireEnv("GITHUB_PRIVATE_KEY")
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw
}

// ── JWT (RS256) ──────────────────────────────────────────────

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

/**
 * Creates a short-lived (≤10 min) GitHub App JWT.
 * GitHub requires iat to be ≤ now and exp ≤ now + 600s.
 * We back-date iat by 60s to absorb minor clock skew.
 */
export function createGitHubAppJwt(): string {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,     // 9 min — under GitHub's 10 min cap
    iss: getGitHubAppId()
  }

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`

  const privateKey = createPrivateKey(getGitHubPrivateKey())
  const signer = createSign("RSA-SHA256")
  signer.update(signingInput)
  signer.end()
  const signature = b64url(signer.sign(privateKey))

  return `${signingInput}.${signature}`
}

// ── Installation access tokens (cached in-memory) ────────────

type TokenCacheEntry = { token: string; expiresAt: number }
const tokenCache = new Map<number, TokenCacheEntry>()

/**
 * Returns a fresh installation access token. Cached until ~1
 * minute before expiry to avoid hammering the auth endpoint
 * during webhook bursts.
 */
export async function getInstallationAccessToken(installationId: number): Promise<string> {
  const cached = tokenCache.get(installationId)
  const now = Date.now()
  if (cached && cached.expiresAt - 60_000 > now) {
    return cached.token
  }

  const jwt = createGitHubAppJwt()
  const res = await fetch(`${GITHUB_API}/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Accept: ACCEPT,
      Authorization: `Bearer ${jwt}`,
      "X-GitHub-Api-Version": API_VERSION,
      "User-Agent": "omnitrack-github-app"
    }
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(
      `Failed to mint installation token for ${installationId}: ${res.status} ${res.statusText} — ${body}`
    )
  }

  const data = (await res.json()) as { token: string; expires_at: string }
  const expiresAt = new Date(data.expires_at).getTime()
  tokenCache.set(installationId, { token: data.token, expiresAt })
  return data.token
}

export function clearInstallationTokenCache(installationId?: number) {
  if (installationId) tokenCache.delete(installationId)
  else tokenCache.clear()
}

// ── REST client ──────────────────────────────────────────────

type FetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>
}

/**
 * Low-level GitHub REST helper. Caller supplies the token
 * (either an App JWT or an installation token). Returns the
 * parsed JSON body, or throws an Error with the GitHub status
 * and response body for any non-2xx response.
 */
export async function githubFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
  token?: string
): Promise<T> {
  const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`
  const headers: Record<string, string> = {
    Accept: ACCEPT,
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": "omnitrack-github-app",
    ...(options.headers ?? {})
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers })

  if (res.status === 204) return undefined as T

  const text = await res.text()
  const json = text ? safeJson(text) : null

  if (!res.ok) {
    const message =
      (json && typeof json === "object" && "message" in json && (json as { message?: string }).message) ||
      res.statusText
    const err = new GitHubApiError(
      `GitHub ${res.status} ${res.statusText} on ${path}: ${message}`,
      res.status,
      json
    )
    throw err
  }

  return json as T
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return text }
}

export class GitHubApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = "GitHubApiError"
    this.status = status
    this.body = body
  }
}

// ── High-level helpers ───────────────────────────────────────

export type GitHubRepoSummary = {
  id: number
  name: string
  full_name: string
  owner: { login: string; id: number; type: string }
  private: boolean
  default_branch: string
  html_url: string
}

/**
 * Lists repositories accessible to an installation. Handles
 * pagination via the per_page=100 query and the `installations`
 * endpoint shape ({ repositories: [...] }).
 */
export async function getInstallationRepositories(installationId: number): Promise<GitHubRepoSummary[]> {
  const token = await getInstallationAccessToken(installationId)
  const all: GitHubRepoSummary[] = []
  let page = 1

  // GitHub caps at 100 per page. Stop when a page returns < 100.
  while (true) {
    const data = await githubFetch<{ total_count: number; repositories: GitHubRepoSummary[] }>(
      `/installation/repositories?per_page=100&page=${page}`,
      {},
      token
    )
    all.push(...data.repositories)
    if (data.repositories.length < 100) break
    page += 1
    if (page > 20) break // safety
  }

  return all
}

export async function getRepository(owner: string, repo: string, installationId: number): Promise<GitHubRepoSummary> {
  const token = await getInstallationAccessToken(installationId)
  return githubFetch<GitHubRepoSummary>(`/repos/${owner}/${repo}`, {}, token)
}

export type GitRef = {
  ref: string
  node_id: string
  url: string
  object: { sha: string; type: string; url: string }
}

export async function getBranchRef(
  owner: string,
  repo: string,
  branch: string,
  installationId: number
): Promise<GitRef> {
  const token = await getInstallationAccessToken(installationId)
  return githubFetch<GitRef>(
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    {},
    token
  )
}

export type CreateBranchInput = {
  owner: string
  repo: string
  baseBranch: string
  newBranch: string
  installationId: number
}

export async function createBranchFromBase(input: CreateBranchInput): Promise<GitRef> {
  const { owner, repo, baseBranch, newBranch, installationId } = input
  const token = await getInstallationAccessToken(installationId)

  const baseRef = await getBranchRef(owner, repo, baseBranch, installationId)

  return githubFetch<GitRef>(
    `/repos/${owner}/${repo}/git/refs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: `refs/heads/${newBranch}`,
        sha: baseRef.object.sha
      })
    },
    token
  )
}

export type CreatePullRequestInput = {
  owner: string
  repo: string
  title: string
  body?: string
  head: string
  base: string
  draft?: boolean
  installationId: number
}

export type PullRequestResponse = {
  id: number
  number: number
  title: string
  body: string | null
  html_url: string
  state: string
  draft: boolean
  merged: boolean
  head: { ref: string; sha: string }
  base: { ref: string; sha: string }
  created_at: string
  updated_at: string
}

export async function createPullRequest(input: CreatePullRequestInput): Promise<PullRequestResponse> {
  const { owner, repo, title, body, head, base, draft, installationId } = input
  const token = await getInstallationAccessToken(installationId)

  return githubFetch<PullRequestResponse>(
    `/repos/${owner}/${repo}/pulls`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, head, base, draft: draft ?? false })
    },
    token
  )
}
