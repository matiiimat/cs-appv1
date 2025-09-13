-- Migration 001: Create initial multi-tenant schema
-- Organizations (your SaaS customers)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'basic' CHECK (plan_type IN ('basic', 'pro', 'enterprise')),
  plan_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (plan_status IN ('active', 'suspended', 'cancelled', 'trial')),
  plan_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  plan_expires_at TIMESTAMP WITH TIME ZONE,
  encrypted_data_key TEXT NOT NULL, -- For data encryption per tenant
  settings JSONB DEFAULT '{}', -- Organization-specific settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users within organizations
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'viewer')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- Customer messages (tenant-isolated)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_id VARCHAR(20) NOT NULL,
  customer_name TEXT, -- Encrypted
  customer_email TEXT, -- Encrypted
  subject TEXT, -- Encrypted
  message TEXT, -- Encrypted
  category VARCHAR(100),
  ai_suggested_response TEXT, -- Encrypted
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'edited', 'sent', 'review')),
  agent_id UUID REFERENCES users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  response_time_ms INTEGER,
  auto_reviewed BOOLEAN DEFAULT FALSE,
  is_generating BOOLEAN DEFAULT FALSE,
  edit_history JSONB DEFAULT '[]', -- Array of edit records
  metadata JSONB DEFAULT '{}', -- Additional message metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, ticket_id)
);

-- Settings per organization (encrypted)
CREATE TABLE organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  settings_data TEXT NOT NULL, -- Encrypted JSON
  version INTEGER DEFAULT 1, -- For settings versioning
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Activity log for audit trail
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  message_id UUID REFERENCES messages(id),
  activity_type VARCHAR(50) NOT NULL, -- 'approved', 'rejected', 'edited', 'received', 'review'
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draft replies (not encrypted, temporary data)
CREATE TABLE draft_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  draft_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id, message_id)
);

-- Indexes for performance
CREATE INDEX idx_messages_organization_id ON messages(organization_id);
CREATE INDEX idx_messages_status ON messages(organization_id, status);
CREATE INDEX idx_messages_created_at ON messages(organization_id, created_at DESC);
CREATE INDEX idx_messages_agent_id ON messages(agent_id);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_activity_log_organization_id ON activity_log(organization_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(organization_id, created_at DESC);
CREATE INDEX idx_draft_replies_user_message ON draft_replies(user_id, message_id);

-- Row Level Security (RLS) for multi-tenancy
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies (will be set up when we add authentication)
-- For now, we'll manage tenant isolation in the application layer

-- Updated trigger for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_settings_updated_at BEFORE UPDATE ON organization_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_draft_replies_updated_at BEFORE UPDATE ON draft_replies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();