-- ============================================================
-- SECC — GitHub App integration
-- Tables: github_installations, github_repositories,
--         github_pull_requests, github_webhook_events
--
-- Notes on adaptation from the original spec:
--   • users.id is `text` in this project (not uuid), so
--     installed_by_user_id and created_by_user_id are text and
--     reference public.users(id) rather than auth.users(id).
--   • tickets.id is `text` (SIRP-{n}), so ticket_id is text.
--   • All write paths go through the server (service role or
--     authenticated server routes). RLS denies anon access.
-- ============================================================

-- ── github_installations ──────────────────────────────────────

create table if not exists github_installations (
  id                    uuid          primary key default gen_random_uuid(),
  installation_id       bigint        unique not null,
  account_login         text,
  account_id            bigint,
  account_type          text,
  repository_selection  text,
  app_slug              text,
  installed_by_user_id  text          references users(id) on delete set null,
  suspended_at          timestamptz,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now()
);

create index if not exists github_installations_account_login_idx
  on github_installations(account_login);

drop trigger if exists trg_github_installations_updated_at on github_installations;
create trigger trg_github_installations_updated_at
  before update on github_installations
  for each row execute procedure set_updated_at();

-- ── github_repositories ───────────────────────────────────────

create table if not exists github_repositories (
  id                uuid          primary key default gen_random_uuid(),
  installation_id   bigint        not null references github_installations(installation_id) on delete cascade,
  github_repo_id    bigint        unique not null,
  owner             text          not null,
  name              text          not null,
  full_name         text          not null,
  private           boolean       not null default true,
  default_branch    text,
  html_url          text,
  enabled           boolean       not null default true,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

create index if not exists github_repositories_installation_idx
  on github_repositories(installation_id);
create index if not exists github_repositories_full_name_idx
  on github_repositories(full_name);

drop trigger if exists trg_github_repositories_updated_at on github_repositories;
create trigger trg_github_repositories_updated_at
  before update on github_repositories
  for each row execute procedure set_updated_at();

-- ── github_pull_requests ──────────────────────────────────────

create table if not exists github_pull_requests (
  id                    uuid          primary key default gen_random_uuid(),
  ticket_id             text          references tickets(id) on delete set null,
  installation_id       bigint        not null,
  github_repo_id        bigint        not null,
  repo_full_name        text          not null,
  pr_number             integer       not null,
  pr_title              text,
  pr_url                text,
  branch_name           text,
  base_branch           text,
  state                 text,
  merged                boolean       not null default false,
  github_created_at     timestamptz,
  github_updated_at     timestamptz,
  created_by_user_id    text          references users(id) on delete set null,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now(),
  unique(github_repo_id, pr_number)
);

create index if not exists github_pull_requests_ticket_idx
  on github_pull_requests(ticket_id);
create index if not exists github_pull_requests_repo_idx
  on github_pull_requests(github_repo_id);

drop trigger if exists trg_github_pull_requests_updated_at on github_pull_requests;
create trigger trg_github_pull_requests_updated_at
  before update on github_pull_requests
  for each row execute procedure set_updated_at();

-- ── github_webhook_events ─────────────────────────────────────

create table if not exists github_webhook_events (
  id                uuid          primary key default gen_random_uuid(),
  delivery_id       text          unique not null,
  event_type        text          not null,
  action            text,
  installation_id   bigint,
  github_repo_id    bigint,
  repo_full_name    text,
  payload           jsonb         not null,
  processed         boolean       not null default false,
  error             text,
  created_at        timestamptz   not null default now()
);

create index if not exists github_webhook_events_event_idx
  on github_webhook_events(event_type, action);
create index if not exists github_webhook_events_installation_idx
  on github_webhook_events(installation_id);

-- ── Row Level Security ────────────────────────────────────────
-- These tables hold integration metadata. They are read/written
-- server-side only (service role bypasses RLS). We deny direct
-- anon/authenticated access by default; enable narrow reads for
-- authenticated users on non-sensitive views below.

alter table github_installations    enable row level security;
alter table github_repositories     enable row level security;
alter table github_pull_requests    enable row level security;
alter table github_webhook_events   enable row level security;

-- Authenticated users may read installations and synced repos
-- so the integration page can render the connection status.
-- No write policies — server routes use the service role.

drop policy if exists "Auth can read installations" on github_installations;
create policy "Auth can read installations"
  on github_installations for select
  using (auth.role() = 'authenticated');

drop policy if exists "Auth can read repositories" on github_repositories;
create policy "Auth can read repositories"
  on github_repositories for select
  using (auth.role() = 'authenticated');

drop policy if exists "Auth can read pull requests" on github_pull_requests;
create policy "Auth can read pull requests"
  on github_pull_requests for select
  using (auth.role() = 'authenticated');

-- github_webhook_events stays server-only (no select policy).
