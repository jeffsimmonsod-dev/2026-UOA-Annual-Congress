-- Existing records have no attributable operator; retain their shared-PIN label.
ALTER TABLE community_admin_actions
  ADD COLUMN IF NOT EXISTS actor_session_id TEXT;