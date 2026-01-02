# V2 Improvements: Error Tracking, Health Monitoring & Testing

This document outlines the three critical improvements to implement post-alpha launch for production readiness.

---

## 1. Sentry Error Tracking

### Why It Matters
Without error tracking, you'll only discover bugs when customers complain. Sentry captures errors automatically, provides stack traces, and alerts you in real-time.

### Installation

```bash
npm install @sentry/nextjs
```

Run the Sentry setup wizard:
```bash
npx @sentry/wizard@latest -i nextjs
```

This creates:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- Updates `next.config.ts` with Sentry webpack plugin
- Creates `.env.sentry-build-plugin`

### Manual Setup Steps

1. **Create Sentry Account**
   - Go to [sentry.io](https://sentry.io) (free tier available)
   - Create a new Next.js project
   - Copy the DSN

2. **Add Environment Variables**
   ```env
   # .env.local
   SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

3. **Create Global Error Boundary**

   Create `app/global-error.tsx`:
   ```tsx
   'use client'
   import * as Sentry from '@sentry/nextjs'
   import { useEffect } from 'react'

   export default function GlobalError({
     error,
     reset
   }: {
     error: Error;
     reset: () => void
   }) {
     useEffect(() => {
       Sentry.captureException(error)
     }, [error])

     return (
       <html>
         <body>
           <div className="flex min-h-screen items-center justify-center">
             <div className="text-center">
               <h2 className="text-xl font-semibold">Something went wrong</h2>
               <p className="mt-2 text-gray-600">We've been notified and are looking into it.</p>
               <button
                 onClick={() => reset()}
                 className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
               >
                 Try again
               </button>
             </div>
           </div>
         </body>
       </html>
     )
   }
   ```

4. **Add API Route Error Handling Pattern**

   Wrap critical API routes:
   ```typescript
   import * as Sentry from '@sentry/nextjs'

   export async function POST(request: Request) {
     try {
       // ... your logic
     } catch (error) {
       Sentry.captureException(error, {
         extra: {
           route: '/api/your-route',
           // Add relevant context
         }
       })
       return NextResponse.json({ error: 'Internal error' }, { status: 500 })
     }
   }
   ```

### Sentry Configuration Tips

In `sentry.client.config.ts`, consider:
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
  replaysSessionSampleRate: 0.1, // 10% of sessions for replay
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  environment: process.env.NODE_ENV,
})
```

### Time Estimate
30-45 minutes

---

## 2. Health Endpoint & Uptime Monitoring

### Why It Matters
You need to know when your service is down before customers tell you. A health endpoint lets monitoring services check your app's status automatically.

### Create Health Endpoint

Create `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { pool } from '@/lib/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  services: {
    database: string
    // redis: string // Uncomment if using Redis critically
  }
}

export async function GET() {
  const checks: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    services: {
      database: 'checking...',
    }
  }

  // Check database connectivity
  try {
    const start = Date.now()
    await pool.query('SELECT 1')
    const latency = Date.now() - start
    checks.services.database = `ok (${latency}ms)`

    // Warn if database is slow
    if (latency > 1000) {
      checks.status = 'degraded'
      checks.services.database = `slow (${latency}ms)`
    }
  } catch (error) {
    checks.services.database = 'error: connection failed'
    checks.status = 'unhealthy'
  }

  // Uncomment if Redis is critical to your app
  // try {
  //   const start = Date.now()
  //   await redis.ping()
  //   checks.services.redis = `ok (${Date.now() - start}ms)`
  // } catch {
  //   checks.services.redis = 'error'
  //   checks.status = 'degraded' // or 'unhealthy' if Redis is critical
  // }

  // Return appropriate status code
  const statusCode = checks.status === 'healthy' ? 200
                   : checks.status === 'degraded' ? 200
                   : 503

  return NextResponse.json(checks, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    }
  })
}
```

### Set Up Uptime Robot (Free)

1. **Create Account**
   - Go to [uptimerobot.com](https://uptimerobot.com)
   - Sign up for free (50 monitors included)

2. **Add Monitor**
   - Click "Add New Monitor"
   - Monitor Type: `HTTP(s)`
   - Friendly Name: `Aidly Production`
   - URL: `https://your-domain.com/api/health`
   - Monitoring Interval: `5 minutes`

3. **Configure Alerts**
   - Add your email as alert contact
   - Optionally add Slack webhook for team notifications
   - Set alert threshold (e.g., alert after 2 consecutive failures)

### Alternative: Better Stack (Formerly Logtail)

If you want more features (free tier available):
- [betterstack.com](https://betterstack.com)
- Includes status pages
- Better incident management
- Integrates with Slack/PagerDuty

### Time Estimate
20 minutes

---

## 3. Critical Path Testing

### Why It Matters
Before launch and after each deployment, you need to verify the core user journey works. This manual checklist ensures nothing is broken.

### Critical Path Test Checklist

```
# Aidly Critical Path Test
========================================
Date: ___________
Tester: ___________
Environment: [ ] Staging [ ] Production
Build/Commit: ___________

## Pre-Test Setup
- [ ] Clear browser cache/use incognito
- [ ] Have test email account ready
- [ ] Have Stripe test card ready: 4242 4242 4242 4242

========================================
## 1. AUTHENTICATION FLOW
========================================

### 1.1 Magic Link Sign-In
- [ ] Navigate to /app/login
- [ ] Enter test email address
- [ ] Click "Send Magic Link"
- [ ] Email received? Time: _____ seconds
- [ ] Click magic link in email
- [ ] Redirected to dashboard successfully
- [ ] Refresh page - session persists

### 1.2 Sign Out
- [ ] Click sign out
- [ ] Redirected to login page
- [ ] Cannot access /app without re-authenticating

========================================
## 2. INBOUND EMAIL PROCESSING
========================================

### 2.1 Send Test Email
Send email to your inbound address:
- To: support@[your-inbound-domain]
- From: testcustomer@example.com
- Subject: "Test ticket - [current timestamp]"
- Body: "Hi, I need help resetting my account password. I've tried the forgot password link but it's not working. Can you help?"

### 2.2 Verify Processing
- [ ] Email appears in dashboard
- [ ] Time to appear: _____ seconds (should be <60s)
- [ ] AI draft response generated
- [ ] Category assigned: __________ (expected: Account Access)
- [ ] Priority assigned: __________ (expected: medium/high)
- [ ] Customer name extracted correctly
- [ ] Subject line captured correctly

========================================
## 3. MESSAGE REVIEW & APPROVAL
========================================

### 3.1 Review Interface
- [ ] Click on message to open detailed view
- [ ] AI response displays correctly
- [ ] Response is contextually appropriate
- [ ] No PII leakage in AI response

### 3.2 Edit Response
- [ ] Edit the AI response text
- [ ] Save changes
- [ ] Changes persist after page refresh

### 3.3 Regenerate Response
- [ ] Click regenerate/refresh AI response
- [ ] New response generated
- [ ] New response is different from original

### 3.4 Send Response
- [ ] Click Approve/Send
- [ ] Confirmation shown
- [ ] Message status changes to "sent"
- [ ] Message moves out of review queue

### 3.5 Verify Delivery
- [ ] Check original sender's inbox
- [ ] Reply received
- [ ] Reply formatted correctly
- [ ] From address correct
- [ ] Subject line includes ticket ID

========================================
## 4. KNOWLEDGE BASE
========================================

### 4.1 Add Knowledge Entry
- [ ] Navigate to Knowledge Base settings
- [ ] Add new entry:
  - Category: Account Access
  - Content: "Password resets take 24 hours to process"
- [ ] Entry saved successfully

### 4.2 Verify AI Uses Knowledge
- [ ] Send new email about password reset
- [ ] Check AI response references the knowledge base content

========================================
## 5. BILLING FLOW (Stripe Test Mode)
========================================

### 5.1 Upgrade to Plus
- [ ] Navigate to billing/pricing
- [ ] Click upgrade to Plus
- [ ] Stripe checkout loads
- [ ] Enter test card: 4242 4242 4242 4242
- [ ] Any expiry date, any CVC
- [ ] Complete checkout

### 5.2 Verify Subscription
- [ ] Redirected to success page
- [ ] Plan shows as "Plus" in settings
- [ ] Email limit shows 5,000/month
- [ ] Stripe dashboard shows active subscription

### 5.3 Access Customer Portal
- [ ] Click "Manage Subscription" or similar
- [ ] Stripe portal opens
- [ ] Can see subscription details
- [ ] Can cancel (don't actually cancel in prod)

========================================
## 6. SETTINGS & CONFIGURATION
========================================

### 6.1 AI Configuration
- [ ] Navigate to AI settings
- [ ] Can view current AI provider
- [ ] Can update API key (if BYOK)
- [ ] Test connection works

### 6.2 Organization Settings
- [ ] Can update organization name
- [ ] Can update support email settings
- [ ] Changes save correctly

========================================
## 7. GDPR COMPLIANCE
========================================

### 7.1 Data Export (if implemented)
- [ ] Request data export
- [ ] Export completes
- [ ] Downloaded file contains user data

### 7.2 Account Deletion (TEST ACCOUNT ONLY)
- [ ] Navigate to Settings → Delete Account
- [ ] Warning message displayed
- [ ] Confirm deletion
- [ ] Logged out automatically
- [ ] Cannot log back in (org deleted)
- [ ] Database confirms deletion (check if possible)

========================================
## TEST RESULTS
========================================

### Summary
- Total Tests: ____
- Passed: ____
- Failed: ____
- Blocked: ____

### Status
- [ ] ALL PASSED - Ready for deployment
- [ ] ISSUES FOUND - See below

### Issues Found
| # | Section | Description | Severity | Notes |
|---|---------|-------------|----------|-------|
| 1 |         |             |          |       |
| 2 |         |             |          |       |
| 3 |         |             |          |       |

### Environment Notes
- Browser:
- OS:
- Network:
- Any anomalies:

========================================
## Sign-Off
========================================
Tested by: _______________
Date: _______________
Approved for deployment: [ ] Yes [ ] No
```

### Future: Automated E2E Tests

Once you have paying customers, convert this to Playwright tests:

```typescript
// Example: tests/e2e/critical-path.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Critical Path', () => {
  test('user can sign in with magic link', async ({ page }) => {
    await page.goto('/app/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.click('button[type="submit"]')
    // ... verify magic link flow
  })

  test('inbound email creates message', async ({ page }) => {
    // Use API to simulate inbound email
    // Verify message appears in dashboard
  })

  test('user can approve and send response', async ({ page }) => {
    // Navigate to message
    // Click approve
    // Verify status change
  })
})
```

### Time Estimate
- Creating checklist: 10 minutes (done above)
- Running full test: 20-30 minutes
- Automating with Playwright: 4-8 hours (future)

---

## Implementation Priority

| Task | Priority | Time | Impact |
|------|----------|------|--------|
| Sentry Error Tracking | HIGH | 45 min | Know about errors before customers |
| Health Endpoint | HIGH | 20 min | Know when service is down |
| Uptime Robot Setup | HIGH | 10 min | Get alerted on downtime |
| Run Critical Path Test | HIGH | 30 min | Confidence before launch |
| Automate E2E Tests | MEDIUM | 8 hrs | Do after first paying customers |

---

## Quick Start Commands

```bash
# 1. Install Sentry
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs

# 2. Create health endpoint
# (create app/api/health/route.ts manually - see above)

# 3. Run manual tests
# (follow checklist above)

# 4. Set up monitoring
# Go to uptimerobot.com and add your health endpoint
```

---

## Checklist Before Launch

- [ ] Sentry installed and receiving test errors
- [ ] Health endpoint returning 200
- [ ] Uptime Robot monitoring active
- [ ] Critical path test completed with all passes
- [ ] Team notified of monitoring alerts setup
