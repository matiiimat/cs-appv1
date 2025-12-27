# Database Branching Guide for Safe Testing

## Overview

Before making schema changes (like the usage limits feature), we create a database branch so:
- **Production stays untouched** until we're confident
- **Testing uses a full copy** of real data
- **Rollback is instant** - just delete the branch

---

## Option 1: Neon Branching (Recommended)

Neon supports instant database branching with copy-on-write. This is the cleanest approach.

### Step-by-Step

#### 1. Create a Test Branch in Neon Console

1. Go to [Neon Console](https://console.neon.tech/)
2. Select your project: `ep-purple-scene-agsa4l3a`
3. Click **Branches** in the left sidebar
4. Click **Create Branch**
5. Configure:
   - **Name:** `dev-usage-limits`
   - **Parent branch:** `main` (your current production branch)
   - **Include data up to:** `Head` (current state)
6. Click **Create Branch**

#### 2. Get the New Connection String

After branch creation:
1. Click on the new branch `dev-usage-limits`
2. Go to **Connection Details**
3. Copy the connection string (it will have `-br-dev-usage-limits` in the hostname)

Example:
```
postgresql://neondb_owner:npg_xxx@ep-purple-scene-agsa4l3a-br-dev-usage-limits.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

#### 3. Update Local Environment

Edit `.env.local`:

```bash
# PRODUCTION DATABASE - DO NOT USE FOR TESTING
# DATABASE_URL=postgresql://neondb_owner:npg_rsFe46fzlENc@ep-purple-scene-agsa4l3a-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# TEST BRANCH - Safe for migrations and testing
DATABASE_URL=postgresql://neondb_owner:npg_xxx@ep-purple-scene-agsa4l3a-br-dev-usage-limits-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

#### 4. Verify Connection

```bash
# Test the connection
npm run dev
# Check logs for "New database client connected"
```

#### 5. Run Migrations on Test Branch

```bash
# Now safe to run migrations
npm run db:migrate
# Or manually:
psql "$DATABASE_URL" -f database/migrations/004-usage-tracking.sql
```

---

## Working with Branches

### Check Which Database You're Connected To

Add this to any API route temporarily or run in psql:

```sql
SELECT current_database(), inet_server_addr();
```

Or check the Neon console - it shows active connections per branch.

### Switch Between Branches

Simply change `DATABASE_URL` in `.env.local`:

```bash
# To use production (careful!)
DATABASE_URL=postgresql://...@ep-purple-scene-agsa4l3a-pooler...

# To use test branch
DATABASE_URL=postgresql://...@ep-purple-scene-agsa4l3a-br-dev-usage-limits-pooler...
```

Restart your dev server after changing.

### Merge Changes to Production

Once testing is complete:

1. **Document the exact migration SQL** that was run on test branch
2. **Run the same migration on production branch**:
   ```bash
   # Switch to production DATABASE_URL
   psql "$DATABASE_URL" -f database/migrations/004-usage-tracking.sql
   ```
3. **Deploy code to Vercel** (it's already pointing to production)

### Delete Test Branch (Cleanup)

After successful production migration:
1. Go to Neon Console → Branches
2. Click on `dev-usage-limits`
3. Click **Delete Branch**

---

## Option 2: Manual Database Copy (Alternative)

If you prefer not to use Neon branching:

### Create a New Neon Project for Testing

1. In Neon Console, click **New Project**
2. Name it: `aidly-test`
3. Get connection string
4. Dump production data and restore to test:

```bash
# Export from production
pg_dump "$PROD_DATABASE_URL" > backup.sql

# Import to test database
psql "$TEST_DATABASE_URL" < backup.sql
```

### Pros/Cons vs Branching

| Aspect | Neon Branching | Separate Project |
|--------|----------------|------------------|
| Setup time | Instant | 5-10 minutes |
| Storage cost | Free (copy-on-write) | Full copy cost |
| Data freshness | Exact snapshot | Manual sync needed |
| Isolation | Same project | Different project |

---

## Environment Configuration Summary

### Local Development (Testing)

`.env.local`:
```bash
DATABASE_URL=postgresql://...@ep-xxx-br-dev-usage-limits-pooler.../neondb
STRIPE_SECRET_KEY=sk_test_xxx
APP_URL=http://localhost:3000
```

### Production (Vercel)

Vercel Environment Variables:
```bash
DATABASE_URL=postgresql://...@ep-xxx-pooler.../neondb  # Main branch
STRIPE_SECRET_KEY=sk_live_xxx
APP_URL=https://www.aidly.me
```

---

## Rollback Procedures

### If Migration Breaks Test Branch

Just delete the branch and create a new one from main:
1. Neon Console → Branches → Delete `dev-usage-limits`
2. Create new branch from `main`
3. Start fresh

### If Migration Breaks Production

If you accidentally ran migrations on production:

```sql
-- Reverse migration for usage limits feature
DROP TABLE IF EXISTS organization_usage;
ALTER TABLE organizations DROP COLUMN IF EXISTS monthly_email_limit;
```

---

## Checklist Before Production Migration

- [ ] Feature fully tested on test branch
- [ ] All edge cases verified
- [ ] Migration SQL reviewed and documented
- [ ] Rollback SQL prepared
- [ ] Vercel deployment ready
- [ ] Monitoring/alerts in place
- [ ] Team notified of deployment window

---

## Quick Reference

| Task | Command/Action |
|------|----------------|
| Create branch | Neon Console → Branches → Create |
| Switch to test | Update `DATABASE_URL` in `.env.local` |
| Run migration | `npm run db:migrate` |
| Check connection | `SELECT current_database()` |
| Delete branch | Neon Console → Branch → Delete |
| Production deploy | Update prod `DATABASE_URL`, run migration |
