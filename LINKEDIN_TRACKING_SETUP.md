# LinkedIn Conversion Tracking Setup

## What Was Installed

### 1. LinkedIn Insight Tag (Base Pixel)
**Location:** `app/layout.tsx`
- Installed on every page of aidly.me
- Tracks all page views automatically
- Partner ID: 9242769

### 2. Signup Conversion Tracking
**Location:** `app/app/(protected)/layout-client.tsx`
- Fires when a user successfully signs up and lands in `/app` (protected area)
- Tracks only NEW signups (not returning users)
- Uses localStorage to prevent duplicate conversion tracking
- Conversion ID: 9242769

## How It Works

1. **User clicks LinkedIn ad** → lands on aidly.me
2. **Insight Tag loads** → LinkedIn tracks the visit
3. **User enters email** → clicks "Send magic link"
4. **User opens email** → clicks magic link
5. **User lands in `/app`** → Conversion fires automatically
6. **LinkedIn records conversion** → attributes it to the ad click

## Testing the Implementation

### Test Locally (Development)

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Open browser DevTools (F12) → Console tab

3. Visit http://localhost:3000

4. Check console for LinkedIn Insight Tag:
   ```
   You should see requests to snap.licdn.com
   ```

5. Sign up with a new email address

6. After magic link login, check console for:
   ```
   [LinkedIn] Signup conversion tracked
   ```

### Test in Production

1. Deploy to production:
   ```bash
   git add -A
   git commit -m "Add LinkedIn conversion tracking"
   git push
   ```

2. Visit https://aidly.me in an **incognito window**

3. Open DevTools → Network tab → Filter by "licdn"

4. You should see:
   - `insight.min.js` loaded
   - Requests to `px.ads.linkedin.com/collect`

5. Complete a test signup

6. After landing in `/app`, check:
   - Console should show: `[LinkedIn] Signup conversion tracked`
   - Network tab should show a new request to LinkedIn with conversion data

### Verify in LinkedIn Campaign Manager

1. Go to LinkedIn Campaign Manager: https://www.linkedin.com/campaignmanager

2. Navigate to **Account Assets** → **Insight Tag**

3. Check tag status:
   - Should show "Active" with recent activity
   - May take 24-48 hours for first data to appear

4. Set up conversion tracking:
   - Go to **Account Assets** → **Conversions**
   - Click **Create conversion**
   - Name: "Signup" or "Registration"
   - Conversion type: Sign up
   - Attribution window: 30 days (recommended)
   - Click **Create**

5. Add conversion to campaign:
   - Go to your campaign
   - Edit campaign settings
   - Under "Conversion tracking", select your "Signup" conversion
   - Save changes

## Expected Results

### Immediate (After Deployment)
- Insight Tag should appear as "Active" in LinkedIn within 24 hours
- You should see page view data in LinkedIn Campaign Manager

### After First Conversion (1-7 days)
- First signup conversion should appear in LinkedIn
- You'll see "1 conversion" in your campaign dashboard

### After Optimization Period (7-14 days)
- LinkedIn's algorithm learns who converts
- Campaign optimization improves
- You should see better CTR and lower cost per conversion

## Update Your Campaign Settings

**IMPORTANT:** You need to tell LinkedIn to optimize for conversions:

1. Go to Campaign Manager → Your Campaign
2. Click **Edit** on campaign settings
3. Change **Campaign objective** from "Website visits" to "Website conversions"
4. Or keep "Website visits" but add conversion tracking to measure results
5. Save changes

## Troubleshooting

### Insight Tag Not Loading
- Check browser console for errors
- Verify Partner ID 9242769 is in the code
- Try clearing browser cache
- Check ad blockers aren't blocking snap.licdn.com

### Conversions Not Tracking
- Check localStorage: Open DevTools → Application → Local Storage → Look for `aidly_signup_tracked`
- Clear localStorage and try signup again
- Verify `window.lintrk` exists: Type `window.lintrk` in console
- Check console for `[LinkedIn] Signup conversion tracked` message

### LinkedIn Shows No Data
- Wait 24-48 hours for data to appear
- Ensure you're viewing the correct date range
- Check that ad is still running and getting impressions
- Verify conversion is properly linked to campaign

## Important Notes

1. **Test with real signups:** LinkedIn won't track test conversions in dev mode
2. **Deploy to production:** Tracking only works on your live domain (aidly.me)
3. **Wait 24-48 hours:** LinkedIn data has a delay
4. **Don't track twice:** The code prevents duplicate tracking with localStorage
5. **Privacy compliance:** Insight Tag is GDPR compliant, but ensure your privacy policy mentions LinkedIn tracking

## Next Steps

1. ✅ Deploy the code to production
2. ✅ Test with a real signup
3. ✅ Create conversion in LinkedIn Campaign Manager
4. ✅ Link conversion to your campaign
5. ✅ Wait 48 hours for optimization data
6. ✅ Review cost per conversion metrics
7. ✅ Optimize ad creative based on conversion data
