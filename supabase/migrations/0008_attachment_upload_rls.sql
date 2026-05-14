-- ============================================================
-- Ticket attachment upload RLS hardening/fix
-- ============================================================
-- Screenshot upload has two writes:
-- 1. Supabase Storage object insert into storage.objects
-- 2. Metadata insert into public.ticket_attachments
--
-- Both need policies. The metadata insert must also be tied to the
-- authenticated user instead of trusting a client-provided uploaded_by.

-- Ensure the private bucket exists. Safe to run repeatedly.
insert into storage.buckets (id, name, public)
values ('ticket-attachments', 'ticket-attachments', false)
on conflict (id) do update set public = false;

-- ── Metadata table policies ─────────────────────────────────────────────────

drop policy if exists "members and admins can upload attachments"
  on public.ticket_attachments;

create policy "members and admins can upload own attachments"
  on public.ticket_attachments
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()::text
    and storage_bucket = 'ticket-attachments'
    and storage_path like ('tickets/' || ticket_id || '/%')
    and exists (
      select 1
      from public.users
      where id = auth.uid()::text
        and role in ('member', 'admin')
    )
    and exists (
      select 1
      from public.tickets
      where id = ticket_id
    )
  );

-- ── Storage object policies ─────────────────────────────────────────────────

drop policy if exists "authenticated users can read ticket attachment objects"
  on storage.objects;
drop policy if exists "members and admins can upload ticket attachment objects"
  on storage.objects;
drop policy if exists "uploaders can delete own ticket attachment objects"
  on storage.objects;

create policy "authenticated users can read ticket attachment objects"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'ticket-attachments');

create policy "members and admins can upload ticket attachment objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'ticket-attachments'
    and (storage.foldername(name))[1] = 'tickets'
    and exists (
      select 1
      from public.users
      where id = auth.uid()::text
        and role in ('member', 'admin')
    )
  );

create policy "uploaders can delete own ticket attachment objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and owner = auth.uid()
  );
