-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a custom function to generate ticket IDs
CREATE OR REPLACE FUNCTION generate_ticket_id(org_id UUID)
RETURNS TEXT AS $$
DECLARE
    counter INTEGER;
    ticket_id TEXT;
BEGIN
    -- Get or create counter for this organization
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_id FROM 2) AS INTEGER)), 0) + 1
    INTO counter
    FROM messages
    WHERE organization_id = org_id;

    -- Format as #000001
    ticket_id := '#' || LPAD(counter::TEXT, 6, '0');

    RETURN ticket_id;
END;
$$ LANGUAGE plpgsql;