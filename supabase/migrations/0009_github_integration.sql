-- ============================================================
-- SECC — GitHub integration: user connections + repo allowlist
-- ============================================================

-- ── Per-user GitHub OAuth connections ────────────────────────

CREATE TABLE github_user_connections (
  user_id        text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  github_login   text NOT NULL,
  github_user_id bigint NOT NULL UNIQUE,
  access_token   text NOT NULL,
  token_scopes   text[],
  connected_at   timestamptz DEFAULT now()
);

ALTER TABLE github_user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own github connection"
  ON github_user_connections
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- ── Admin-managed repo allowlist ─────────────────────────────

CREATE TABLE github_repos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL UNIQUE,
  label     text,
  added_by  text REFERENCES users(id),
  added_at  timestamptz DEFAULT now()
);

ALTER TABLE github_repos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read repos"
  ON github_repos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins insert repos"
  ON github_repos FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "Admins delete repos"
  ON github_repos FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
  );

-- ── Target repo on tickets ────────────────────────────────────

ALTER TABLE tickets ADD COLUMN target_repo text;
