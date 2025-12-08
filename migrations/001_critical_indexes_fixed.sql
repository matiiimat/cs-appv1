-- Migration 001: Critical Performance Indexes (Fixed)
-- Safe to run - these only add indexes and won't break existing functionality

BEGIN;

-- Enable CITEXT extension for case-insensitive emails
CREATE EXTENSION IF NOT EXISTS citext;

-- Speed up user lookups by organization
CREATE INDEX IF NOT EXISTS idx_users_org ON users (organization_id);

-- Speed up message queries (most common filters)
CREATE INDEX IF NOT EXISTS messages_org_created_at
  ON messages (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_org_status_created_at
  ON messages (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_agent_id
  ON messages (agent_id);

-- Speed up activity log queries
CREATE INDEX IF NOT EXISTS activity_log_org_created_at
  ON activity_log (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS activity_log_message_id
  ON activity_log (message_id);

CREATE INDEX IF NOT EXISTS activity_log_user_id
  ON activity_log (user_id);

-- Speed up draft replies lookups
CREATE INDEX IF NOT EXISTS draft_replies_message_id
  ON draft_replies (message_id);

CREATE INDEX IF NOT EXISTS draft_replies_user_id
  ON draft_replies (user_id);

-- Ensure one settings row per organization (check if constraint exists first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_settings_organization_id_key'
  ) THEN
    ALTER TABLE organization_settings
      ADD CONSTRAINT organization_settings_organization_id_key UNIQUE (organization_id);
  END IF;
END $$;

COMMIT;