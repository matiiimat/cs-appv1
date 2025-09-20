SET search_path = public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  encrypted_data_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'agent',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_id VARCHAR(20) NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  subject TEXT,
  message TEXT,
  category VARCHAR(100),
  ai_suggested_response TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  agent_id UUID REFERENCES users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  response_time_ms INTEGER,
  auto_reviewed BOOLEAN DEFAULT false,
  is_generating BOOLEAN DEFAULT false,
  edit_history JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  message_id UUID REFERENCES messages(id),
  activity_type VARCHAR(50) NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert demo organization
INSERT INTO organizations (id, name, encrypted_data_key) VALUES 
('82ef6e9f-e0b2-419f-82e3-2468ae4c1d21', 'Demo Organization', 'demo_encryption_key_32_chars_long');

-- Insert demo agent user for the demo organization
-- Fixed UUID intended for local/demo and docs; use in NEXT_PUBLIC_DEMO_AGENT_ID
INSERT INTO users (id, organization_id, name, email, role, is_active)
VALUES (
  '5c2a2f72-1f16-4b76-9c74-1e2f2c88d8a1',
  '82ef6e9f-e0b2-419f-82e3-2468ae4c1d21',
  'Demo Agent',
  'agent@example.com',
  'agent',
  true
);
