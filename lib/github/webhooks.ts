/**
 * GitHub webhook signature verification + header parsing.
 *
 * GitHub signs the *raw* request body with HMAC-SHA-256 using
 * the webhook secret and sends the result in `X-Hub-Signature-256`
 * as `sha256=<hex>`. The signature must be compared with
 * timingSafeEqual to avoid timing leaks.
 *
 * The caller MUST read the raw body (await request.text()) before
 * JSON.parse — any reformatting will invalidate the signature.
 */

import { createHmac, timingSafeEqual } from "crypto"

const SIGNATURE_HEADER = "x-hub-signature-256"
const EVENT_HEADER     = "x-github-event"
const DELIVERY_HEADER  = "x-github-delivery"

export function verifyGitHubWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false
  if (!secret) return false

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  const provided = signatureHeader.slice("sha256=".length)

  if (expected.length !== provided.length) return false

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"))
  } catch {
    return false
  }
}

// ── Header parsing ───────────────────────────────────────────

export type GitHubWebhookHeaders = {
  event: string | null
  delivery: string | null
  signature: string | null
}

export function getGitHubWebhookHeaders(headers: Headers): GitHubWebhookHeaders {
  return {
    event:     headers.get(EVENT_HEADER),
    delivery:  headers.get(DELIVERY_HEADER),
    signature: headers.get(SIGNATURE_HEADER)
  }
}

// ── Event parsing ────────────────────────────────────────────

export type ParsedGitHubEvent = {
  event: string
  delivery: string
  action: string | null
  installationId: number | null
  repoId: number | null
  repoFullName: string | null
  payload: GitHubEventPayload
}

export type GitHubEventPayload = {
  action?: string
  installation?: {
    id?: number
    account?: { login?: string; id?: number; type?: string }
    repository_selection?: string
    app_slug?: string
  }
  repository?: {
    id?: number
    name?: string
    full_name?: string
    owner?: { login?: string; id?: number; type?: string }
    private?: boolean
    default_branch?: string
    html_url?: string
  }
  repositories?: Array<{
    id: number
    name: string
    full_name: string
    private?: boolean
  }>
  repositories_added?: Array<{
    id: number
    name: string
    full_name: string
    private?: boolean
  }>
  repositories_removed?: Array<{
    id: number
    name: string
    full_name: string
  }>
  pull_request?: {
    id: number
    number: number
    title?: string | null
    body?: string | null
    html_url?: string
    state?: string
    merged?: boolean
    head?: { ref?: string | null }
    base?: { ref?: string | null }
    created_at?: string
    updated_at?: string
  }
  sender?: { login?: string; id?: number }
  [key: string]: unknown
}

/**
 * Pulls the small set of fields the webhook route needs to log
 * and dispatch, without forcing every handler to re-parse.
 */
export function parseGitHubEvent(headers: Headers, payload: GitHubEventPayload): ParsedGitHubEvent {
  const { event, delivery } = getGitHubWebhookHeaders(headers)

  return {
    event: event ?? "unknown",
    delivery: delivery ?? "",
    action: payload.action ?? null,
    installationId: payload.installation?.id ?? null,
    repoId: payload.repository?.id ?? null,
    repoFullName: payload.repository?.full_name ?? null,
    payload
  }
}
