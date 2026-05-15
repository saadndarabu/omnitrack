-- ============================================================
-- SECC — User profile extensions + GitHub connector
-- ============================================================

-- ── Areas of responsibility ───────────────────────────────────

create type user_area as enum (
  'frontend',
  'backend',
  'automation',
  'agents',
  'sara',
  'omnimap',
  'llm',
  'devops',
  'rag'
);

alter table users
  add column if not exists areas        user_area[]  not null default '{}',
  add column if not exists avatar_url   text,
  add column if not exists github_username     text,
  add column if not exists github_email        text,
  add column if not exists github_connected_at timestamptz;

-- ── Avatars storage bucket ────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152,  -- 2 MB after compression
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- Users can only upload/replace/delete their own avatar.
-- Path must be: avatars/{user_id}/{filename}

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Authenticated users can read avatars"
  on storage.objects for select
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );

-- ── RLS for profile self-update ───────────────────────────────
-- Users can update their own name, areas, avatar_url.
-- github_* columns are written server-side only (service role).

create policy "Users can update own profile"
  on users for update
  using (auth.uid()::text = id)
  with check (auth.uid()::text = id);
