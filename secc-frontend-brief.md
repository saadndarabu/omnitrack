# SECC — Frontend Brief

Sirp Engineering Command Center (SECC) is SIRP's internal ticketing tool — a calm, Linear-grade replacement for Jira, used by the ~12 engineers building the OmniSense stack. This document is the contract for how the frontend gets built. Read it before writing a component. Treat it as binding.

If something in this brief conflicts with a request in chat or in a PR, the brief wins until the brief itself is updated and committed in the same PR.

This is an internal tool. The customer-facing SIRP brand vocabulary (Co-Analyst, OmniSense product naming, etc.) does **not** apply here — SECC is named SECC, never anything else.

---

## 1. North-star principles

1. **Hygiene through minimalism.** Every field, column, dropdown, and option is a tax on ticket hygiene. Default is to omit. Add only when a real workflow demands it, and remove on the next iteration if it isn't being used.
2. **One row, one ticket.** No nested epics, sub-tasks, swimlanes, or parent/child trees in v1. Work that doesn't fit a single row is two tickets.
3. **Keyboard-first.** Every common action has a shortcut. If completing a workflow requires the mouse, the design failed.
4. **Git is first-class.** Branch creation on status change, PR open, PR merge are all reflected in the UI within seconds. Nobody should need to ask "did the branch get made."
5. **Boring tech, calm UI.** No shimmering skeletons, no celebratory animations, no easter eggs. Engineers spend hours a day in this surface — calm wins.
6. **Code over prompts (ADR 0006).** The status state machine, the validation rules, the ID format — all live in TypeScript and tests, never in copy or prompts.

---

## 2. Stack & conventions

- **Framework:** Next.js 14+, App Router, React Server Components by default. Server Actions for all mutations — no API routes unless a third party needs to hit one.
- **Styling:** Tailwind CSS + shadcn/ui primitives. Install only what's used; no kitchen-sink imports.
- **Icons:** `lucide-react`, outline only. 16px inside list rows, 20px in headers, 24px max as decorative. Never hand-draw icon SVG.
- **Fonts:** `next/font/google` → **DM Sans** (sans body), **IBM Plex Mono** (mono). Wired as CSS variables in `app/layout.tsx`. No webfont CDNs.
- **Auth:** Supabase Google OAuth. The Google OAuth client must be configured as *Internal* under the sirp.io Workspace. A Postgres trigger on `auth.users` insert hard-rejects any email not ending in `@sirp.io` — belt and suspenders.
- **DB:** Supabase Postgres. RLS on every table, even though SECC is single-org. Tenant isolation is a habit, not a feature flag.
- **State:** React Server Components for reads; Server Actions + `revalidatePath` for writes. No Redux, no Zustand, no React Query unless a real-time need forces it. Supabase Realtime for the ticket list (so status changes from PR webhooks appear without refresh).
- **Deploy:** Vercel, from `main`. PRs only. One fix = one commit.

### File layout

```
app/
  layout.tsx               // fonts, theme, providers
  page.tsx                 // → redirects to /tickets
  login/page.tsx           // Supabase Google sign-in only
  tickets/
    page.tsx               // list view (status-grouped)
    [id]/page.tsx          // detail route (also opens as modal over list)
  api/
    github/webhook/route.ts // PR opened / merged → update ticket
components/
  ticket-row.tsx
  status-icon.tsx
  status-group.tsx
  ticket-detail.tsx
  avatar.tsx
  tag.tsx
  git-pill.tsx
  command-menu.tsx         // cmd-k
  sidebar.tsx
lib/
  supabase/                // server + client helpers
  github/                  // GitHub App SDK wrapper
  status.ts                // typed state machine — see §6
  ids.ts                   // SIRP-NNN generation, parsing
types/
  ticket.ts
  user.ts
tests/
  status.test.ts           // exhaustive transition tests
  github-webhook.test.ts   // every webhook bug becomes a fixture here
```

---

## 3. Visual identity

### 3.1 Palette

SIRP brand is a dark, calm surface with a single sharp purple accent. Light mode is supported but dark is the default.

| Token | Light | Dark | Use |
|-|-|-|-|
| `--bg` | `#FAFAF8` | `#0A0A0A` | Page background |
| `--surface` | `#FFFFFF` | `#141414` | Cards, ticket rows |
| `--surface-2` | `#F4F4F0` | `#1C1C1C` | Group headers, row hover, sidebar |
| `--border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` | All borders, always 0.5px |
| `--text` | `#0A0A0A` | `#F5F5F5` | Body |
| `--text-muted` | `#6B6B6B` | `#A3A3A3` | Meta, secondary labels |
| `--text-faint` | `#9A9A9A` | `#6B6B6B` | Ticket IDs, timestamps |
| `--accent` | `#8E2DFF` | `#A263FF` | Logo mark, primary action, active nav |
| `--status-todo` | `#9A9A9A` | `#6B6B6B` | |
| `--status-progress` | `#D97706` | `#F59E0B` | |
| `--status-review` | `#2563EB` | `#60A5FA` | |
| `--status-done` | `#16A34A` | `#4ADE80` | |
| `--status-blocked` | `#DC2626` | `#F87171` | |

**Accent rules.** `--accent` appears on exactly four things: the logo mark, the "New ticket" primary button, the currently-selected sidebar item (2px left border), and selection highlights in the command menu. Don't sprinkle purple on tags, badges, links, or hover states.

### 3.2 Typography

- Body: DM Sans. 14px ticket rows, 13px filter row, 11px meta. Line-height 1.5 for body, 1.3 for dense rows.
- Mono: IBM Plex Mono. Used for ticket IDs (`SIRP-142`), branch names (`fix/SIRP-141-rate-limit`), PR refs (`PR #284`), and inline code fragments.
- Weights: **400 and 500 only.** Never 600 or 700 — they look heavy and break the calm.
- **Sentence case everywhere.** Never Title Case. Never ALL CAPS. This applies to button labels, headings, status labels, group headers — every string in the UI.

### 3.3 Spacing, shape, motion

- 4px base unit. All spacing snaps to multiples of 4 (4, 8, 12, 16, 24, 32).
- Border radius: 6px (pills, badges), 8px (inputs, small cards), 12px (panels, the detail modal). Nothing rounder.
- Borders: always **0.5px** solid `--border`. Hairlines, not lines.
- No shadows. No gradients. No blur. No glow. No noise textures.
- Focus rings: 2px solid `--accent` at 40% alpha, 1px offset. Inputs only — buttons get a brightness shift instead.
- Transitions: `120ms ease-out` for hover background, `80ms` for status icon swaps. Nothing else animates.

---

## 4. Layout shell

```
┌─────────┬────────────────────────────────────────┐
│         │  Header  (project · search · new)      │
│ Sidebar ├────────────────────────────────────────┤
│ 220px   │  Filter row  (Active · Mine · All)     │
│         ├────────────────────────────────────────┤
│ Inbox   │                                        │
│ Mine    │  Ticket list (status-grouped)          │
│ All     │                                        │
│ Done    │                                        │
│         │                                        │
│ ─────   │                                        │
│ SARA    │                                        │
│ OmniScan│                                        │
│ Platform│                                        │
└─────────┴────────────────────────────────────────┘
```

- **Sidebar:** 220px fixed, `--surface-2` background, no row separators. Current item gets a 2px `--accent` left border and `--text` color (others are `--text-muted`).
- **Main column:** max 1200px, centered when the viewport is wider.
- **Header:** 48px tall, contains breadcrumb (`SIRP / All tickets`), search icon (opens cmd-k), filter icon, and the primary "New ticket" button.
- **Ticket detail:** opens as a modal over the list AND is deep-linkable. `/t/SIRP-141` opens the modal on top of `/tickets`. Browser back closes the modal but stays on the list. Esc closes the modal. This is non-negotiable — engineers will paste links in Slack constantly.

---

## 5. Core components

These are the patterns. Every list view, every detail view, every page reuses them. Don't invent new variants without a real reason.

### 5.1 Status icon

A 16px lucide icon, color-mapped to status. The component takes a `Status` and returns the right icon + color — no caller picks an icon themselves.

```tsx
// components/status-icon.tsx
import { Circle, CircleDot, CircleDashed, CircleCheck, Ban } from "lucide-react"
import type { Status } from "@/lib/status"

const map: Record<Status, { Icon: any; cls: string }> = {
  backlog:    { Icon: CircleDashed, cls: "text-[var(--text-faint)]" },
  todo:       { Icon: Circle,       cls: "text-[var(--status-todo)]" },
  in_progress:{ Icon: CircleDot,    cls: "text-[var(--status-progress)]" },
  in_review:  { Icon: CircleDot,    cls: "text-[var(--status-review)]" },
  done:       { Icon: CircleCheck,  cls: "text-[var(--status-done)]" },
  blocked:    { Icon: Ban,          cls: "text-[var(--status-blocked)]" },
}

export function StatusIcon({ status, size = 16 }: { status: Status; size?: number }) {
  const { Icon, cls } = map[status]
  return <Icon size={size} className={cls} aria-label={status} />
}
```

### 5.2 Ticket row

The atom of the list view. Density target: ~40px row height. Hover swaps background to `--surface-2`. Click opens the detail modal.

Order, left to right: status icon, ID (mono, faint), title (flex), git pill (optional), timestamp (faint), assignee avatar.

```tsx
<button
  onClick={() => openTicket(ticket.id)}
  className="flex w-full items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] hover:bg-[var(--surface-2)] text-left"
>
  <StatusIcon status={ticket.status} />
  <span className="font-mono text-[11px] text-[var(--text-faint)] w-[60px] shrink-0">
    {ticket.id}
  </span>
  <span className="flex-1 truncate text-[14px]">{ticket.title}</span>
  {ticket.pr_number ? (
    <GitPill type="pr" value={ticket.pr_number} />
  ) : ticket.branch ? (
    <GitPill type="branch" value={ticket.branch} />
  ) : null}
  <span className="text-[11px] text-[var(--text-faint)]">{relTime(ticket.updated_at)}</span>
  <Avatar user={ticket.assignee} />
</button>
```

### 5.3 Status group header

Used to group tickets in the list view. Quietly delineates without shouting.

```tsx
<div className="flex items-center gap-2 px-4 py-1.5 bg-[var(--surface-2)] text-[11px] font-medium text-[var(--text-muted)]">
  <StatusIcon status={status} size={13} />
  <span>{label}</span>
  <span className="text-[var(--text-faint)] font-normal">{count}</span>
</div>
```

### 5.4 Avatar

Initials-only. Background uses a hash of the user ID mapped to one of five soft tints (info, success, warning, danger, accent). 22px diameter in rows, 28px in the detail header.

### 5.5 Tag / pill

Free-text tags. Lowercase, mono-ish weight, `--surface-2` background, `--text-muted` color, 6px radius, 11px font. No colored tag variants in v1 — too many tag colors are exactly the clutter we're avoiding.

### 5.6 Git pill

Mono. Branch pills show a `GitBranch` icon + the branch name (truncate at 24 chars). PR pills show a `GitPullRequest` icon in `--status-review` and the PR number. PR pill replaces branch pill the moment a PR is opened.

### 5.7 Command menu (cmd-k)

`Ctrl/Cmd + K` opens a fuzzy search over: ticket IDs, titles, statuses, assignees. Arrow keys navigate, Enter opens. This is the keyboard backbone — without it the tool is just a worse list. Build it on day 1, not week 4.

---

## 6. Status state machine

Lives in `lib/status.ts`. Codified, exhaustively tested.

```ts
export type Status =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "blocked"

export const TRANSITIONS: Record<Status, Status[]> = {
  backlog:     ["todo", "blocked"],
  todo:        ["in_progress", "backlog", "blocked"],
  in_progress: ["in_review", "blocked", "todo"],
  in_review:   ["done", "in_progress", "blocked"],
  done:        ["in_progress"],            // reopen
  blocked:     ["todo", "in_progress"],
}

export function canTransition(from: Status, to: Status): boolean {
  return TRANSITIONS[from].includes(to)
}
```

Every UI control that changes status calls `canTransition` first. Server Actions re-validate. `tests/status.test.ts` enumerates every (from, to) pair — valid pairs assert allowed, invalid pairs assert rejected.

**Side effects on transition** (handled in the Server Action, not the UI):

- `* → in_progress` → call GitHub App, create branch `<type>/SIRP-NNN-<kebab-title>` from `main`. Persist branch name on the ticket.
- `in_progress → in_review` → no automatic action; this is set by the GitHub webhook when a PR opens referencing the ticket ID.
- `in_review → done` → set by the GitHub webhook on PR merge. UI `Done` button is hidden in `in_review` state.
- Any → `blocked` → require a comment with the reason. No silent blocks.

---

## 7. Interaction & keyboard map

| Key | Action |
|-|-|
| `c` | New ticket |
| `Cmd/Ctrl + K` | Command menu |
| `/` | Focus search |
| `j` / `k` | Move selection down / up in list |
| `Enter` | Open selected ticket |
| `Esc` | Close modal / clear selection |
| `1`–`5` | Set status of selected/open ticket (todo, in_progress, in_review, done, blocked) |
| `a` | Assign (opens user picker) |
| `r` | Reopen (only valid on `done`) |
| `e` | Edit title inline |

Every shortcut is documented in a `?` modal (also bound to `?`). If you add a new shortcut, you add it to this map and the modal in the same PR.

---

## 8. Anti-patterns — DO NOT

- Don't add custom fields. Tags exist for a reason.
- Don't add priority levels (P0/P1/P2). Tag with `urgent` if needed; it's almost never needed.
- Don't add story points, time estimates, or time tracking. SECC is not a billing tool.
- Don't add sprints, cycles, or milestones in v1. If the team adopts cycles later, that's a designed feature, not a creep.
- Don't add per-project workflows. One state machine, all projects.
- Don't add file attachments in v1. Engineers paste links to GitHub gists, screenshots in Slack. Defer.
- Don't add email-to-ticket. SECC is for engineers, not customer support.
- Don't add charts or "velocity" dashboards. The list IS the dashboard.
- Don't override the palette tokens with one-off hex colors. If a new color is genuinely needed, it goes in §3.1 in the same PR.
- Don't add loading skeletons that animate. A static muted-text placeholder is enough; this app is fast.
- Don't add tooltips on icon-only buttons that aren't keyboard-accessible. Aria-label + the `?` modal cover it.

---

## 9. Definition of done for any frontend PR

- [ ] No new colors outside §3.1, no new font sizes outside §3.2.
- [ ] All copy is sentence case.
- [ ] No `any` types added. No `// @ts-ignore` without a comment explaining the underlying issue.
- [ ] At least one test added if the change touches the status machine, the GitHub webhook, or auth gating (per ADR 0006/0007).
- [ ] Keyboard navigation still works on every modified screen.
- [ ] Dark mode rendered and verified — no hardcoded blacks or whites.
- [ ] If a customer-reported (or teammate-reported) bad output triggered this PR, a regression fixture using the exact offending input is committed under `tests/`.
- [ ] No secrets in the diff. `.env`, tokens, GitHub App private keys never appear.

---

## 10. Things explicitly out of scope for v1

Mobile app · file attachments · custom workflows · sprints / cycles · time tracking · velocity dashboards · email-to-ticket · multiple ticket types beyond `task` · saved filters · custom views · user mentions in comments (plain text comments only) · public sharing · API for third parties.

Each of these is a real feature with real engineering cost. They are not v1. Pushing them to v2+ is a feature, not a gap.
