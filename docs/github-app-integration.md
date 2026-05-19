# GitHub App integration — developer checklist

This document covers the GitHub App backend in OmniTrack. The
GitHub App is a separate identity from the user's Supabase
GitHub OAuth: Supabase Auth handles **who the user is**, the
GitHub App handles **what the platform can do in a repo**.

## 1. Required env vars

Set these in Vercel and locally (`.env.local`):

```
GITHUB_APP_ID=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_PRIVATE_KEY=         # PEM. Newlines may be escaped as \n; we normalize.
GITHUB_WEBHOOK_SECRET=
GITHUB_APP_SLUG=

# Already present:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # required for webhook + sync writes
```

> ⚠️ `GITHUB_PRIVATE_KEY` is sensitive. Never expose it through
> a public env var or client bundle. The code reads it only from
> server-side modules (`lib/github/app.ts`).

## 2. GitHub App settings (configured by org owner)

- **Homepage URL**: `https://omnitrack-ten.vercel.app/`
- **Callback URL**: `https://omnitrack-ten.vercel.app/api/github/callback`
- **Setup URL** (Post installation → "Redirect on update" toggled on):
  `https://omnitrack-ten.vercel.app/settings/integrations/github/setup`
- **Webhook URL**: `https://omnitrack-ten.vercel.app/api/github/webhook`
- **Webhook secret**: matches `GITHUB_WEBHOOK_SECRET`

### Required permissions

| Scope             | Access |
|-------------------|--------|
| Repository: Contents | Read & write |
| Repository: Metadata | Read |
| Repository: Pull requests | Read & write |
| Account: Email addresses | Read (optional) |

### Required webhook events

- `installation`
- `installation_repositories`
- `repository`
- `pull_request`
- `push`

## 3. Database

Migration: [`supabase/migrations/0010_github_app_integration.sql`](../supabase/migrations/0010_github_app_integration.sql).

Tables:

- `github_installations`
- `github_repositories`
- `github_pull_requests`
- `github_webhook_events`

> Note: this repo uses `text` ids for `users` and `tickets`
> (e.g. `SIRP-123`). The spec's `auth.users(id)` (uuid) and
> `uuid` ticket_id were adapted accordingly.

## 4. Surface area

| Route | Purpose |
|-------|---------|
| `GET  /api/github/callback`              | Receives installation redirect, upserts installation + repos |
| `POST /api/github/webhook`               | Receives GitHub webhooks; verifies HMAC signature |
| `GET  /api/github/repos`                 | Lists enabled, synced repositories (auth required) |
| `POST /api/github/repos`                 | Trigger a sync (auth required) |
| `POST /api/github/sync`                  | Trigger a sync, with per-installation results |
| `POST /api/github/branches`              | Create a branch on a synced repo |
| `POST /api/github/pulls`                 | Open a PR on a synced repo |
| `POST /api/github/create-pr-from-ticket` | Branch + PR + ticket-link helper |
| `/settings/integrations/github`          | Admin page |
| `/settings/integrations/github/setup`    | Install / setup landing page |

## 5. Testing

### Webhook signature verification

Generate a test signature locally:

```bash
node -e '
  const { createHmac } = require("crypto");
  const body = JSON.stringify({ action: "created", installation: { id: 123 } });
  const sig = "sha256=" + createHmac("sha256", "your-secret").update(body).digest("hex");
  console.log("BODY:", body);
  console.log("SIG:", sig);
'
```

Then POST:

```bash
curl -X POST http://localhost:3000/api/github/webhook \
  -H 'Content-Type: application/json' \
  -H 'X-GitHub-Event: installation' \
  -H 'X-GitHub-Delivery: test-1' \
  -H "X-Hub-Signature-256: <sig from above>" \
  -d '<body from above>'
```

Expected: `200 { ok: true }` and a row in `github_webhook_events`.

A wrong signature should return `401 { error: "Invalid signature" }`.

### Repository sync

Once installed, hit:

```bash
curl -X POST https://omnitrack-ten.vercel.app/api/github/sync \
  -H 'Cookie: <auth cookies>'
```

Or click "Sync repositories" on `/settings/integrations/github`.

### Create a branch

```bash
curl -X POST https://omnitrack-ten.vercel.app/api/github/branches \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <auth cookies>' \
  -d '{
    "repositoryId": "<uuid or github_repo_id>",
    "branchName":   "sirp/ticket-123-fix-login",
    "baseBranch":   "main"
  }'
```

### Create a PR

```bash
curl -X POST https://omnitrack-ten.vercel.app/api/github/pulls \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <auth cookies>' \
  -d '{
    "repositoryId": "<uuid or github_repo_id>",
    "title":        "Fix login issue",
    "head":         "sirp/ticket-123-fix-login",
    "base":         "main",
    "ticketId":     "SIRP-123"
  }'
```

## 6. Common errors

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `401 Bad credentials` from GitHub | App JWT signed with wrong key | Re-check `GITHUB_PRIVATE_KEY`; ensure newlines are real or escaped as `\n` |
| `401 Invalid signature` on webhook | Wrong `GITHUB_WEBHOOK_SECRET`, or body was reformatted before verification | Confirm secret matches GitHub App settings; never parse JSON before `verifyGitHubWebhookSignature` |
| `404 Not Found` minting token | `installation_id` not for this App | Confirm the App was installed and `installation_id` is correct |
| `404 Not Found` when reading a repo | Repo not in installed list | Re-install the App and include the repo, or re-sync |
| `422 Reference already exists` on branch create | Branch already there | Handled — route returns 200 `alreadyExists: true` |
| `403 Resource not accessible by integration` | Missing repo permission | Update App permissions (e.g. `pull_requests: write`) and re-accept |
| `403 Workflow permission required` | Trying to push `.github/workflows/*` without the Workflows permission | Grant the Workflows permission to the App |

## 7. Security notes

- All repo write operations go through server routes — installation
  tokens never reach the browser.
- The webhook route verifies signatures before parsing JSON.
- Service-role Supabase writes are isolated to the webhook +
  sync paths (`lib/supabase/service.ts`).
- Branch names are validated server-side (`lib/github/repos.ts`).
- TODO (role-gating): only admins should be able to trigger
  sync; only assigned/authorized users should be able to create
  branches and PRs. Hook these into the existing `users.role`
  column when the role model is finalized.

## 8. Where things live

```
app/api/github/
  webhook/route.ts
  callback/route.ts
  repos/route.ts
  sync/route.ts
  branches/route.ts
  pulls/route.ts
  create-pr-from-ticket/route.ts

app/settings/integrations/github/
  page.tsx                  # admin
  setup/page.tsx            # install landing

lib/github/
  app.ts                    # JWT + REST + branch/PR helpers
  webhooks.ts               # signature + header + event parsing
  webhook.ts                # legacy ticket-update derivation (kept for compatibility)
  installations.ts          # DB upsert helpers
  repos.ts                  # repo lookup + branch name validation

lib/supabase/
  client.ts                 # browser (anon)
  server.ts                 # SSR (cookies)
  service.ts                # service role (server-only)

supabase/migrations/
  0010_github_app_integration.sql
```
