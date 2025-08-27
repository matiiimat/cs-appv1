# SaaS Transformation Roadmap

## Executive Summary

This document outlines the architectural changes required to transform the current customer support AI application into a multi-tenant SaaS platform. The transformation involves significant changes to support multiple organizations, flexible AI integration, and enterprise-grade features.

## Current Architecture Analysis

**Strengths:**
- Flexible AI provider abstraction (OpenAI, Anthropic, Google, Azure, Custom)
- Clean React component architecture
- Modern tech stack (Next.js 15, React 19, TypeScript)
- Well-structured UI components

**Limitations for SaaS:**
- Single-tenant architecture
- In-memory data storage (no persistence)
- No authentication/authorization system
- Client-side only settings management
- No organization/user management
- No billing or subscription system

## Transformation Roadmap

### Phase 1: Foundation (Months 1-2)

#### 1.1 Database Architecture
**Priority: Critical**

Replace in-memory storage with proper database:

```typescript
// Current: app/api/messages/route.ts (in-memory array)
const messages: Message[] = []

// Proposed: Database schema
interface Organization {
  id: string
  name: string
  subdomain: string
  plan: 'starter' | 'professional' | 'enterprise'
  settings: OrganizationSettings
  createdAt: Date
  updatedAt: Date
}

interface User {
  id: string
  organizationId: string
  email: string
  role: 'admin' | 'agent' | 'viewer'
  permissions: string[]
}

interface Message {
  id: string
  organizationId: string // Tenant isolation
  customerId: string
  subject: string
  content: string
  status: 'pending' | 'in_review' | 'resolved'
  assignedTo?: string
  priority: 'low' | 'medium' | 'high'
  category: string
  createdAt: Date
  updatedAt: Date
}
```

**Recommended Stack:**
- PostgreSQL for main data
- Prisma for ORM and type safety
- Redis for caching and sessions

#### 1.2 Authentication & Authorization
**Priority: Critical**

Implement enterprise-grade auth:

```typescript
// lib/auth.ts
interface AuthUser {
  id: string
  organizationId: string
  email: string
  role: UserRole
  permissions: Permission[]
}

// Middleware for tenant isolation
async function getTenantFromRequest(request: NextRequest): Promise<Organization> {
  // Extract from subdomain or JWT
}
```

**Recommended Stack:**
- NextAuth.js for authentication
- JWT for session management
- Role-based access control (RBAC)

#### 1.2.1 Settings API Migration IMPORTANT
**Priority: High**

Replace current localStorage settings storage with API-based persistence:

```typescript
// Current: localStorage implementation (lib/settings-context.tsx)
const saveSettings = async () => {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsWithTimestamp))
}

// Future: Replace with tenant-aware API
const saveSettings = async () => {
  const response = await fetch('/api/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
    headers: { 
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to save settings')
  }
  
  return response.json()
}

// app/api/settings/route.ts
export async function POST(request: NextRequest) {
  const tenant = await getTenantFromRequest(request)
  const settings = await request.json()
  
  // Save to database with tenant isolation
  await db.organizationSettings.upsert({
    where: { organizationId: tenant.id },
    update: { settings, updatedAt: new Date() },
    create: { organizationId: tenant.id, settings, createdAt: new Date() }
  })
  
  return NextResponse.json({ success: true })
}
```

#### 1.3 Multi-tenant Architecture
**Priority: Critical**

Implement tenant isolation at every layer:

```typescript
// lib/tenant.ts
export class TenantService {
  static async validateTenantAccess(
    userId: string, 
    organizationId: string
  ): Promise<boolean>
  
  static async getTenantSettings(
    organizationId: string
  ): Promise<OrganizationSettings>
}

// All API routes need tenant validation
export async function POST(request: NextRequest) {
  const tenant = await getTenantFromRequest(request)
  // All operations scoped to tenant.id
}
```

### Phase 2: AI Integration Flexibility (Months 2-3)

#### 2.1 Tenant-Specific AI Configuration
**Priority: High**

Since companies will provide their own AI, make the AI system completely configurable per tenant:

```typescript
// lib/tenant-ai.ts
interface TenantAIConfig {
  organizationId: string
  provider: 'webhook' | 'openai' | 'anthropic' | 'custom'
  apiEndpoint?: string
  apiKey?: string
  model?: string
  customHeaders?: Record<string, string>
  webhookSecret?: string
  settings: {
    temperature: number
    maxTokens: number
    systemPrompt: string
    categories: string[]
    priorityRules: PriorityRule[]
  }
}

// API route for AI responses
export async function POST(request: NextRequest) {
  const tenant = await getTenantFromRequest(request)
  const aiConfig = await getTenantAIConfig(tenant.id)
  
  if (aiConfig.provider === 'webhook') {
    // Call customer's webhook
    return await callCustomerAIWebhook(tenant, messageData, aiConfig)
  }
  
  // Use built-in providers
  const aiService = new AIService(aiConfig)
  // ...
}
```

#### 2.2 Webhook System for Customer AI
**Priority: High**

Allow customers to integrate their own AI systems:

```typescript
// app/api/ai-webhook/route.ts
interface CustomerAIRequest {
  organizationId: string
  messageId: string
  customerName: string
  customerEmail: string
  subject: string
  message: string
  context?: any
}

interface CustomerAIResponse {
  suggestedResponse: string
  category: string
  priority: 'low' | 'medium' | 'high'
  confidence: number
  metadata?: any
}
```

### Phase 3: Enterprise Features (Months 3-4)

#### 3.1 User & Organization Management
**Priority: High**

```typescript
// components/admin/OrganizationManager.tsx
interface OrganizationSettings {
  branding: {
    logo: string
    primaryColor: string
    companyName: string
  }
  features: {
    aiIntegration: boolean
    analytics: boolean
    customMacros: boolean
    apiAccess: boolean
  }
  limits: {
    maxUsers: number
    maxMessagesPerMonth: number
    maxAPICallsPerDay: number
  }
}
```

#### 3.2 White-labeling & Customization
**Priority: Medium**

```typescript
// lib/branding.ts
export function getTenantBranding(organizationId: string): BrandingConfig {
  return {
    logo: tenant.branding.logo,
    colors: {
      primary: tenant.branding.primaryColor,
      // ...
    },
    domain: `${tenant.subdomain}.supportai.com`
  }
}
```

#### 3.3 Usage Analytics & Billing
**Priority: High**

```typescript
// lib/usage-tracking.ts
interface UsageMetrics {
  organizationId: string
  period: string // YYYY-MM
  messagesProcessed: number
  aiCallsMade: number
  activeUsers: number
  storageUsed: number
}

// Track usage for billing
export class UsageTracker {
  static async trackMessage(organizationId: string, messageId: string)
  static async trackAICall(organizationId: string, tokens: number)
  static async getUsageForBilling(organizationId: string, period: string)
}
```

### Phase 4: API & Integrations (Months 4-5)

#### 4.1 Public API for Customers
**Priority: Medium**

```typescript
// app/api/v1/messages/route.ts
// RESTful API for customer integrations
export async function GET(request: NextRequest) {
  const tenant = await authenticateAPIKey(request)
  // Return tenant's messages
}

// WebSocket for real-time updates
// app/api/v1/websocket/route.ts
```

#### 4.2 Integrations Framework
**Priority: Medium**

Common integrations customers want:
- Slack/Teams notifications
- Email platforms (SendGrid, Mailgun)
- CRM systems (Salesforce, HubSpot)
- Ticketing systems (Zendesk, Jira)

### Phase 5: Scale & Performance (Months 5-6)

#### 5.1 Performance Optimizations
- Implement caching strategies
- Database query optimization
- CDN for static assets
- Message queue for async processing

#### 5.2 Security Enhancements
- SOC 2 compliance preparation
- Data encryption at rest and in transit
- Audit logging
- Rate limiting
- IP whitelisting

## Implementation Priorities

### Must-Have (Launch Blockers)
1. ✅ Multi-tenant database architecture
2. ✅ Authentication & authorization
3. ✅ Settings API migration (replace localStorage)
4. ✅ Tenant-specific AI configuration
5. ✅ Basic organization management
6. ✅ Usage tracking for billing

### Should-Have (Competitive Features)
7. White-labeling capabilities
8. Webhook system for customer AI
9. Advanced analytics dashboard
10. API access for customers
11. Common integrations (Slack, email)

### Nice-to-Have (Differentiators)
12. Advanced customization options
13. Workflow automation
14. Advanced reporting
15. Mobile app
16. SSO integration

## Performance & Scalability Enhancements

### Batch Processing for High Volume
**Priority: Medium** (Future Version)

For companies receiving thousands of emails overnight, implement intelligent batch processing:

```typescript
// Current: Process all messages sequentially on page load
// Problem: 1000 messages × 30 seconds = 8+ hours processing time

// Future: Smart batch processing
interface BatchProcessingConfig {
  batchSize: 100          // Process 100 messages at a time
  priority: 'urgent' | 'normal' | 'low'
  autoStart: boolean      // Start processing automatically
  pauseResume: boolean    // Allow agents to pause/resume
}

// Implementation approach:
// 1. Prioritize messages by keywords, sender importance, time sensitivity
// 2. Process urgent messages first (account issues, billing problems)
// 3. Process normal messages in background batches
// 4. Allow agents to start responding while processing continues
// 5. Show real-time progress: "Processing batch 3/10 (47 messages remaining)"

const batchProcessor = {
  async processPriorityQueue() {
    const urgentMessages = await filterUrgentMessages()
    const normalMessages = await filterNormalMessages()
    
    // Process urgent first
    await processBatch(urgentMessages, { priority: 'urgent', batchSize: 50 })
    
    // Process normal in background
    await processBatch(normalMessages, { priority: 'normal', batchSize: 100 })
  }
}
```

**Benefits:**
- Agents can start working immediately on high-priority messages
- Background processing doesn't block the UI
- Intelligent prioritization reduces response time for critical issues
- Progress visibility keeps agents informed
- Pause/resume functionality for maintenance windows

## Technical Recommendations

### Database Schema Changes

```sql
-- Core tenant isolation
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL,
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add organization_id to all existing tables
ALTER TABLE messages ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_messages_organization_id ON messages(organization_id);

-- User management
CREATE TABLE users (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL,
  permissions JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI configurations per tenant
CREATE TABLE ai_configurations (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  provider VARCHAR(50) NOT NULL,
  configuration JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking for billing
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  metric_type VARCHAR(50) NOT NULL,
  value BIGINT NOT NULL,
  period DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Environment Variables Structure

```bash
# Current single-tenant
OPENAI_API_KEY=sk-...

# Proposed multi-tenant
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NEXTAUTH_SECRET=...
STRIPE_SECRET_KEY=sk_...
WEBHOOK_SIGNING_SECRET=...
```

## Migration Strategy

1. **Parallel Development**: Build new multi-tenant version alongside existing app
2. **Data Migration**: Create scripts to migrate existing demo data
3. **Feature Parity**: Ensure new version has all current features
4. **Customer Migration**: Plan for moving existing users to new system
5. **Gradual Rollout**: Start with beta customers before full launch

## Business Considerations

### Pricing Strategy
- **Starter**: $29/month - Basic features, limited messages
- **Professional**: $99/month - Advanced features, higher limits
- **Enterprise**: Custom - White-labeling, custom integrations, dedicated support

### Customer Success
- Onboarding process for new organizations
- Documentation for AI integration
- Support for webhook setup and testing
- Migration assistance for existing customers

## Next Steps

1. Set up development database and basic multi-tenancy
2. Implement authentication system
3. Create organization management interface
4. Build flexible AI integration system
5. Develop billing and usage tracking
6. Create customer onboarding flow
7. Beta test with select customers
8. Launch and iterate based on feedback

## Timeline Estimate

- **Phase 1 (Foundation)**: 6-8 weeks
- **Phase 2 (AI Integration)**: 3-4 weeks  
- **Phase 3 (Enterprise Features)**: 4-5 weeks
- **Phase 4 (API & Integrations)**: 3-4 weeks
- **Phase 5 (Scale & Performance)**: 2-3 weeks
- **Testing & Polish**: 2-3 weeks

**Total**: 5-6 months for full SaaS transformation

This roadmap transforms your customer support platform into a scalable, multi-tenant SaaS offering that can serve multiple organizations while allowing them to integrate their own AI systems.