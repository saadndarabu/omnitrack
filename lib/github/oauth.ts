const GITHUB_API = "https://api.github.com"

const GITHUB_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28"
})

export type GithubUser = {
  id: number
  login: string
  name: string | null
  avatar_url: string
}

export type GithubRepo = {
  id: number
  full_name: string
  name: string
  private: boolean
  description: string | null
}

export function githubAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_OAUTH_CLIENT_ID ?? "",
    scope: "repo",
    state
  })
  return `https://github.com/login/oauth/authorize?${params}`
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
      code
    })
  })
  const data = (await res.json()) as { access_token?: string; error?: string }
  if (!data.access_token) throw new Error(data.error ?? "No access token returned")
  return data.access_token
}

export async function getGithubUser(token: string): Promise<GithubUser> {
  const res = await fetch(`${GITHUB_API}/user`, { headers: GITHUB_HEADERS(token) })
  if (!res.ok) throw new Error("Failed to fetch GitHub user")
  return res.json() as Promise<GithubUser>
}

export async function getGithubRepos(token: string): Promise<GithubRepo[]> {
  const res = await fetch(
    `${GITHUB_API}/user/repos?type=all&per_page=100&sort=updated`,
    { headers: GITHUB_HEADERS(token) }
  )
  if (!res.ok) throw new Error("Failed to fetch GitHub repos")
  return res.json() as Promise<GithubRepo[]>
}

export async function createGithubBranch(
  token: string,
  repo: string,
  branchName: string,
  baseBranch = "main"
): Promise<void> {
  const refRes = await fetch(
    `${GITHUB_API}/repos/${repo}/git/ref/heads/${baseBranch}`,
    { headers: GITHUB_HEADERS(token) }
  )
  if (!refRes.ok) throw new Error(`Base branch '${baseBranch}' not found in ${repo}`)
  const { object } = (await refRes.json()) as { object: { sha: string } }

  const createRes = await fetch(`${GITHUB_API}/repos/${repo}/git/refs`, {
    method: "POST",
    headers: { ...GITHUB_HEADERS(token), "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: object.sha })
  })
  if (!createRes.ok) {
    const err = (await createRes.json()) as { message?: string }
    throw new Error(err.message ?? "Failed to create branch")
  }
}

export async function createGithubPR(
  token: string,
  repo: string,
  head: string,
  base: string,
  title: string,
  body: string
): Promise<number> {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/pulls`, {
    method: "POST",
    headers: { ...GITHUB_HEADERS(token), "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, head, base })
  })
  if (!res.ok) {
    const err = (await res.json()) as { message?: string }
    throw new Error(err.message ?? "Failed to create pull request")
  }
  const pr = (await res.json()) as { number: number }
  return pr.number
}
