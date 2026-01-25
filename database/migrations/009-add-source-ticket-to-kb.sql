-- Migration: Add source_ticket_id to knowledge_base_entries
-- Purpose: Track which case/ticket a KB entry was created from (for Success Library feature)

-- Add source_ticket_id column (nullable to maintain backward compatibility)
ALTER TABLE knowledge_base_entries
ADD COLUMN IF NOT EXISTS source_ticket_id VARCHAR(50);

-- Create index for fast lookups when checking if a case is already in KB
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source_ticket
ON knowledge_base_entries(source_ticket_id)
WHERE source_ticket_id IS NOT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN knowledge_base_entries.source_ticket_id IS 'Reference to the ticket_id this KB entry was created from (e.g., "1234" without the # prefix)';
