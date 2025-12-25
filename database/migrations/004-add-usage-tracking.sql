-- Migration 004: Add email usage tracking
-- Supports: Free plan (5 total, no reset) and Pro plan (100/month, anniversary reset)

-- Add email usage table
CREATE TABLE IF NOT EXISTS email_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE, -- NULL for free plan (no reset)
  emails_sent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_email_usage_org_period ON email_usage(organization_id, period_start DESC);

-- Trigger for updated_at (reuse existing function from migration 001)
DROP TRIGGER IF EXISTS update_email_usage_updated_at ON email_usage;
CREATE TRIGGER update_email_usage_updated_at
  BEFORE UPDATE ON email_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update organizations table: add 'free' to plan_type constraint
-- First drop the existing constraint
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_plan_type_check;

-- Add updated constraint with 'free' tier
ALTER TABLE organizations
  ADD CONSTRAINT organizations_plan_type_check
  CHECK (plan_type IN ('free', 'basic', 'pro', 'enterprise'));

-- Change default from 'basic' to 'free' for new signups
ALTER TABLE organizations
  ALTER COLUMN plan_type SET DEFAULT 'free';

-- Add column to track when the current billing period started (for anniversary reset)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE;

-- For existing orgs, set current_period_start to plan_started_at
UPDATE organizations
SET current_period_start = plan_started_at
WHERE current_period_start IS NULL;
