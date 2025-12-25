# Usage Limits & Free Tier Implementation Plan

> **Status:** Planning
> **Estimated Effort:** 10-15 hours
> **Priority:** High (Growth enabler)

## Overview

Transform Aidly from a paid-only SaaS to a freemium model with usage-based limits. This enables:
- Free trial without credit card
- Natural upgrade path when users hit limits
- Multiple pricing tiers for revenue scaling

---

## Current State

| Aspect | Current Implementation |
|--------|------------------------|
| Signup | Requires Stripe payment upfront |
| Email sending | Unlimited (no tracking) |
| Plans | Single tier ($167-199/mo) |
| Usage tracking | None |
| Conversion | Payment → Try → Stay/Churn |

## Target State

| Aspect | New Implementation |
|--------|-------------------|
| Signup | Free, email verification only |
| Email sending | Limited by plan tier |
| Plans | Free (5) → Starter (100) → Pro (500) → Enterprise (unlimited) |
| Usage tracking | Per-organization, monthly reset |
| Conversion | Try → Hit limit → Upgrade prompt → Pay |

---

## Phase 1: Usage Tracking Infrastructure

### 1.1 Database Migration

**File:** `database/migrations/004-usage-tracking.sql`

```sql
-- Usage tracking table (allows historical data)
CREATE TABLE organization_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  emails_limit INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, period_start)
);

-- Index for fast lookups
CREATE INDEX idx_organization_usage_org_period
  ON organization_usage(organization_id, period_start DESC);

-- Add plan tier limits to organizations (denormalized for speed)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS monthly_email_limit INTEGER DEFAULT 5;

-- Update existing organizations to have appropriate limits
-- (Run once after migration for existing paid customers)
UPDATE organizations
SET monthly_email_limit = 500
WHERE plan_status = 'active' AND plan_type IN ('pro', 'enterprise');

-- Trigger for updated_at
CREATE TRIGGER update_organization_usage_updated_at
  BEFORE UPDATE ON organization_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Run migration:**
```bash
npm run db:migrate
# Or manually: psql $DATABASE_URL -f database/migrations/004-usage-tracking.sql
```

---

### 1.2 Usage Model

**File:** `lib/models/usage.ts`

```typescript
import { db } from '@/lib/database'
import { startOfMonth, format } from 'date-fns'

export interface UsageInfo {
  emailsSent: number
  emailsLimit: number
  periodStart: string
  remaining: number
  percentUsed: number
  isLimitReached: boolean
}

export const PLAN_LIMITS = {
  free: { emails: 5, name: 'Free Trial', price: 0 },
  basic: { emails: 100, name: 'Starter', price: 49 },
  pro: { emails: 500, name: 'Pro', price: 167 },
  enterprise: { emails: Infinity, name: 'Enterprise', price: 499 }
} as const

export type PlanType = keyof typeof PLAN_LIMITS

export class UsageModel {
  /**
   * Get current period start date (first of the month)
   */
  private static getCurrentPeriodStart(): string {
    return format(startOfMonth(new Date()), 'yyyy-MM-dd')
  }

  /**
   * Get or create usage record for current period
   * Uses upsert pattern for atomic operation
   */
  static async getOrCreateCurrentPeriod(organizationId: string): Promise<UsageInfo> {
    const periodStart = this.getCurrentPeriodStart()

    // Get org's email limit
    const orgResult = await db.query<{ monthly_email_limit: number }>(
      'SELECT monthly_email_limit FROM organizations WHERE id = $1',
      [organizationId]
    )
    const emailsLimit = orgResult.rows[0]?.monthly_email_limit ?? PLAN_LIMITS.free.emails

    // Upsert usage record for current period
    const result = await db.query<{ emails_sent: number; period_start: string }>(`
      INSERT INTO organization_usage (organization_id, period_start, emails_sent, emails_limit)
      VALUES ($1, $2, 0, $3)
      ON CONFLICT (organization_id, period_start)
      DO UPDATE SET emails_limit = $3, updated_at = NOW()
      RETURNING emails_sent, period_start
    `, [organizationId, periodStart, emailsLimit])

    const emailsSent = result.rows[0]?.emails_sent ?? 0

    return {
      emailsSent,
      emailsLimit,
      periodStart,
      remaining: Math.max(0, emailsLimit - emailsSent),
      percentUsed: emailsLimit > 0 ? Math.min(100, (emailsSent / emailsLimit) * 100) : 0,
      isLimitReached: emailsSent >= emailsLimit
    }
  }

  /**
   * Check if organization can send an email
   * Returns usage info with isLimitReached flag
   */
  static async canSendEmail(organizationId: string): Promise<UsageInfo> {
    return this.getOrCreateCurrentPeriod(organizationId)
  }

  /**
   * Increment email count after successful send
   * Returns updated usage info
   */
  static async incrementEmailCount(organizationId: string): Promise<UsageInfo> {
    const periodStart = this.getCurrentPeriodStart()

    // Atomic increment
    await db.query(`
      UPDATE organization_usage
      SET emails_sent = emails_sent + 1, updated_at = NOW()
      WHERE organization_id = $1 AND period_start = $2
    `, [organizationId, periodStart])

    // Return fresh usage info
    return this.getOrCreateCurrentPeriod(organizationId)
  }

  /**
   * Get usage history for organization
   */
  static async getHistory(
    organizationId: string,
    months: number = 6
  ): Promise<Array<{ period: string; sent: number; limit: number }>> {
    const result = await db.query<{ period_start: string; emails_sent: number; emails_limit: number }>(`
      SELECT period_start, emails_sent, emails_limit
      FROM organization_usage
      WHERE organization_id = $1
      ORDER BY period_start DESC
      LIMIT $2
    `, [organizationId, months])

    return result.rows.map(row => ({
      period: row.period_start,
      sent: row.emails_sent,
      limit: row.emails_limit
    }))
  }

  /**
   * Update organization's email limit (called after plan upgrade)
   */
  static async updateLimit(organizationId: string, newLimit: number): Promise<void> {
    const periodStart = this.getCurrentPeriodStart()

    await db.transaction(async (client) => {
      // Update org's default limit
      await client.query(
        'UPDATE organizations SET monthly_email_limit = $1, updated_at = NOW() WHERE id = $2',
        [newLimit, organizationId]
      )

      // Update current period's limit (so upgrade takes effect immediately)
      await client.query(`
        UPDATE organization_usage
        SET emails_limit = $1, updated_at = NOW()
        WHERE organization_id = $2 AND period_start = $3
      `, [newLimit, organizationId, periodStart])
    })
  }

  /**
   * Get plan type from email limit
   */
  static getPlanFromLimit(limit: number): PlanType {
    if (limit >= 500) return 'enterprise'
    if (limit >= 100) return 'pro'
    if (limit >= 50) return 'basic'
    return 'free'
  }
}
```

---

### 1.3 Usage API Endpoint

**File:** `app/api/usage/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { UsageModel, PLAN_LIMITS } from '@/lib/models/usage'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgUser = await getOrgAndUserByEmail(session.user.email)
    if (!orgUser) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const usage = await UsageModel.canSendEmail(orgUser.organizationId)
    const planType = UsageModel.getPlanFromLimit(usage.emailsLimit)

    return NextResponse.json({
      ...usage,
      planType,
      planName: PLAN_LIMITS[planType].name,
      upgradeAvailable: planType !== 'enterprise'
    })
  } catch (error) {
    console.error('[usage] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }
}
```

---

## Phase 2: Enforcement

### 2.1 Modify Email Send Flow

**File:** `app/api/messages/route.ts`

Add usage check before `transitionToSent()` in the `putHandler` function:

```typescript
// Add import at top
import { UsageModel } from '@/lib/models/usage'

// In putHandler, BEFORE the transitionToSent call (~line 170):

// === USAGE LIMIT CHECK ===
// Check if organization has remaining email quota
const usageCheck = await UsageModel.canSendEmail(orgId)

if (usageCheck.isLimitReached) {
  return NextResponse.json({
    error: 'Monthly email limit reached',
    code: 'LIMIT_EXCEEDED',
    usage: {
      sent: usageCheck.emailsSent,
      limit: usageCheck.emailsLimit,
      remaining: 0,
      percentUsed: 100
    },
    upgradeUrl: '/app/billing',
    message: `You've used all ${usageCheck.emailsLimit} emails for this month. Upgrade your plan to continue sending.`
  }, { status: 402 }) // 402 Payment Required
}
// === END USAGE CHECK ===

// ... existing transitionToSent code ...

// AFTER successful EmailService.send() call (~line 275), add:
// === INCREMENT USAGE ===
await UsageModel.incrementEmailCount(orgId)
// === END INCREMENT ===
```

**Important:** The increment should happen AFTER `EmailService.send()` succeeds, not before. This ensures we only count actually sent emails.

### 2.2 Handle 402 Response in Frontend

**File:** `lib/api-client.ts` or wherever API calls are made

```typescript
// Add handler for 402 responses
if (response.status === 402) {
  const data = await response.json()
  if (data.code === 'LIMIT_EXCEEDED') {
    // Dispatch event for UI to show upgrade modal
    window.dispatchEvent(new CustomEvent('aidly:usage-limit-reached', {
      detail: data
    }))
    throw new UsageLimitError(data.message, data.usage)
  }
}
```

---

## Phase 3: Dashboard UI

### 3.1 Usage Meter Component

**File:** `components/usage-meter.tsx`

```typescript
"use client"

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Zap } from 'lucide-react'

interface UsageData {
  emailsSent: number
  emailsLimit: number
  remaining: number
  percentUsed: number
  isLimitReached: boolean
  planName: string
  upgradeAvailable: boolean
}

export function UsageMeter() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsage()
  }, [])

  async function fetchUsage() {
    try {
      const res = await fetch('/api/usage')
      if (res.ok) {
        setUsage(await res.json())
      }
    } catch (e) {
      console.error('Failed to fetch usage:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !usage) {
    return (
      <div className="rounded-lg border p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
        <div className="h-2 bg-muted rounded w-full" />
      </div>
    )
  }

  const isWarning = usage.percentUsed >= 80 && !usage.isLimitReached
  const isCritical = usage.isLimitReached

  return (
    <div className={`rounded-lg border p-4 ${
      isCritical ? 'border-red-500 bg-red-50 dark:bg-red-950/20' :
      isWarning ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
      'border-border'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Email Usage
          </span>
          <span className="text-xs text-muted-foreground">
            ({usage.planName})
          </span>
        </div>
        <span className="text-sm font-mono">
          {usage.emailsSent} / {usage.emailsLimit === Infinity ? '∞' : usage.emailsLimit}
        </span>
      </div>

      <Progress
        value={usage.percentUsed}
        className={`h-2 ${
          isCritical ? '[&>div]:bg-red-500' :
          isWarning ? '[&>div]:bg-yellow-500' :
          ''
        }`}
      />

      {isCritical && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Monthly limit reached</span>
          </div>
          {usage.upgradeAvailable && (
            <Button size="sm" variant="default" asChild>
              <a href="/app/billing">
                <Zap className="h-3 w-3 mr-1" />
                Upgrade
              </a>
            </Button>
          )}
        </div>
      )}

      {isWarning && !isCritical && (
        <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
          {usage.remaining} emails remaining this month
        </p>
      )}
    </div>
  )
}
```

### 3.2 Add to Dashboard

**File:** `components/agent-dashboard.tsx`

Add the usage meter to the dashboard:

```typescript
import { UsageMeter } from '@/components/usage-meter'

// In the component JSX, add near the top of the dashboard:
<div className="mb-6">
  <UsageMeter />
</div>
```

### 3.3 Upgrade Modal

**File:** `components/upgrade-modal.tsx`

```typescript
"use client"

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PLAN_LIMITS } from '@/lib/models/usage'
import { Check, Zap } from 'lucide-react'

export function UpgradeModal() {
  const [open, setOpen] = useState(false)
  const [usageData, setUsageData] = useState<{ sent: number; limit: number } | null>(null)

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setUsageData(e.detail.usage)
      setOpen(true)
    }

    window.addEventListener('aidly:usage-limit-reached', handler as EventListener)
    return () => window.removeEventListener('aidly:usage-limit-reached', handler as EventListener)
  }, [])

  async function handleUpgrade(plan: 'basic' | 'pro' | 'enterprise') {
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, annual: true })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (e) {
      console.error('Checkout failed:', e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Upgrade to Continue
          </DialogTitle>
          <DialogDescription>
            You've sent {usageData?.sent} emails this month and reached your limit of {usageData?.limit}.
            Upgrade to keep your support flowing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-4 mt-4">
          {(['basic', 'pro', 'enterprise'] as const).map((plan) => (
            <div
              key={plan}
              className={`rounded-lg border p-4 ${
                plan === 'pro' ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
            >
              <div className="text-lg font-semibold">{PLAN_LIMITS[plan].name}</div>
              <div className="text-2xl font-bold mt-1">
                ${PLAN_LIMITS[plan].price}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {PLAN_LIMITS[plan].emails === Infinity
                  ? 'Unlimited emails'
                  : `${PLAN_LIMITS[plan].emails} emails/month`}
              </div>
              <Button
                className="w-full mt-4"
                variant={plan === 'pro' ? 'default' : 'outline'}
                onClick={() => handleUpgrade(plan)}
              >
                {plan === 'pro' && <Check className="h-4 w-4 mr-1" />}
                Choose {PLAN_LIMITS[plan].name}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Phase 4: Free Signup Flow

### 4.1 Modify Onboarding to Not Require Payment

**File:** `lib/tenant.ts`

Update `provisionOrgAndUserForEmail` to create free tier orgs:

```typescript
export async function provisionOrgAndUserForEmail(
  email: string,
  name?: string,
  planType: 'free' | 'basic' | 'pro' | 'enterprise' = 'free'
): Promise<{ organizationId: string; userId: string }> {
  const existing = await getOrgAndUserByEmail(email)
  if (existing) return existing

  const displayName = name || email.split('@')[0] || 'New User'
  const orgName = `${displayName}'s Workspace`
  const encKey = DataEncryption.generateOrganizationKey()

  // Set limit based on plan
  const emailLimit = PLAN_LIMITS[planType]?.emails ?? 5

  return await db.transaction(async (client) => {
    const orgRes = await client.query<{ id: string }>(
      `INSERT INTO organizations (name, plan_type, plan_status, encrypted_data_key, monthly_email_limit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [orgName, planType, 'active', encKey, emailLimit]
    )
    const organizationId = orgRes.rows[0].id

    const userRes = await client.query<{ id: string }>(
      `INSERT INTO users (organization_id, email, name, role, is_active)
       VALUES ($1, $2, $3, 'admin', true)
       RETURNING id`,
      [organizationId, email, displayName]
    )
    const userId = userRes.rows[0].id

    return { organizationId, userId }
  })
}
```

### 4.2 Remove Payment Gate from Protected Layout

**File:** `app/app/(protected)/layout.tsx`

Modify the billing check to allow free tier users:

```typescript
// Replace the current billing check with:
try {
  const status = await getBillingStatusForEmail(email)
  const usage = await UsageModel.canSendEmail(orgUser.organizationId)

  // Allow access if:
  // 1. Active paid subscription, OR
  // 2. Free tier with usage remaining
  const hasActiveSubscription = isAccessAllowedFromStatus(status)
  const hasFreeAccess = usage.emailsLimit > 0 // Has any limit means valid account

  if (!hasActiveSubscription && !hasFreeAccess) {
    redirect('/')
  }
} catch (e) {
  console.error('Access check error:', e)
  // Fail-open for now
}
```

---

## Phase 5: Stripe Multi-Tier Setup

### 5.1 Create Stripe Products/Prices

In Stripe Dashboard, create:

| Product | Monthly Price ID | Annual Price ID |
|---------|------------------|-----------------|
| Starter (100 emails) | price_starter_monthly | price_starter_annual |
| Pro (500 emails) | price_pro_monthly | price_pro_annual |
| Enterprise (unlimited) | price_enterprise_monthly | price_enterprise_annual |

### 5.2 Environment Variables

```bash
# .env.local
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_ANNUAL=price_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_ANNUAL=price_xxx
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
STRIPE_PRICE_ENTERPRISE_ANNUAL=price_xxx
```

### 5.3 Modify Checkout Endpoint

**File:** `app/api/billing/checkout/route.ts`

```typescript
const PRICE_MAP = {
  basic: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL,
    limit: 100
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
    limit: 500
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
    limit: Infinity
  }
}

// In handler:
const { plan = 'pro', annual = true } = await request.json()
const priceConfig = PRICE_MAP[plan as keyof typeof PRICE_MAP]
const priceId = annual ? priceConfig.annual : priceConfig.monthly
```

### 5.4 Handle Plan Upgrade in Webhook

**File:** `app/api/stripe/webhook/route.ts`

Add handling for subscription updates:

```typescript
case 'customer.subscription.updated':
case 'customer.subscription.created': {
  const subscription = event.data.object as Stripe.Subscription
  const priceId = subscription.items.data[0]?.price.id

  // Map price ID to limit
  let newLimit = 5 // default to free
  for (const [plan, config] of Object.entries(PRICE_MAP)) {
    if (config.monthly === priceId || config.annual === priceId) {
      newLimit = config.limit
      break
    }
  }

  // Find org by customer email and update limit
  const customer = await stripe.customers.retrieve(subscription.customer as string)
  if (customer && 'email' in customer && customer.email) {
    const orgUser = await getOrgAndUserByEmail(customer.email)
    if (orgUser) {
      await UsageModel.updateLimit(orgUser.organizationId, newLimit)
    }
  }
  break
}
```

---

## Testing Checklist

### Unit Tests

- [ ] `UsageModel.getOrCreateCurrentPeriod()` creates record if missing
- [ ] `UsageModel.getOrCreateCurrentPeriod()` returns existing record
- [ ] `UsageModel.incrementEmailCount()` increments atomically
- [ ] `UsageModel.canSendEmail()` returns correct `isLimitReached`
- [ ] Monthly rollover works correctly at month boundary

### Integration Tests

- [ ] Free user can send up to 5 emails
- [ ] Free user gets 402 on 6th email attempt
- [ ] Paid user can send up to their limit
- [ ] Upgrade immediately increases limit
- [ ] Usage meter displays correctly
- [ ] Upgrade modal appears on limit hit

### Edge Cases

- [ ] Email send fails after limit check (should not increment)
- [ ] Concurrent sends don't exceed limit (race condition)
- [ ] Timezone handling for month rollover
- [ ] User upgrades mid-month (limit increases, usage preserved)
- [ ] User downgrades (limit decreases, usage preserved)

---

## Rollout Plan

### Week 1: Infrastructure
1. [ ] Deploy database migration
2. [ ] Deploy UsageModel
3. [ ] Deploy /api/usage endpoint
4. [ ] Add enforcement to email send (but set high limit)

### Week 2: UI
1. [ ] Deploy UsageMeter component
2. [ ] Deploy UpgradeModal
3. [ ] Add to dashboard
4. [ ] Test with internal users

### Week 3: Billing
1. [ ] Create Stripe products/prices
2. [ ] Update checkout endpoint
3. [ ] Update webhook handler
4. [ ] Test upgrade flow end-to-end

### Week 4: Free Tier Launch
1. [ ] Update onboarding to not require payment
2. [ ] Set free tier limit to 5
3. [ ] Update landing page pricing
4. [ ] Announce free tier

---

## Monitoring & Alerts

### Metrics to Track

- Free tier signups per day
- Free → Paid conversion rate
- Average emails sent per org per month
- % of orgs hitting limit
- Time from signup to first email sent
- Time from limit hit to upgrade

### Alerts

- Unusual spike in 402 errors (limit enforcement issues)
- Stripe webhook failures
- Usage increment failures

---

## Rollback Plan

If issues arise:

1. **Quick fix:** Set all org limits to 999999 via SQL
   ```sql
   UPDATE organizations SET monthly_email_limit = 999999;
   UPDATE organization_usage SET emails_limit = 999999;
   ```

2. **Disable enforcement:** Comment out usage check in `app/api/messages/route.ts`

3. **Full rollback:** Revert all commits in this feature branch

---

## Future Enhancements

- [ ] Overage pricing (pay $X per email beyond limit)
- [ ] Usage alerts at 50%, 80%, 100%
- [ ] Email notifications when approaching limit
- [ ] Admin dashboard to see all org usage
- [ ] Usage analytics/trends
- [ ] API rate limiting separate from email limits
- [ ] Per-seat pricing for team plans
