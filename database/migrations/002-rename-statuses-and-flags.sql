-- Migration 002: Rename statuses and auto_reviewed flag
-- Changes:
-- 1) Rename status values:
--    pending -> new
--    approved -> to_send_queue
--    review -> to_review_queue
-- 2) Rename column:
--    auto_reviewed -> ai_reviewed
-- 3) Update CHECK constraint on messages.status

BEGIN;

-- 1) Relax status constraint (name may vary on environments)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;

-- 2) Rename auto_reviewed column to ai_reviewed (idempotent-ish: only run if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'auto_reviewed'
  ) THEN
    ALTER TABLE messages RENAME COLUMN auto_reviewed TO ai_reviewed;
  END IF;
END $$;

-- 3) Update existing status values
UPDATE messages SET status = 'new'            WHERE status = 'pending';
UPDATE messages SET status = 'to_send_queue'  WHERE status = 'approved';
UPDATE messages SET status = 'to_review_queue' WHERE status = 'review';

-- 4) Re-add strict constraint for the new set of statuses
ALTER TABLE messages
  ADD CONSTRAINT messages_status_check
  CHECK (status IN ('new','to_send_queue','rejected','edited','sent','to_review_queue'));

COMMIT;

