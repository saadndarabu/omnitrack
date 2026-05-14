-- ============================================================
-- SECC — Initial schema
-- ============================================================

-- ── Custom types ────────────────────────────────────────────

create type work_type as enum ('feature', 'enhancement', 'bug', 'task');
create type ticket_status as enum ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'blocked');
create type priority as enum ('critical', 'high', 'medium', 'low');
create type project as enum ('sara', 'omniscan', 'platform');
create type area as enum ('platform', 'product', 'integrations');
create type component as enum ('tickets', 'github', 'routing', 'filters', 'state');

-- ── users ────────────────────────────────────────────────────
-- Mirrors auth.users; one row per team member.

create table users (
  id        text primary key,                 -- matches auth.users.id for members, or custom id for seed data
  name      text        not null,
  email     text        not null unique,
  initials  text        not null check (char_length(initials) between 1 and 4),
  created_at timestamptz not null default now()
);

-- ── tickets ──────────────────────────────────────────────────

create table tickets (
  id                  text        primary key,          -- SIRP-{n}
  title               text        not null,
  description         text        not null default '',
  work_type           work_type   not null,
  status              ticket_status not null default 'backlog',
  priority            priority    not null default 'medium',
  project             project     not null,
  area                area        not null,
  component           component   not null,
  estimate            text,
  due_date            date,
  acceptance_criteria text[]      not null default '{}',
  blocker_reason      text,
  labels              text[]      not null default '{}',
  branch              text,
  pr_number           integer,
  assignee_id         text        references users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Keep updated_at current automatically
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tickets_updated_at
  before update on tickets
  for each row execute function set_updated_at();

-- ── ticket_comments ──────────────────────────────────────────

create table ticket_comments (
  id         text        primary key default gen_random_uuid()::text,
  ticket_id  text        not null references tickets(id) on delete cascade,
  author_id  text        not null references users(id) on delete cascade,
  body       text        not null,
  created_at timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────

create index tickets_status_idx      on tickets(status);
create index tickets_priority_idx    on tickets(priority);
create index tickets_assignee_idx    on tickets(assignee_id);
create index tickets_project_idx     on tickets(project);
create index tickets_updated_at_idx  on tickets(updated_at desc);
create index ticket_comments_ticket_idx on ticket_comments(ticket_id);

-- ── Row-level security ───────────────────────────────────────
-- Open to anon + authenticated until Supabase Auth is wired up.
-- Tighten to authenticated-only once login is in place.

alter table users           enable row level security;
alter table tickets         enable row level security;
alter table ticket_comments enable row level security;

create policy "Allow all read users"    on users for select using (true);

create policy "Allow all read tickets"   on tickets for select using (true);
create policy "Allow all insert tickets" on tickets for insert with check (true);
create policy "Allow all update tickets" on tickets for update using (true) with check (true);
create policy "Allow all delete tickets" on tickets for delete using (true);

create policy "Allow all read comments"   on ticket_comments for select using (true);
create policy "Allow all insert comments" on ticket_comments for insert with check (true);
create policy "Allow all delete comments" on ticket_comments for delete using (true);
