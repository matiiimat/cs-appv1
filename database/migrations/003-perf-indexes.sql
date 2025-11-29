-- Migration 003: Performance indexes for hot paths

-- Messages: composite to support WHERE org/status ORDER BY created_at
CREATE INDEX IF NOT EXISTS messages_org_status_created_at
  ON messages (organization_id, status, created_at DESC);

-- Activity log: targeted lookups/joins
CREATE INDEX IF NOT EXISTS activity_log_message_id
  ON activity_log (message_id);
CREATE INDEX IF NOT EXISTS activity_log_user_id
  ON activity_log (user_id);

-- Draft replies: single-column access
CREATE INDEX IF NOT EXISTS draft_replies_message_id
  ON draft_replies (message_id);
CREATE INDEX IF NOT EXISTS draft_replies_user_id
  ON draft_replies (user_id);

-- Optional partials for hot queues (uncomment as needed based on real usage)
-- CREATE INDEX IF NOT EXISTS messages_org_new_created_at
--   ON messages (organization_id, created_at DESC)
--   WHERE status = 'new';
-- CREATE INDEX IF NOT EXISTS messages_org_to_send_created_at
--   ON messages (organization_id, created_at DESC)
--   WHERE status = 'to_send_queue';
-- CREATE INDEX IF NOT EXISTS messages_org_to_review_created_at
--   ON messages (organization_id, created_at DESC)
--   WHERE status = 'to_review_queue';

