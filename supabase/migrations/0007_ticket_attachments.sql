-- ── ticket_attachments ────────────────────────────────────────────────────────
-- Private bucket must be created in Supabase dashboard or via CLI:
--   supabase storage create ticket-attachments --public=false
-- This migration creates the metadata table and RLS policies only.

create table if not exists public.ticket_attachments (
  id                  uuid        primary key default gen_random_uuid(),
  ticket_id           text        not null references public.tickets(id) on delete cascade,
  uploaded_by         text        not null references public.users(id) on delete cascade,
  file_name           text        not null,
  file_type           text        not null,
  file_size           bigint      not null,  -- compressed size in bytes (what we actually store)
  original_file_size  bigint      not null,  -- size before compression
  compressed_file_size bigint     not null,  -- same as file_size, kept explicit for audit
  compression_ratio   numeric(5,4) not null, -- compressed / original (0–1)
  storage_bucket      text        not null default 'ticket-attachments',
  storage_path        text        not null,  -- tickets/{ticket_id}/{id}-{safe_filename}
  width               integer,
  height              integer,
  deleted_at          timestamptz,           -- soft delete; null = active
  created_at          timestamptz not null default now()
);

create index if not exists ticket_attachments_ticket_id_idx
  on public.ticket_attachments(ticket_id)
  where deleted_at is null;

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.ticket_attachments enable row level security;

-- Authenticated users can read active attachments for any ticket they can see.
-- (Ticket table itself is restricted to authenticated users, so this is safe.)
create policy "authenticated users can read active attachments"
  on public.ticket_attachments
  for select
  to authenticated
  using (deleted_at is null);

-- engineer, lead, admin (member role) and admin can upload.
-- The app maps "engineer/lead/admin" → role IN ('member','admin').
create policy "members and admins can upload attachments"
  on public.ticket_attachments
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()::text
        and role in ('member', 'admin')
    )
  );

-- Uploader can soft-delete their own attachment.
create policy "uploader can delete own attachment"
  on public.ticket_attachments
  for update
  to authenticated
  using (uploaded_by = auth.uid()::text)
  with check (uploaded_by = auth.uid()::text);

-- Admin can soft-delete any attachment.
create policy "admin can delete any attachment"
  on public.ticket_attachments
  for update
  to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()::text
        and role = 'admin'
    )
  );

-- ── Storage RLS (apply in Supabase dashboard or via SQL editor) ───────────────
-- The bucket "ticket-attachments" must be created as private (not public).
-- Below policies assume the bucket exists. Run these in the SQL editor if the
-- storage schema is available, otherwise configure via Supabase Storage UI.

-- Allow authenticated users to read objects in the bucket.
-- insert into storage.policies (name, bucket_id, operation, definition)
-- values (
--   'auth read ticket-attachments',
--   'ticket-attachments',
--   'SELECT',
--   'auth.role() = ''authenticated'''
-- );
