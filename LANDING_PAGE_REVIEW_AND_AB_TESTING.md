# Landing Page Review & A/B Testing Strategy

## Executive Summary

**Current Problem:** 10 clicks → 0 conversions (0% conversion rate)
**Expected for B2B SaaS:** 5-15% conversion rate (should have 1-2 signups)
**Diagnosis:** Friction + message mismatch between ad and landing page

---

## Landing Page Audit

### ✅ What's Working

1. **Strong visual design** - Professional, modern, clean
2. **Clear value prop** - "An entire support team. Deployed in minutes."
3. **Trust signals** - GDPR compliant, testimonial, stats (90% time saved)
4. **Multiple CTAs** - "Start Free" appears 4+ times
5. **No credit card required** - Good friction reducer
6. **Social proof** - Jean-Pierre testimonial

### ❌ Conversion Killers (Why 10 Clicks = 0 Signups)

#### 1. **CTA Doesn't Match Ad Promise**
**Your ad says:** "Cut email response time without hiring"
**Your CTA says:** "Start Free" (generic, unclear what happens next)

**Problem:** User doesn't understand what "Start Free" means
- Do they get a demo?
- Do they talk to sales?
- Do they get access immediately?
- What does "free" include?

#### 2. **No Dedicated Landing Page for Ads**
You're sending ad traffic to your homepage, which has:
- Long scroll distance to pricing (50% of ad clicks bounce before scrolling)
- 4 different CTAs competing for attention
- Distracting navigation (Blog, Sign in)
- Generic messaging not tailored to ad intent

#### 3. **Magic Link Friction**
For **cold traffic** from ads, magic link creates too many steps:
1. Click ad → Land on site
2. Scroll to find CTA
3. Click "Start Free"
4. Land on sign-in page (not clearly labeled as "signup")
5. Enter email + check terms box + solve captcha
6. Wait for email
7. Open email app
8. Find email in inbox
9. Click link
10. Return to browser

**That's 10 steps.** You lose 10-20% of users at each step.

#### 4. **Sign-in Page Confusion**
Your `/app/login` page says "**Sign in**" at the top.
For new users from ads, this creates confusion:
- "Wait, do I need an account already?"
- "Is this for existing customers only?"
- "Where do I sign UP?"

#### 5. **No Value Reinforcement on Signup Page**
When user clicks "Start Free" and lands on `/app/login`:
- No reminder of what they're signing up for
- No "You'll get: 5 free emails, AI responses, etc."
- No visual continuity from landing page
- Feels like a disconnected experience

#### 6. **Missing Urgency/Scarcity**
Nothing tells the user why to sign up NOW vs. later
- No "Limited to first 100 users"
- No "Offer ends soon"
- No "Save 20% this week"

---

## Conversion Funnel Analysis

### Current Funnel (Homepage)
```
Ad Click (LinkedIn) → Homepage → Scroll → Click "Start Free" → /app/login →
Enter email → Check terms → Solve captcha → Wait for email →
Open email → Click link → Land in /app

Expected loss at each step: 10-30%
Total expected conversion: 0.7% - 5%
```

### Optimized Funnel (Dedicated Landing Page)
```
Ad Click (LinkedIn) → Dedicated LP → Click "Get 5 Free Emails" →
Signup page → Enter email → Magic link → /app

Expected conversion: 8-18%
```

---

## Recommended Fixes (Priority Order)

### 🔥 **Priority 1: Create Dedicated Landing Page for Ads**

**Why:** Removes distractions, matches ad message, shortens path to conversion

**What to change:**
1. Create `/linkedin` or `/lp/email-support` route
2. Update LinkedIn ads to point to this URL instead of homepage
3. Design:
   - Hero matches ad copy exactly
   - Single CTA: "Get 5 Free Emails Now"
   - Remove navigation (no Blog, Sign in links to distract)
   - Pricing section visible above the fold
   - Form embedded on page (no redirect to /app/login)

**Example structure:**
```
┌─────────────────────────────────────┐
│ Logo                                │
├─────────────────────────────────────┤
│                                     │
│  Cut Email Response Time            │
│  Without Hiring More Agents         │
│                                     │
│  Get 5 free AI-powered responses    │
│  [Email input box]                  │
│  [Get Started - No CC Required]     │
│                                     │
├─────────────────────────────────────┤
│ ✓ 5 free emails to try              │
│ ✓ No credit card required           │
│ ✓ Setup in 2 minutes                │
├─────────────────────────────────────┤
│ [Social proof: testimonial]         │
├─────────────────────────────────────┤
│ [Features: 3-4 key benefits]        │
├─────────────────────────────────────┤
│ [Pricing: Free → Plus → Pro]        │
├─────────────────────────────────────┤
│ [Final CTA with email input]        │
└─────────────────────────────────────┘
```

### 🔥 **Priority 2: Fix Signup Page Messaging**

**Change `/app/login` for new users:**

**Before:**
```
Sign in
We'll email you a magic link to sign in.
```

**After (for ad traffic):**
```
Get Your 5 Free Emails
Enter your email to start using Aidly - no credit card required.
We'll send you a secure link to get started instantly.

✓ 5 free AI-powered responses
✓ No credit card needed
✓ Cancel anytime
```

**Implementation:** Detect `?ref=linkedin` or `?ref=ad` in URL and show different copy

### 🔥 **Priority 3: Reduce Magic Link Friction**

**Option A: Add Inline Signup to Landing Page**
Embed email capture directly on landing page (no redirect to /app/login)

**Option B: Add "Express Signup" for Ad Traffic**
- Show a more streamlined version for users coming from ads
- Pre-fill email if possible (LinkedIn can pass this)
- Skip terms checkbox (move to footnote with "By signing up, you agree to...")
- Use invisible captcha instead of visible one

**Option C: LinkedIn Lead Gen Forms (Test This)**
Create a separate campaign using LinkedIn's native forms:
- User fills form without leaving LinkedIn
- No website visit required
- Then send magic link via email
- Expected conversion rate: 15-30% (3-6x better)

### 🔴 **Priority 4: Add Exit-Intent Popup**

When user moves mouse to close tab/leave page:
```
┌───────────────────────────────────┐
│  Wait! Before you go...           │
│                                   │
│  Get 5 free AI responses          │
│  No credit card required          │
│                                   │
│  [Email input]                    │
│  [Claim Your Free Emails]         │
└───────────────────────────────────┘
```

This can recover 5-15% of abandoning visitors.

---

## A/B Testing Strategy

### How to Implement A/B Tests

**Tools to use:**
1. **Vercel Edge Middleware** (already using Vercel)
2. **PostHog** (open source, free tier)
3. **Google Optimize** (free)
4. **Growthbook** (open source)

**Recommendation:** Use Vercel Edge Middleware + simple cookie-based variant assignment

### Test 1: Dedicated Landing Page vs. Homepage

**Control (A):** Current homepage
**Variant (B):** New dedicated landing page `/lp/linkedin`

**Split:** 50/50
**Traffic:** LinkedIn ad clicks only
**Duration:** 7-14 days or 100 conversions
**Primary metric:** Signup conversion rate
**Secondary metrics:** Bounce rate, time on page, scroll depth

**How to implement:**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const url = request.nextUrl

  // Detect LinkedIn traffic
  if (url.searchParams.get('utm_source') === 'linkedin') {
    // Assign variant (50/50 split)
    const variant = Math.random() < 0.5 ? 'control' : 'variant'

    if (variant === 'variant') {
      return NextResponse.rewrite(new URL('/lp/linkedin', request.url))
    }
  }

  return NextResponse.next()
}
```

**Expected result:** Variant B should see 2-4x higher conversion rate

---

### Test 2: CTA Copy

**Control (A):** "Start Free"
**Variant B:** "Get 5 Free Emails"
**Variant C:** "Try Aidly Free - No CC"
**Variant D:** "See Aidly in Action"

**Split:** 25/25/25/25
**Duration:** 7 days or 50 conversions per variant
**Primary metric:** Click-through rate on CTA

**Expected result:** Variant B or C should win (more specific value prop)

---

### Test 3: Form Placement

**Control (A):** CTA button → redirect to /app/login
**Variant B:** Email input directly on landing page (no redirect)

**Split:** 50/50
**Duration:** 7-14 days
**Primary metric:** Form submission rate

**Expected result:** Variant B should see 30-50% higher conversion

---

### Test 4: Social Proof Position

**Control (A):** Testimonial in middle of page
**Variant B:** Testimonial near hero CTA
**Variant C:** Multiple mini-testimonials throughout page

**Split:** 33/33/33
**Duration:** 14 days
**Primary metric:** Conversion rate

---

### Test 5: Pricing Visibility

**Control (A):** Pricing below the fold (current)
**Variant B:** Pricing cards visible immediately in hero section
**Variant C:** Pricing sidebar that follows scroll

**Split:** 33/33/33
**Duration:** 14 days
**Primary metric:** Conversion rate

**Hypothesis:** For B2B, transparent pricing builds trust → higher conversion

---

### Test 6: Magic Link Alternative

**Control (A):** Magic link only
**Variant B:** Magic link + Google OAuth button
**Variant C:** LinkedIn OAuth (seamless for LinkedIn ad traffic)

**Split:** 33/33/33
**Duration:** 14 days
**Primary metric:** Signup completion rate

**Expected result:** LinkedIn OAuth should win for LinkedIn traffic (fewer steps)

---

## Quick Wins (Implement Today)

### 1. Add UTM Parameters to Ads
Update LinkedIn ads to include:
```
https://aidly.me?utm_source=linkedin&utm_medium=cpc&utm_campaign=website-visits-jan-2026
```

This lets you:
- Track ad traffic in analytics
- Show different copy to ad visitors
- Measure which ads convert best

### 2. Change "Sign in" → "Get Started" for New Users

In `/app/login/page.tsx`, detect if user has `?ref=ad` or `?utm_source=linkedin`:

```typescript
// Check if coming from ad
const isNewUser = searchParams?.get('utm_source') === 'linkedin' ||
                  searchParams?.get('ref') === 'ad'

const heading = isNewUser ? 'Get Your 5 Free Emails' : 'Sign in'
const subheading = isNewUser
  ? 'Enter your email to start - no credit card required'
  : 'We'll email you a magic link to sign in.'
```

### 3. Add "What Happens Next" on Signup Page

After user enters email, show:
```
✓ Step 1: Check your email for a secure link
✓ Step 2: Click the link to access Aidly
✓ Step 3: Start drafting AI responses in 2 minutes
```

This reduces anxiety and abandonment.

### 4. Add LinkedIn-Specific CTA Copy

In landing page CTAs for LinkedIn traffic:
```
"Get 5 Free Emails" instead of "Start Free"
```

More specific = higher conversion.

---

## Measurement Plan

### Metrics to Track (Add to Your Dashboard)

1. **Ad Click → Landing Page Load:** Should be 95%+
2. **Landing Page → Signup Page:** Target 30%+
3. **Signup Page → Email Submitted:** Target 60%+
4. **Email Submitted → Magic Link Clicked:** Target 70%+
5. **Magic Link → Successful Login:** Should be 95%+

**Overall target:** 12-18% conversion from ad click to successful signup

### Tools You Need

1. **Google Analytics 4** - Track full funnel
2. **Hotjar or Microsoft Clarity** - Session recordings (see where users drop off)
3. **LinkedIn Conversion Tracking** - Already set up ✅
4. **PostHog** - Free alternative to Mixpanel for funnels

---

## Implementation Roadmap

### Week 1: Foundation
- [ ] Add UTM parameters to all LinkedIn ads
- [ ] Create `/lp/linkedin` dedicated landing page
- [ ] Update signup page copy for ad traffic
- [ ] Install session recording tool (Hotjar/Clarity)

### Week 2: Test Setup
- [ ] Deploy A/B test: Homepage vs. Dedicated LP
- [ ] Deploy CTA copy test
- [ ] Set up funnel tracking in analytics

### Week 3: Optimization
- [ ] Review first test results
- [ ] Implement winning variant site-wide
- [ ] Launch form placement test
- [ ] Launch social proof position test

### Week 4: Polish
- [ ] Add exit-intent popup
- [ ] Test magic link alternatives
- [ ] Optimize for mobile (check mobile conversion rate)

---

## Expected Results

### Current State
- Ad clicks: 10
- Conversions: 0
- Conversion rate: 0%
- Cost per conversion: ∞

### After Fixes (Conservative)
- Ad clicks: 100 (same budget, optimized over time)
- Conversions: 8-12
- Conversion rate: 8-12%
- Cost per conversion: €100-156

### After Fixes (Optimistic)
- Ad clicks: 100
- Conversions: 15-18
- Conversion rate: 15-18%
- Cost per conversion: €69-83

---

## Next Steps

1. **Today:** Update LinkedIn ads with UTM parameters
2. **This week:** Create dedicated landing page at `/lp/linkedin`
3. **Next week:** Deploy first A/B test
4. **Ongoing:** Analyze conversion data from LinkedIn pixel

Want me to help implement any of these fixes?
