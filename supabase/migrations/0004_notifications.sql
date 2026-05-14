-- ============================================================
-- SECC — In-app notifications
-- ============================================================

create type notification_type as enum (
  'assigned',
  'mentioned',
  'due_soon',
  'comment_added'
);

create table notifications (
  id          text              primary key default gen_random_uuid()::text,
  user_id     text              not null references users(id) on delete cascade,
  type        notification_type not null,
  ticket_id   text              not null references tickets(id) on delete cascade,
  actor_id    text              references users(id) on delete set null,
  message     text              not null,
  read        boolean           not null default false,
  created_at  timestamptz       not null default now()
);

create index notifications_user_idx    on notifications(user_id, created_at desc);
create index notifications_unread_idx  on notifications(user_id, read) where read = false;

alter table notifications enable row level security;

create policy "Allow all read notifications"   on notifications for select using (true);
create policy "Allow all insert notifications" on notifications for insert with check (true);
create policy "Allow all update notifications" on notifications for update using (true) with check (true);
create policy "Allow all delete notifications" on notifications for delete using (true);
