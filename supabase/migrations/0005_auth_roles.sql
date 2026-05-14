-- ============================================================
-- SECC — Auth roles, domain enforcement, profile auto-creation
-- ============================================================

-- ── Role type & column ───────────────────────────────────────

create type user_role as enum ('admin', 'member', 'viewer');

alter table users
  add column role user_role not null default 'viewer',
  add constraint users_email_domain
    check (email like '%@sirp.io');

-- ── Auto-create profile on first sign-in ─────────────────────
-- Fires after Supabase inserts a row into auth.users.
-- Rejects non-sirp.io emails before the row lands in public.users.

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _email text;
  _name  text;
  _initials text;
begin
  _email := new.email;

  -- Hard domain gate at the DB level
  if _email not like '%@sirp.io' then
    raise exception 'Only @sirp.io accounts may sign in';
  end if;

  _name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(_email, '@', 1)
  );

  -- Build initials: up to two capital letters from name parts
  select string_agg(upper(left(word, 1)), '')
  into   _initials
  from   unnest(string_to_array(trim(_name), ' ')) as word
  where  word <> ''
  limit  2;

  _initials := coalesce(nullif(_initials, ''), upper(left(_name, 1)));

  insert into public.users (id, name, email, initials, role)
  values (new.id::text, _name, _email, _initials, 'viewer')
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ── Tighten RLS now that auth is wired ───────────────────────

-- users: authenticated reads only; no direct client writes
-- (profile creation goes through the trigger above)
drop policy if exists "Allow all read users" on users;

create policy "Authenticated users can read profiles"
  on users for select
  using (auth.role() = 'authenticated');

-- tickets: authenticated only
drop policy if exists "Allow all read tickets"   on tickets;
drop policy if exists "Allow all insert tickets" on tickets;
drop policy if exists "Allow all update tickets" on tickets;
drop policy if exists "Allow all delete tickets" on tickets;

create policy "Authenticated read tickets"   on tickets for select using (auth.role() = 'authenticated');
create policy "Authenticated insert tickets" on tickets for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update tickets" on tickets for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated delete tickets" on tickets for delete using (auth.role() = 'authenticated');

-- comments: authenticated only
drop policy if exists "Allow all read comments"   on ticket_comments;
drop policy if exists "Allow all insert comments" on ticket_comments;
drop policy if exists "Allow all delete comments" on ticket_comments;

create policy "Authenticated read comments"   on ticket_comments for select using (auth.role() = 'authenticated');
create policy "Authenticated insert comments" on ticket_comments for insert with check (auth.role() = 'authenticated');
create policy "Authenticated delete comments" on ticket_comments for delete using (auth.role() = 'authenticated');
