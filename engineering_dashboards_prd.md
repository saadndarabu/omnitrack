# PRD: Engineering Dashboards Module

## 1. Product Summary

The dashboard module will become the default landing experience for SIRP’s internal engineering project management tool. Since the team works in an open manner and visibility is shared across individuals, the module should support two primary dashboard modes:

1. **My Dashboard** — the default view focused on the current user’s assigned work, review responsibilities, blockers, due items, and weekly movement.
2. **Team Dashboard** — a shared visibility view showing overall team health, workload, progress, blockers, and delivery trends.

The experience should feel outstandingly beautiful, calm, premium, and insight-led — closer to Linear, Notion, Vercel, and modern command-center tooling than traditional Jira dashboards.

The dashboard should not simply show charts. It should provide a clear narrative about the state of work:

- What is moving?
- What is blocked?
- What is at risk?
- What needs attention today?
- Where is the team overloaded?
- What changed since last week?

Where useful, Gemini 2.5 Flash can generate short natural-language insights from structured dashboard metrics.

---

## 2. Problem Statement

The current application has an empty dashboard module. Tickets, table views, and ticket detail pages are being introduced, but there is no executive or personal view that helps engineers and managers quickly understand work state.

Without a dashboard, users must manually scan tickets to understand:

- Which tickets need their attention.
- Which work is blocked.
- Which sprint or initiative is at risk.
- What has been completed recently.
- Who is overloaded.
- What has changed since the last standup or review.

This creates manual coordination overhead and weakens the value of the internal tool.

---

## 3. Goals

### Product Goals

- Make the dashboard the default module users land on after opening the app.
- Provide a beautiful and useful **My Dashboard** experience by default.
- Allow switching to a **Team Dashboard** from the dashboard header.
- Surface clear, actionable engineering insights.
- Use existing ticket data first, without requiring a large new data model.
- Make the dashboard valuable even with limited current functionality.
- Create a foundation for future sprint, release, GitHub, QA, and AI insights.

### User Goals

Users should be able to answer the following quickly:

#### My Dashboard

- What am I working on?
- What is due soon?
- What is blocked?
- What needs my review or QA?
- What did I complete recently?
- What should I focus on next?

#### Team Dashboard

- How much work is currently active?
- How many tickets are blocked?
- Which statuses are overloaded?
- Who is working on what?
- Which priorities are dominating the queue?
- Which initiatives/modules are receiving the most engineering attention?
- What changed recently?

---

## 4. Non-Goals for V1

The first version should avoid becoming a heavy analytics product.

Do not build the following in V1:

- Complex velocity forecasting.
- Advanced sprint burndown calculations unless sprint data already exists.
- Full release-readiness scoring.
- GitHub PR analytics.
- SLA analytics.
- Custom dashboard builder.
- Drag-and-drop widgets.
- Saved dashboard layouts.
- Cross-team permissions model.
- Deep AI recommendations that require full historical context.

V1 should be simple, beautiful, fast, and grounded in available ticket data.

---

## 5. Users and Personas

### 5.1 Engineer

Needs a clean view of their assigned tickets, blockers, review items, due dates, and recently completed work.

### 5.2 Engineering Lead / Manager

Needs visibility across people, priorities, statuses, blockers, and progress.

### 5.3 Product Manager

Needs to understand what is moving, what is stuck, what affects delivery, and which initiatives are receiving attention.

### 5.4 QA

Needs to understand tickets ready for QA, tickets in QA, failed QA items, and tickets needing retest. If QA-specific fields do not exist yet, this can be deferred.

---

## 6. Dashboard Modes

## 6.1 My Dashboard

This should be the default dashboard.

### Entry Behavior

When the user opens `/dashboard`, the system should load:

```text
Dashboard → My Dashboard
```

Until Supabase Auth is wired, the dashboard can use the existing `currentUser` placeholder from `mock-data`.

Once Supabase Auth is added, the current user should come from the authenticated Supabase session.

### My Dashboard Primary Sections

1. **Hero Insight Strip**
2. **Focus Cards**
3. **My Work by Status**
4. **Priority Mix**
5. **Due Soon / Overdue**
6. **Blocked Work**
7. **Recently Updated / Recently Completed**
8. **AI Narrative Summary**

---

## 6.2 Team Dashboard

The team dashboard should be accessible via a toggle in the dashboard header.

Example:

```text
[ My Dashboard ] [ Team Dashboard ]
```

### Team Dashboard Primary Sections

1. **Team Health Strip**
2. **Work by Status**
3. **Priority Distribution**
4. **Owner Workload**
5. **Blocked Tickets**
6. **Initiative / Module Distribution**
7. **Recent Movement**
8. **AI Narrative Summary**

---

## 7. Recommended V1 Dashboard Widgets

The system currently has limited functionality, so widgets should be based on fields already likely available from the tickets table.

Assumed available ticket fields:

```text
id
title
type / work_type
status
owner / assignee
priority
due_date
updated_at
created_at
labels
```

Potentially available or soon-to-add fields:

```text
initiative
module
sprint
blocked_reason
reviewer
qa_owner
completed_at
```

If a field does not exist yet, the widget should gracefully hide or show an empty state.

---

# 8. My Dashboard Widgets

## 8.1 Hero Insight Strip

### Purpose

Give the user immediate understanding of their personal workload.

### Cards

- **Assigned to Me**
- **In Progress**
- **Blocked**
- **Due Soon**
- **Completed This Week**

### Data Source

Tickets where:

```text
owner_id = currentUser.id
```

### Metrics

```text
assigned_count
in_progress_count
blocked_count
due_soon_count
completed_this_week_count
```

### Visual Style

- Horizontal card grid.
- Large number.
- Small label.
- Tiny contextual line.
- Subtle icon.
- Dark background with soft borders.

Example copy:

```text
7
Assigned to you
3 actively moving
```

---

## 8.2 Today’s Focus

### Purpose

Provide a prioritized list of what the user should look at first.

### Logic

Show tickets assigned to current user ordered by:

1. Blocked tickets first.
2. Critical priority.
3. High priority.
4. Due soon.
5. Recently updated.

### UI

A compact list of 5–7 tickets.

Each row should show:

```text
Ticket ID
Title
Status
Priority
Due date
```

### Empty State

```text
Nothing urgent right now. Your queue is clean.
```

---

## 8.3 My Work by Status

### Chart Type

Donut chart or horizontal stacked bar.

### Recommendation

Use a **horizontal stacked bar** for V1 because it is more readable and feels less generic than a donut.

### Statuses

```text
Backlog
To-do
In progress
In review
QA
Blocked
Done
```

### Data Source

Tickets assigned to current user grouped by status.

### Insight

If one status dominates, show a short line:

```text
Most of your active work is currently in progress. Consider moving completed items into review or QA.
```

---

## 8.4 Priority Mix

### Chart Type

Small vertical bar chart or pill distribution.

### Recommendation

Use a **pill distribution** for V1.

Example:

```text
Critical  2
High      4
Medium    6
Low       1
```

### Purpose

Help users understand how heavy their workload is.

### Narrative Example

```text
Your queue is weighted toward high-priority work. Avoid pulling new work until the critical items move forward.
```

---

## 8.5 Due Soon / Overdue

### Chart Type

List, not chart.

### Purpose

Due dates are more useful as a direct action list than a chart.

### Logic

Show assigned tickets where:

```text
due_date <= today + 7 days
status != Done
```

Separate into:

```text
Overdue
Due this week
```

### Empty State

```text
No upcoming deadlines in your queue.
```

---

## 8.6 My Blockers

### Chart Type

List with severity emphasis.

### Data Source

Tickets where:

```text
owner_id = currentUser.id
status = Blocked
```

Optional:

```text
blocked_reason is not null
```

### UI

Show:

```text
Ticket title
Blocked reason
Last updated
Owner / dependency if available
```

### Narrative Example

```text
You have 2 blocked tickets. One has not been updated in 5 days and may need escalation.
```

---

## 8.7 Recently Completed

### Purpose

Give users a sense of momentum.

### Data Source

Tickets assigned to current user where:

```text
status = Done
updated_at >= now() - 7 days
```

If `completed_at` exists later, use `completed_at` instead of `updated_at`.

### UI

Compact success-style list.

---

# 9. Team Dashboard Widgets

## 9.1 Team Health Strip

### Purpose

Provide a top-level snapshot of engineering health.

### Cards

- **Total Active Tickets**
- **In Progress**
- **Blocked**
- **Critical / High Priority**
- **Done This Week**

### Data Source

All tickets visible to the team.

For V1, visibility can mean all tickets in the database.

Later, filter by workspace, team, or project.

---

## 9.2 Work by Status

### Chart Type

Stacked horizontal bar or vertical bar chart.

### Recommendation

Use a **stacked horizontal bar** for a premium dashboard feel.

### Purpose

Show where work currently sits.

### Example Insight

```text
The team has more work in progress than in review or QA. This may indicate that work is being started faster than it is being finished.
```

---

## 9.3 Priority Distribution

### Chart Type

Bar chart.

### Purpose

Show whether the team is overloaded with high-priority work.

### Buckets

```text
Critical
High
Medium
Low
```

### Example Insight

```text
Critical and high-priority tickets make up 46% of active work. The queue may need triage before new work is added.
```

---

## 9.4 Owner Workload

### Chart Type

Horizontal bar chart.

### Purpose

Show who owns how much work.

### Data Source

Group active tickets by owner.

Active means:

```text
status not in ('Done')
```

### UI

Show top 8 owners.

Each bar should show:

```text
Owner name
Active ticket count
Blocked count indicator
```

### Insight Example

```text
Haris has the highest active workload, with 3 tickets in progress and 1 blocked.
```

---

## 9.5 Blocked Work Panel

### Chart Type

Table/list.

### Purpose

This should be one of the most important widgets.

### Fields

```text
Ticket
Owner
Priority
Blocked reason
Last updated
```

### Sorting

Sort by:

1. Critical priority.
2. High priority.
3. Oldest updated blocked ticket.

### Narrative Example

```text
3 tickets are blocked. The oldest blocker has not moved in 7 days and may affect delivery.
```

---

## 9.6 Initiative / Module Distribution

### Chart Type

Treemap, bar chart, or grouped pills.

### Recommendation for V1

Use a **horizontal bar chart** or **pill grid**.

Avoid treemap in V1 unless the team already has strong design and charting polish.

### Purpose

Show where engineering attention is going.

### Buckets

Examples:

```text
AI Agents
SARA UX
Frontend Revamp
BYOI
Integrations
Incident Management
Vulnerability Management
Reporting
```

### Data Source

Tickets grouped by `initiative` or `module`.

If neither exists yet, use `labels` as a temporary proxy.

---

## 9.7 Recent Movement

### Chart Type

Activity feed.

### Purpose

Show what changed recently.

### V1 Without Activity Table

If there is no `ticket_activity` table yet, use recently updated tickets:

```text
updated_at desc
```

### Future With Activity Table

Use events like:

```text
status_changed
owner_changed
priority_changed
comment_added
pr_linked
```

### UI

Example:

```text
SIRP-142 moved to QA
SIRP-146 marked Done
SIRP-144 became Blocked
```

---

## 9.8 Team Narrative Summary

### Purpose

Generate a human-readable summary of the team’s current work state.

### AI Model

Use Gemini 2.5 Flash for concise summaries.

### Input

Do not send full ticket descriptions in V1 unless needed. Send structured metrics only.

Example payload:

```json
{
  "scope": "team_dashboard",
  "total_active": 42,
  "by_status": {
    "todo": 9,
    "in_progress": 14,
    "in_review": 5,
    "qa": 4,
    "blocked": 3,
    "done": 7
  },
  "by_priority": {
    "critical": 2,
    "high": 11,
    "medium": 22,
    "low": 7
  },
  "top_blockers": [
    {
      "id": 144,
      "title": "Block invalid done action while a PR is still open",
      "owner": "Omar Shah",
      "priority": "High",
      "days_blocked": 7
    }
  ],
  "owner_workload": [
    {
      "owner": "Haris Malik",
      "active": 8,
      "blocked": 1
    }
  ]
}
```

### Output Format

Gemini should return strict JSON:

```json
{
  "headline": "Engineering is moving, but blockers need attention.",
  "summary": "The team has 42 active tickets, with most work concentrated in progress. Three tickets are blocked, including one high-priority item that has not moved in 7 days.",
  "attention_items": [
    "Review the oldest blocked high-priority ticket.",
    "Reduce in-progress work before pulling more from backlog."
  ],
  "tone": "neutral"
}
```

### UI

Render as a narrative card:

```text
Engineering is moving, but blockers need attention.

The team has 42 active tickets, with most work concentrated in progress. Three tickets are blocked, including one high-priority item that has not moved in 7 days.

Attention:
- Review the oldest blocked high-priority ticket.
- Reduce in-progress work before pulling more from backlog.
```

---

# 10. Dashboard Information Architecture

## 10.1 Dashboard Route

```text
app/dashboard/page.tsx
```

or, if the existing app uses the root as dashboard:

```text
app/page.tsx
```

Recommended route:

```text
/dashboard
```

The left sidebar dashboard icon should route to this page.

---

## 10.2 Dashboard Header

Header should include:

```text
Dashboard
A short subtitle
My Dashboard / Team Dashboard toggle
Optional date range selector
Refresh / synced timestamp
```

Example:

```text
Dashboard
Your engineering command center for focus, blockers, and delivery health.

[My Dashboard] [Team Dashboard]       Last synced now
```

---

## 10.3 Date Range Control

For V1, use simple options:

```text
This week
Last 7 days
Last 30 days
```

Default:

```text
This week
```

Use the date range for:

```text
Completed this week
Recently updated
Narrative summary
```

Do not over-apply the date filter to total active tickets unless clearly labeled.

---

# 11. Visual Design Requirements

## 11.1 Design Direction

The dashboard should feel:

```text
Premium
Dark
Calm
Analytical
Editorial
Command-center inspired
Not flashy
Not generic SaaS
```

Reference feel:

```text
Linear
Notion
Vercel dashboard
Raycast
Modern security command centers
```

## 11.2 Layout

Use a responsive card grid.

Desktop layout:

```text
12-column grid
Top metric cards across 4–5 columns
Main chart cards in 2-column layout
Lists and narrative cards below
```

Suggested layout for My Dashboard:

```text
Row 1: Hero metric cards
Row 2: AI narrative card + Today’s Focus
Row 3: My Work by Status + Priority Mix
Row 4: Due Soon + Blockers + Recently Completed
```

Suggested layout for Team Dashboard:

```text
Row 1: Team health metric cards
Row 2: AI narrative card full-width
Row 3: Work by Status + Priority Distribution
Row 4: Owner Workload + Initiative Distribution
Row 5: Blocked Work + Recent Movement
```

## 11.3 Cards

Card style:

```text
background: near-black / dark surface
border: subtle 1px low-opacity
border-radius: 16–20px
padding: 16–24px
shadow: very soft or none
```

Avoid heavy gradients.

Use gradients only as subtle ambient highlights if already used in the app design language.

## 11.4 Typography

- Page title: 22–28px, semibold.
- Section title: 14–16px, semibold.
- Metric number: 28–40px, semibold.
- Label text: 12–13px, muted.
- Narrative body: 13–14px, comfortable line height.

## 11.5 Color

Use the existing SIRP dark theme and accent color.

Suggested semantic colors:

```text
Done: green
Blocked: red
In Progress: amber/yellow
QA / Review: blue
Backlog / To-do: gray
Critical: red
High: amber
Medium: blue
Low: neutral
```

Keep colors muted and premium, not neon.

---

# 12. Recommended Libraries

## 12.1 UI Components

Use existing app UI stack if already present.

Recommended:

```text
shadcn/ui
Radix UI
Tailwind CSS
Lucide React
```

Purpose:

- `shadcn/ui`: cards, buttons, tabs, dropdowns, skeletons.
- `Radix UI`: accessible primitives under shadcn.
- `Tailwind CSS`: fast styling and design consistency.
- `Lucide React`: clean icons.

## 12.2 Charts

Recommended chart library:

```text
Recharts
```

Why:

- Good React integration.
- Works well with custom dark theme styling.
- Supports bar charts, stacked bars, line charts, and simple compositions.
- Easy enough for Codex/Cursor to implement cleanly.

Charts to use in V1:

```text
BarChart
Horizontal BarChart
Stacked BarChart
AreaChart only if trend data exists
```

Avoid in V1:

```text
Pie charts everywhere
Complex treemaps
Gauge charts
Overly animated charts
```

## 12.3 Data Fetching

If the app is using Next.js server components:

```text
Use Supabase server client for initial dashboard data.
```

If the app is mostly client-side:

```text
Use Supabase browser client with loading and error states.
```

Recommended long-term:

```text
Server-side data loading for dashboard aggregates where possible.
```

## 12.4 AI Narrative

Use:

```text
Gemini 2.5 Flash
```

Recommended architecture:

```text
Client dashboard page
  → calls internal API route
    → aggregates metrics from Supabase
    → optionally calls Gemini 2.5 Flash
    → returns metrics + narrative JSON
```

Do not call Gemini directly from the browser.

---

# 13. Data Architecture

## 13.1 Current Data Source

Primary data source:

```text
Supabase Postgres
```

Primary table:

```text
tickets
```

Potential related tables:

```text
profiles / users
labels
ticket_labels
comments
ticket_activity
```

V1 can work with only the tickets table if necessary.

---

## 13.2 Suggested Ticket Fields Needed for Dashboard V1

The dashboard can provide useful insights if the tickets table has:

```sql
id
public_id / ticket_number
title
status
priority
work_type
owner_id
owner_name or owner relation
due_date
created_at
updated_at
```

Optional but recommended:

```sql
initiative
module
blocked_reason
completed_at
reviewer_id
qa_owner_id
```

---

## 13.3 Recommended New Fields

If not already present, add these soon:

```sql
initiative text null,
module text null,
blocked_reason text null,
completed_at timestamptz null,
reviewer_id uuid null,
qa_owner_id uuid null
```

Do not block V1 on all fields. Build graceful fallbacks.

---

## 13.4 Dashboard Aggregation Strategy

Create a dashboard data service that centralizes all metrics.

Suggested file:

```text
lib/dashboard/get-dashboard-data.ts
```

Functions:

```ts
getMyDashboardData(currentUserId, dateRange)
getTeamDashboardData(dateRange)
```

Return shape:

```ts
type DashboardData = {
  scope: 'my' | 'team'
  generatedAt: string
  metrics: DashboardMetric[]
  statusDistribution: StatusCount[]
  priorityDistribution: PriorityCount[]
  ownerWorkload?: OwnerWorkload[]
  blockers: TicketSummary[]
  dueSoon?: TicketSummary[]
  recentlyCompleted: TicketSummary[]
  recentMovement: TicketSummary[]
  initiativeDistribution?: InitiativeCount[]
  narrative?: DashboardNarrative
}
```

---

# 14. API Design

## 14.1 Recommended Internal API Route

```text
app/api/dashboard/route.ts
```

Query params:

```text
scope=my | team
range=this_week | 7d | 30d
includeNarrative=true | false
```

Example:

```text
/api/dashboard?scope=my&range=this_week&includeNarrative=true
```

## 14.2 Response Shape

```json
{
  "scope": "my",
  "range": "this_week",
  "generatedAt": "2026-05-14T01:00:00.000Z",
  "metrics": [
    {
      "key": "assigned",
      "label": "Assigned to you",
      "value": 7,
      "context": "3 actively moving",
      "tone": "neutral"
    }
  ],
  "statusDistribution": [
    {
      "status": "In progress",
      "count": 3
    }
  ],
  "priorityDistribution": [
    {
      "priority": "High",
      "count": 2
    }
  ],
  "blockers": [],
  "dueSoon": [],
  "recentlyCompleted": [],
  "recentMovement": [],
  "narrative": {
    "headline": "Your queue is healthy.",
    "summary": "You have 7 assigned tickets, with 3 currently in progress and no overdue blockers.",
    "attentionItems": []
  }
}
```

---

# 15. Gemini Narrative Architecture

## 15.1 Why Use Gemini

Gemini should be used to turn dashboard metrics into a short executive-style narrative.

It should not be used as the source of truth.

The source of truth remains Supabase aggregate data.

## 15.2 When to Generate Narrative

Generate narrative when:

```text
Dashboard loads
User switches between My and Team dashboard
User changes date range
User clicks refresh
```

Optional optimization:

```text
Cache narrative for 5–15 minutes per scope/range/user
```

## 15.3 Narrative Prompt Requirements

The prompt should:

- Provide structured JSON metrics.
- Ask Gemini to return strict JSON only.
- Avoid exaggerated language.
- Avoid inventing facts.
- Mention uncertainty if data is limited.
- Keep the summary short.
- Use a calm, executive tone.

## 15.4 Narrative Prompt Template

```text
You are generating a concise engineering dashboard narrative for an internal project management tool.

Rules:
- Use only the metrics provided.
- Do not invent facts.
- Do not mention unavailable data.
- Keep the tone calm, clear, and executive.
- Focus on what needs attention.
- Return strict JSON only.

Input:
{{DASHBOARD_METRICS_JSON}}

Return this JSON shape:
{
  "headline": string,
  "summary": string,
  "attention_items": string[],
  "risk_level": "low" | "medium" | "high"
}
```

## 15.5 Fallback Narrative

If Gemini fails, the dashboard should still render.

Use deterministic fallback logic:

```text
If blocked_count > 0:
  Headline: "Some work needs attention."
If high_priority_count is high:
  Headline: "Priority load is elevated."
If no blockers and due soon is low:
  Headline: "Workload looks healthy."
```

---

# 16. Supabase Query Requirements

## 16.1 My Dashboard Queries

### Assigned Tickets

```sql
select *
from tickets
where owner_id = :current_user_id
order by updated_at desc;
```

### My Active Tickets

```sql
select *
from tickets
where owner_id = :current_user_id
and status != 'Done';
```

### My Blocked Tickets

```sql
select *
from tickets
where owner_id = :current_user_id
and status = 'Blocked'
order by updated_at asc;
```

### My Due Soon Tickets

```sql
select *
from tickets
where owner_id = :current_user_id
and status != 'Done'
and due_date <= now() + interval '7 days'
order by due_date asc;
```

### My Completed This Week

```sql
select *
from tickets
where owner_id = :current_user_id
and status = 'Done'
and updated_at >= date_trunc('week', now())
order by updated_at desc;
```

---

## 16.2 Team Dashboard Queries

### All Active Tickets

```sql
select *
from tickets
where status != 'Done'
order by updated_at desc;
```

### Status Distribution

```sql
select status, count(*)
from tickets
group by status;
```

### Priority Distribution

```sql
select priority, count(*)
from tickets
where status != 'Done'
group by priority;
```

### Owner Workload

```sql
select owner_id, count(*)
from tickets
where status != 'Done'
group by owner_id;
```

### Blocked Work

```sql
select *
from tickets
where status = 'Blocked'
order by updated_at asc;
```

### Recent Movement

```sql
select *
from tickets
order by updated_at desc
limit 10;
```

---

# 17. Component Architecture

## 17.1 Suggested Folder Structure

```text
app/dashboard/page.tsx
app/api/dashboard/route.ts
components/dashboard/dashboard-shell.tsx
components/dashboard/dashboard-header.tsx
components/dashboard/scope-toggle.tsx
components/dashboard/date-range-toggle.tsx
components/dashboard/metric-card.tsx
components/dashboard/narrative-card.tsx
components/dashboard/status-distribution-chart.tsx
components/dashboard/priority-distribution-chart.tsx
components/dashboard/owner-workload-chart.tsx
components/dashboard/ticket-list-card.tsx
components/dashboard/recent-movement-card.tsx
lib/dashboard/get-dashboard-data.ts
lib/dashboard/dashboard-types.ts
lib/dashboard/generate-dashboard-narrative.ts
lib/supabase/client.ts
lib/supabase/server.ts
```

## 17.2 Component Responsibilities

### `DashboardShell`

Owns layout and scope switching.

### `DashboardHeader`

Displays title, subtitle, scope toggle, date range, and refresh state.

### `MetricCard`

Reusable metric display card.

### `NarrativeCard`

Displays Gemini or fallback narrative.

### `StatusDistributionChart`

Displays status distribution.

### `PriorityDistributionChart`

Displays priority distribution.

### `OwnerWorkloadChart`

Team dashboard only.

### `TicketListCard`

Reusable list for blockers, due soon, completed, focus items.

---

# 18. Loading, Empty, and Error States

## 18.1 Loading State

Use skeleton cards.

Do not show a blank dashboard.

Skeletons should match the final layout.

## 18.2 Empty State

If there are no tickets:

```text
No dashboard data yet.
Create your first ticket to start seeing workload, blockers, and progress insights.
```

CTA:

```text
New ticket
```

## 18.3 Narrative Loading

Narrative can load separately from metrics.

If metrics load first, show:

```text
Generating summary…
```

If Gemini fails:

```text
Summary unavailable. Metrics are still up to date.
```

---

# 19. Permissions and Auth

## 19.1 Current State

`currentUser` is still a placeholder from mock data.

For V1, My Dashboard can use this placeholder.

## 19.2 Future State

When Supabase Auth is wired:

```text
Supabase Auth session → user.id → profiles table → dashboard filters
```

My Dashboard should use:

```text
session.user.id
```

Team Dashboard should show team-wide data according to user permissions.

For now, since the team operates openly, team dashboard can show all tickets.

---

# 20. AI Privacy and Safety

Do not send unnecessary sensitive ticket content to Gemini.

For V1, send only:

```text
Counts
Statuses
Priorities
Owner names or anonymized owner IDs
Ticket titles for top blockers only if needed
Due/blocked age
```

Avoid sending:

```text
Long descriptions
Comments
Internal secrets
Credentials
Customer-sensitive details
```

Gemini output must be treated as presentation only, not source of truth.

---

# 21. Acceptance Criteria

## 21.1 Core Dashboard

- `/dashboard` route exists.
- Dashboard defaults to **My Dashboard**.
- User can switch between **My Dashboard** and **Team Dashboard**.
- Dashboard uses Supabase ticket data.
- Dashboard does not rely on mock ticket data.
- `currentUser` placeholder may remain until Supabase Auth is implemented.
- Dashboard has loading, empty, and error states.

## 21.2 My Dashboard

- Shows assigned ticket count.
- Shows in-progress count.
- Shows blocked count.
- Shows due soon count.
- Shows completed-this-week count.
- Shows Today’s Focus list.
- Shows My Work by Status visualization.
- Shows Priority Mix.
- Shows Due Soon list.
- Shows My Blockers list.
- Shows Recently Completed list.

## 21.3 Team Dashboard

- Shows total active tickets.
- Shows in-progress count.
- Shows blocked count.
- Shows high/critical priority count.
- Shows done-this-week count.
- Shows Work by Status chart.
- Shows Priority Distribution chart.
- Shows Owner Workload chart.
- Shows Blocked Work panel.
- Shows Initiative/Module distribution if data exists.
- Shows Recent Movement list.

## 21.4 Narrative

- Dashboard can request AI narrative from internal API route.
- Gemini 2.5 Flash is called server-side only.
- Narrative is generated from structured metrics, not raw full ticket content.
- Narrative returns strict JSON.
- Dashboard gracefully falls back if AI generation fails.

## 21.5 Design

- Dashboard matches the dark premium internal engineering tool aesthetic.
- Cards, charts, lists, and narrative sections are visually consistent.
- The layout is responsive.
- The design feels polished, not like default chart-library output.

---

# 22. Suggested V1 Build Order

## Phase 1: Static UI With Supabase Data

- Build `/dashboard` route.
- Add dashboard shell, header, scope toggle.
- Fetch tickets from Supabase.
- Compute metrics in TypeScript.
- Render My Dashboard.
- Render Team Dashboard.

## Phase 2: Charts and Lists

- Add Recharts.
- Add status distribution chart.
- Add priority distribution chart.
- Add owner workload chart.
- Add blockers, due soon, recently completed, and recent movement cards.

## Phase 3: Narrative Layer

- Add `/api/dashboard` route.
- Add structured dashboard response.
- Add Gemini server-side call.
- Add fallback narrative.
- Add narrative card.

## Phase 4: Polish

- Add skeleton loading states.
- Add empty states.
- Add responsive layout.
- Add subtle chart animations if tasteful.
- Refine spacing, typography, and card hierarchy.

---

# 23. Codex Implementation Prompt

```text
Build the dashboard module for our internal engineering project management tool.

Context:
- This is a Next.js app.
- app/tickets/page.tsx and app/t/[id]/page.tsx already fetch tickets from Supabase.
- currentUser is still a placeholder from mock-data and will later be replaced by Supabase Auth.
- The dashboard module is currently empty.
- The app uses a dark theme and should feel premium, modern, and calm.
- The dashboard should feel like a beautiful internal engineering command center, closer to Linear/Notion/Vercel than Jira.

Goal:
Create an outstanding dashboard experience with two modes:
1. My Dashboard — default view.
2. Team Dashboard — selectable from a toggle in the dashboard header.

Data:
- Use Supabase as the source of truth.
- Use the existing tickets table and whatever ticket fields are already available.
- Do not use mock ticket data.
- currentUser can remain from mock-data only for filtering My Dashboard until Supabase Auth is wired.
- Gracefully handle missing optional fields like initiative, module, completed_at, blocked_reason, reviewer_id, and qa_owner_id.

Libraries:
- Use Tailwind for styling.
- Use existing UI components if available.
- Use shadcn/ui-style components if already present.
- Use lucide-react for icons if available.
- Add Recharts for charts if not already installed.
- Do not add heavy or unnecessary libraries.

Routes/files to create:
- app/dashboard/page.tsx
- components/dashboard/dashboard-shell.tsx
- components/dashboard/dashboard-header.tsx
- components/dashboard/scope-toggle.tsx
- components/dashboard/date-range-toggle.tsx
- components/dashboard/metric-card.tsx
- components/dashboard/narrative-card.tsx
- components/dashboard/status-distribution-chart.tsx
- components/dashboard/priority-distribution-chart.tsx
- components/dashboard/owner-workload-chart.tsx
- components/dashboard/ticket-list-card.tsx
- components/dashboard/recent-movement-card.tsx
- lib/dashboard/get-dashboard-data.ts
- lib/dashboard/dashboard-types.ts
- Optional: app/api/dashboard/route.ts if needed for narrative generation.

My Dashboard requirements:
- Default dashboard mode.
- Show metric cards:
  - Assigned to me
  - In progress
  - Blocked
  - Due soon
  - Completed this week
- Show Today’s Focus list:
  - assigned tickets sorted by blocked, critical/high priority, due soon, recently updated.
- Show My Work by Status chart.
- Show Priority Mix.
- Show Due Soon list.
- Show My Blockers list.
- Show Recently Completed list.
- Show a narrative card.

Team Dashboard requirements:
- User can switch to Team Dashboard from the header.
- Show metric cards:
  - Total active tickets
  - In progress
  - Blocked
  - Critical/high priority
  - Done this week
- Show Work by Status chart.
- Show Priority Distribution chart.
- Show Owner Workload chart.
- Show Blocked Work panel.
- Show Initiative/Module distribution if data exists, otherwise hide gracefully.
- Show Recent Movement list.
- Show a narrative card.

Narrative:
- Add a narrative card that summarizes the current dashboard state.
- For now, implement deterministic fallback narrative in TypeScript.
- Structure the code so Gemini 2.5 Flash can later be plugged in server-side.
- Do not call any AI model from the browser.
- Narrative should be concise and insight-led, not generic.

Design:
- Dark premium dashboard.
- Use a 12-column responsive grid.
- Cards should have subtle borders, rounded corners, and calm spacing.
- Avoid loud gradients and default chart colors.
- Charts must be styled for dark mode.
- Use muted semantic colors:
  - Done green
  - Blocked red
  - In progress amber
  - QA/review blue
  - Backlog/to-do gray
  - Critical red
  - High amber
  - Medium blue
  - Low neutral
- The dashboard should not look like default Recharts output.
- Make the narrative card feel editorial and premium.

States:
- Add skeleton loading states.
- Add empty state when no ticket data exists.
- Add error state if Supabase fetch fails.
- Dashboard should never appear blank.

Implementation rules:
- Preserve existing app structure and styling patterns.
- Do not break app/tickets/page.tsx or app/t/[id]/page.tsx.
- Do not change Supabase schema unless absolutely necessary.
- If fields are missing, use safe fallbacks.
- Keep components reusable and clean.
- Make the code production-grade and readable.
```

---

# 24. Future Enhancements

After V1, add:

- GitHub PR and branch integration.
- Sprint burndown.
- Release readiness view.
- QA queue analytics.
- Ticket aging analysis.
- Stale ticket detection.
- Workload balance suggestions.
- AI-generated standup summary.
- AI-generated weekly engineering report.
- Saved dashboard views.
- Dashboard export to PDF or Markdown.

---

# 25. Final Product Direction

The dashboard should become the daily command center for engineering.

It should not just answer:

```text
How many tickets do we have?
```

It should answer:

```text
What deserves attention right now?
```

That is the difference between a dashboard that displays data and a dashboard that helps the team operate better.

