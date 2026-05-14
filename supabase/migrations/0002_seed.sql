-- ============================================================
-- SECC — Seed data (mirrors lib/mock-data.ts)
-- ============================================================

insert into users (id, name, email, initials) values
  ('user_saadia', 'Saadia Noor',  'saadia@sirp.io', 'SN'),
  ('user_haris',  'Haris Malik',  'haris@sirp.io',  'HM'),
  ('user_mina',   'Mina Qureshi', 'mina@sirp.io',   'MQ'),
  ('user_omar',   'Omar Shah',    'omar@sirp.io',   'OS')
on conflict (id) do nothing;

insert into tickets (
  id, title, description, work_type, status, priority, project, area, component,
  estimate, due_date, acceptance_criteria, blocker_reason, labels,
  branch, pr_number, assignee_id, created_at, updated_at
) values
(
  'SIRP-141',
  'Persist branch creation state after status change',
  'When a ticket moves into progress, the branch pill should appear as soon as the GitHub App confirms creation.',
  'enhancement', 'in_progress', 'high', 'platform', 'integrations', 'state',
  '3 pts', '2026-05-10',
  array['Branch state appears immediately after moving to in progress', 'Webhook confirmation keeps the branch reference in sync'],
  null,
  array['github', 'state'],
  'task/SIRP-141-branch-state', null, 'user_haris',
  '2026-05-06T08:35:00Z', '2026-05-07T07:45:00Z'
),
(
  'SIRP-142',
  'Reconcile PR webhook references across title and branch',
  'PR opened events should find the ticket ID in the branch name first, then title, then body.',
  'bug', 'in_review', 'critical', 'platform', 'integrations', 'github',
  '2 pts', '2026-05-09',
  array['Branch name is checked before title and body', 'PR number is attached to the referenced ticket'],
  null,
  array['webhook'],
  'task/SIRP-142-webhook-refs', 284, 'user_mina',
  '2026-05-05T11:05:00Z', '2026-05-07T06:18:00Z'
),
(
  'SIRP-143',
  'Add static empty state for active filters',
  'Filtered views should render a quiet static message when there are no matching rows.',
  'feature', 'todo', 'medium', 'sara', 'product', 'filters',
  '1 pt', '2026-05-13',
  array['Empty filtered views render without layout shift', 'Message copy matches the current workspace tone'],
  null,
  array['filters'],
  null, null, 'user_saadia',
  '2026-05-06T13:22:00Z', '2026-05-06T17:10:00Z'
),
(
  'SIRP-144',
  'Block invalid done action while a PR is still open',
  'The done transition from review is webhook-owned and should not appear as a manual control.',
  'bug', 'blocked', 'high', 'platform', 'platform', 'tickets',
  '2 pts', '2026-05-08',
  array['Manual done action is hidden while review is webhook-owned', 'Blocked tickets retain the latest blocker reason'],
  'Waiting on the webhook fixture from the merged PR case.',
  array['status'],
  'task/SIRP-144-done-action', 281, 'user_omar',
  '2026-05-04T09:44:00Z', '2026-05-06T14:32:00Z'
),
(
  'SIRP-145',
  'Normalize ticket ID parsing before branch generation',
  'Ticket IDs pasted in lowercase should normalize before branch names are generated.',
  'task', 'backlog', 'low', 'omniscan', 'platform', 'tickets',
  null, null,
  array['Lowercase IDs normalize before branch generation', 'Generated branch names keep the canonical ticket ID'],
  null,
  array['ids'],
  null, null, null,
  '2026-05-03T07:50:00Z', '2026-05-05T12:15:00Z'
),
(
  'SIRP-146',
  'Tighten modal escape behavior from pasted links',
  'Esc should always return to the ticket list, including when the detail URL was opened directly.',
  'enhancement', 'done', 'medium', 'sara', 'product', 'routing',
  '1 pt', '2026-05-06',
  array['Escape returns direct ticket URLs to the ticket list', 'Local modal state is cleared on close'],
  null,
  array['routing'],
  'task/SIRP-146-modal-escape', 279, 'user_saadia',
  '2026-05-01T16:10:00Z', '2026-05-05T09:20:00Z'
)
on conflict (id) do nothing;

insert into ticket_comments (id, ticket_id, author_id, body, created_at) values
  ('comment_141_1', 'SIRP-141', 'user_saadia', 'Webhook latency is fine; the missing state is local UI feedback.', '2026-05-06T10:20:00Z'),
  ('comment_144_1', 'SIRP-144', 'user_omar',   'Waiting on the webhook fixture from the merged PR case.',           '2026-05-06T14:32:00Z')
on conflict (id) do nothing;
