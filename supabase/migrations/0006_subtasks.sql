-- ============================================================
-- SECC — Subtasks
-- Tickets can reference another ticket as their parent.
-- A subtask's due_date may not exceed its parent's due_date
-- (enforced in the application layer; DB stores the FK only).
-- Only one level of nesting is supported: subtasks cannot have
-- children of their own (enforced by CHECK constraint).
-- ============================================================

alter table tickets
  add column parent_id text references tickets(id) on delete cascade;

-- A ticket cannot be its own parent
alter table tickets
  add constraint tickets_no_self_parent check (parent_id <> id);

-- Subtasks must not themselves have children (one level only).
-- This is enforced at the application layer (see API route), not
-- here, because PostgreSQL CHECK constraints cannot query other rows.

create index tickets_parent_id_idx on tickets(parent_id)
  where parent_id is not null;
