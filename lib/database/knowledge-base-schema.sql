-- Knowledge Base table for storing case resolutions
-- This table stores anonymized case summaries and resolutions for improving AI responses

CREATE TABLE IF NOT EXISTS knowledge_base_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    case_summary TEXT NOT NULL,
    resolution TEXT NOT NULL,
    category VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Foreign key constraint (assuming you have an organizations table)
    CONSTRAINT fk_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_org_id ON knowledge_base_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_enabled ON knowledge_base_entries(enabled);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base_entries(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_created_at ON knowledge_base_entries(created_at);

-- Full-text search index for case_summary and resolution
CREATE INDEX IF NOT EXISTS idx_knowledge_base_search
ON knowledge_base_entries
USING gin(to_tsvector('english', case_summary || ' ' || resolution));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_knowledge_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_knowledge_base_updated_at
    BEFORE UPDATE ON knowledge_base_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_base_updated_at();