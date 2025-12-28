-- Migration 005: Add Plus plan with managed AI and token tracking
-- Supports: Free (100K tokens total, one-time), Plus (10M tokens/month, 5K emails/month)

-- 1. Update plan_type constraint to include 'plus'
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_plan_type_check;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_plan_type_check
  CHECK (plan_type IN ('free', 'basic', 'pro', 'plus', 'enterprise'));

-- 2. Create token usage tracking table (mirrors email_usage pattern)
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE, -- NULL for free plan (no reset, one-time limit)
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_token_usage_org_period
  ON token_usage(organization_id, period_start DESC);

-- 3. Trigger for updated_at (reuse existing function from migration 001)
DROP TRIGGER IF EXISTS update_token_usage_updated_at ON token_usage;
CREATE TRIGGER update_token_usage_updated_at
  BEFORE UPDATE ON token_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
