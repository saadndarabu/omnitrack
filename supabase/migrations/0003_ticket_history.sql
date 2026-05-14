-- ============================================================
-- SECC — Ticket edit history
-- ============================================================

create table ticket_history (
  id          text        primary key default gen_random_uuid()::text,
  ticket_id   text        not null references tickets(id) on delete cascade,
  actor_id    text        not null references users(id) on delete cascade,
  field       text        not null,   -- e.g. "status", "title", "priority"
  old_value   text,                   -- previous value serialised as text
  new_value   text,                   -- new value serialised as text
  created_at  timestamptz not null default now()
);

create index ticket_history_ticket_idx on ticket_history(ticket_id, created_at desc);

alter table ticket_history enable row level security;

create policy "Allow all read history"   on ticket_history for select using (true);
create policy "Allow all insert history" on ticket_history for insert with check (true);
