-- ============================================================
-- SECC — Add 'epic' to work_type enum
-- Tickets automatically become epics when they have children.
-- Epics cannot themselves be children of another ticket.
-- ============================================================

alter type work_type add value if not exists 'epic';
