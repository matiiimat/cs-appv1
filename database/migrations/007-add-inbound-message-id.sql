-- Migration: Add inbound_message_id to messages table
-- Purpose: Track which messages came from inbound emails vs API-created messages
-- This enables spam prevention by only allowing replies to received emails

-- Add the inbound_message_id column (nullable for existing records)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS inbound_message_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_inbound_message_id
ON messages(inbound_message_id);

-- Add comment explaining the field
COMMENT ON COLUMN messages.inbound_message_id IS
'Set by SendGrid webhook to identify messages created from inbound emails. Used for spam prevention - only messages with this field can be sent as replies.';
