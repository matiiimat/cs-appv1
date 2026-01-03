-- Migration 006: Add stripe_customer_id to organizations
-- This links organizations to their Stripe customer for webhook handling (cancellations, etc.)

-- Add the column
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Add index for fast lookups on webhook events
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id
ON organizations(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Add unique constraint to prevent duplicate mappings
ALTER TABLE organizations ADD CONSTRAINT organizations_stripe_customer_id_unique
UNIQUE (stripe_customer_id);
