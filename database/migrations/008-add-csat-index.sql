-- Migration: Add index on CSAT token for fast lookups
-- The CSAT token is stored in messages.metadata->'csat'->>'token'

-- Partial index on CSAT token (only rows that have a CSAT token)
CREATE INDEX IF NOT EXISTS idx_messages_csat_token
ON messages USING btree ((metadata->'csat'->>'token'))
WHERE metadata->'csat'->>'token' IS NOT NULL;
