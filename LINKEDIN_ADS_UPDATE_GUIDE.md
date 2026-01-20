# LinkedIn Ads Update Guide

## What We Just Built

✅ **Created `/lp/linkedin` - Dedicated landing page for LinkedIn ads**
- Matches ad message exactly ("Cut Email Response Time Without Hiring")
- Email signup form embedded (no redirect friction)
- No navigation distractions
- Clear value prop: "Get 5 Free AI Responses"
- Social proof and trust signals visible
- Optimized for conversion

✅ **Updated `/app/login` - Better copy for ad traffic**
- Detects users coming from ads via UTM parameters
- Shows "Get Your 5 Free Emails" instead of "Sign in"
- Lists benefits to reduce anxiety

---

## How to Update Your LinkedIn Ads (Step-by-Step)

### Step 1: Update Ad URLs

Go to LinkedIn Campaign Manager → Your Campaign → Edit Ads

**Current URL (❌ Don't use):**
```
https://www.aidly.me
or
http://aidly.me
```

**New URL (✅ Use this):**
```
https://aidly.me/lp/linkedin?utm_source=linkedin&utm_medium=cpc&utm_campaign=website-visits-jan-2026&utm_content=ad1
```

### Breakdown of UTM Parameters:

- `utm_source=linkedin` - Identifies traffic as coming from LinkedIn
- `utm_medium=cpc` - Identifies as paid click traffic (triggers special copy)
- `utm_campaign=website-visits-jan-2026` - Your campaign name (change if needed)
- `utm_content=ad1` - Identifies which specific ad (use `ad2`, `ad3` for other ads)

### Step 2: Update Both Ads

**For Ad_1_8Jan2026:**
```
https://aidly.me/lp/linkedin?utm_source=linkedin&utm_medium=cpc&utm_campaign=website-visits-jan-2026&utm_content=ad1
```

**For Ad_2_8Jan2026:**
```
https://aidly.me/lp/linkedin?utm_source=linkedin&utm_medium=cpc&utm_campaign=website-visits-jan-2026&utm_content=ad2
```

This lets you track which ad converts better!

---

## What Happens Now

### User Journey Before:
```
LinkedIn Ad → Homepage → Scroll → Click "Start Free" →
/app/login → Enter email → Check terms → Captcha →
Wait for email → Click link → /app

❌ 10+ steps, lots of drop-off
```

### User Journey After:
```
LinkedIn Ad → /lp/linkedin → Enter email directly →
Email sent → Click link → /app

✅ 4 steps, much simpler
```

---

## Testing Your Changes

### 1. Test Locally First

Start dev server:
```bash
npm run dev
```

Visit in browser:
```
http://localhost:3000/lp/linkedin?utm_source=linkedin&utm_medium=cpc
```

**What to check:**
- ✅ Page loads correctly
- ✅ Form visible and working
- ✅ Email submission works
- ✅ Success message shows after submit
- ✅ No console errors

### 2. Test in Production (After Deploy)

Visit in **incognito mode**:
```
https://aidly.me/lp/linkedin?utm_source=linkedin&utm_medium=cpc
```

Complete a test signup with your own email and verify:
- ✅ Email arrives quickly
- ✅ Magic link works
- ✅ Lands in /app successfully

### 3. Test the Signup Page

Visit:
```
https://aidly.me/app/login?utm_source=linkedin
```

Check that it shows:
- ✅ "Get Your 5 Free Emails" (not "Sign in")
- ✅ List of benefits visible
- ✅ Better copy for new users

---

## Expected Results

### Before (Current Setup)
- 10 clicks → 0 conversions
- 0% conversion rate
- Cost per conversion: ∞
- Can't tell which ad works

### After (New Setup)
- Expected: 8-18% conversion rate
- 100 clicks → 8-18 signups
- Cost per conversion: €69-156
- Can track which ad (ad1 vs ad2) converts better

---

## Monitoring Performance

### In LinkedIn Campaign Manager

After 24-48 hours with the new URL, check:

1. **Conversions column** - Should show signups (once pixel is verified)
2. **Cost per conversion** - Target: Under €100
3. **Conversion rate** - Target: 8%+

### Compare Ad Performance

After 50+ clicks on each ad, compare `ad1` vs `ad2`:
- Which has better CTR?
- Which has better conversion rate?
- Which has lower cost per conversion?

Pause the losing ad and create new variants based on the winner.

---

## Common Issues & Fixes

### Issue: "Page not found" when visiting /lp/linkedin

**Fix:** You need to deploy the code first
```bash
git add -A
git commit -m "Add dedicated LinkedIn landing page"
git push
```

Wait 2-5 minutes for Vercel deployment to complete.

---

### Issue: Signup form shows "Sign in" instead of "Get Your 5 Free Emails"

**Fix:** Make sure URL includes UTM parameters:
```
?utm_source=linkedin&utm_medium=cpc
```

---

### Issue: Email not sending from landing page

**Check:**
1. Is your API `/api/auth/sign-in/guarded` working?
2. Test by visiting `/app/login` and trying signup there
3. Check browser console for errors (F12)

---

## Deployment Checklist

Before updating LinkedIn ads:

- [ ] Deploy code to production
- [ ] Test `/lp/linkedin` loads correctly in production
- [ ] Test email submission works
- [ ] Test magic link arrives and works
- [ ] Update both LinkedIn ad URLs with UTM parameters
- [ ] Wait 24 hours for first results
- [ ] Check LinkedIn conversions are tracking

---

## Next Steps After This

1. **Today:** Deploy and test
2. **Tomorrow:** Update LinkedIn ad URLs
3. **48 hours:** Check first conversion data
4. **1 week:** Review performance, pause losing ad
5. **2 weeks:** Create new ad variants based on winners

---

## Rollback Plan

If something goes wrong, you can instantly revert:

**Option 1: Point ads back to homepage**
```
https://aidly.me
```

**Option 2: Point to regular login**
```
https://aidly.me/app/login?utm_source=linkedin&utm_medium=cpc
```

This will still show the improved copy even without the landing page.

---

## Questions?

Common questions:

**Q: Should I pause my ads while updating URLs?**
A: No need. You can update URLs while ads are running. Changes take effect immediately.

**Q: Will I lose my ad performance data?**
A: No. LinkedIn keeps all historical data even when you update URLs.

**Q: What if the landing page doesn't convert better?**
A: You can always revert to the homepage. But based on best practices, the dedicated page should perform 2-4x better.

**Q: How long should I test before making changes?**
A: Wait for at least 50 clicks or 7 days, whichever comes first.

---

## Ready to Deploy?

Run these commands:

```bash
# Commit the changes
git add -A
git commit -m "Add LinkedIn landing page and improve signup copy for ads"

# Push to production
git push
```

Then update your LinkedIn ad URLs and watch the conversions roll in! 🚀
