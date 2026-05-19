-- ============================================================
-- SECC — Slack workspace-level integration
--
-- Design notes:
--   • workspace_id is a fixed constant UUID for this single-tenant
--     SIRP deployment. A future multi-tenant migration would add a
--     workspaces table and replace the constant.
--   • users.id is text in this project, so connected_by is text
--     referencing public.users(id).
--   • bot_access_token is stored server-side only. RLS denies all
--     direct client reads. Slack API calls go through server routes.
--   • Upsert key is (workspace_id, slack_team_id) so one workspace
--     can only hold one connection to a given Slack team.
-- ============================================================

-- ── slack_connections ─────────────────────────────────────────

create table if not exists slack_connections (
  id                    uuid        primary key default gen_random_uuid(),
  workspace_id          uuid        not null,
  slack_team_id         text        not null,
  slack_team_name       text,
  bot_user_id           text,
  bot_access_token      text        not null,
  default_channel_id    text,
  default_channel_name  text,
  approval_channel_id   text,
  approval_channel_name text,
  connected_by          text        references public.users(id) on delete set null,
  connected_at          timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique(workspace_id, slack_team_id)
);

create index if not exists slack_connections_workspace_idx
  on slack_connections(workspace_id);

drop trigger if exists trg_slack_connections_updated_at on slack_connections;
create trigger trg_slack_connections_updated_at
  before update on slack_connections
  for each row execute procedure set_updated_at();

-- ── slack_notification_settings ───────────────────────────────

create table if not exists slack_notification_settings (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null,
  event_type    text        not null,
  channel_id    text        not null,
  channel_name  text,
  enabled       boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(workspace_id, event_type)
);

create index if not exists slack_notification_settings_workspace_idx
  on slack_notification_settings(workspace_id);

drop trigger if exists trg_slack_notification_settings_updated_at on slack_notification_settings;
create trigger trg_slack_notification_settings_updated_at
  before update on slack_notification_settings
  for each row execute procedure set_updated_at();

-- ── Row Level Security ────────────────────────────────────────
-- All Slack writes go through server routes using the service role.
-- The anon key client (used by the frontend) must never read
-- bot_access_token. We enable RLS with no permissive policies so
-- every direct-client read is denied. Server routes use the service
-- role which bypasses RLS.

alter table slack_connections          enable row level security;
alter table slack_notification_settings enable row level security;

-- No policies intentionally — server-side service role handles all
-- reads and writes. Frontend receives shaped data from API routes
-- that never include bot_access_token.
