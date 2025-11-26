# Database Upgrade Notes (for Dimitris)

This document summarizes issues found in the current schema and proposes non‑breaking indexing and cleanup recommendations to improve performance, correctness, and maintainability. No changes have been applied yet; this is a plan.

## Goals
- Speed up common queries (auth, listing, filtering, joins).
- Remove ambiguity (duplicate concepts, status mismatch).
- Prepare for scale (ticket IDs, email lookups, activity feeds).
- Clarify security boundaries (RLS policies vs app-level isolation).

## Key Findings
- Email lookup uses `LOWER(email)` without uniqueness; ambiguous and slow at scale.
- Foreign keys exist but referencing columns lack indexes → expensive joins/filters.
- Message queries frequently filter/sort by `organization_id`, `status`, `created_at`.
- Ticket ID generation uses `MAX(SUBSTRING(...))` per org → full scans, poor scalability.
- Redundant settings storage: `organizations.settings` (jsonb) AND `organization_settings.settings_data` (encrypted).
- Status mismatch between code and DB; and `ai_reviewed` (code) vs `auto_reviewed` (DB) drift.
- RLS is enabled globally but no policies are defined → either ineffective or confusing.

## Indexing Recommendations (SQL)
Apply these in a migration; names are suggestions.

### users
- Speed org filters:
```sql
CREATE INDEX idx_users_org ON users (organization_id);
```
- Enforce and speed email lookup (pick one model):
  - Global unique emails:
```sql
CREATE EXTENSION IF NOT EXISTS citext;
ALTER TABLE users ALTER COLUMN email TYPE citext;
CREATE UNIQUE INDEX users_email_unique ON users (email);
```
  - Or unique per org:
```sql
CREATE EXTENSION IF NOT EXISTS citext;
ALTER TABLE users ALTER COLUMN email TYPE citext;
CREATE UNIQUE INDEX users_org_email_unique ON users (organization_id, email);
```

### organizations
- If you route by domain:
```sql
CREATE UNIQUE INDEX organizations_domain_unique ON organizations (domain) WHERE domain IS NOT NULL;
```
- If you adopt org‑based billing, add and index `stripe_customer_id` / `stripe_subscription_id` (not present today).

### organization_settings
- Ensure one row per org:
```sql
ALTER TABLE organization_settings
  ADD CONSTRAINT organization_settings_organization_id_key UNIQUE (organization_id);
```

### messages
- Common filters/sorts:
```sql
CREATE INDEX messages_org_created_at ON messages (organization_id, created_at DESC);
CREATE INDEX messages_org_status_created_at ON messages (organization_id, status, created_at DESC);
CREATE INDEX messages_agent_id ON messages (agent_id);
-- Optional if you filter by metadata
-- CREATE INDEX messages_metadata_gin ON messages USING gin (metadata);
```

### activity_log
- Recent activity per org and joins:
```sql
CREATE INDEX activity_log_org_created_at ON activity_log (organization_id, created_at DESC);
CREATE INDEX activity_log_message_id ON activity_log (message_id);
CREATE INDEX activity_log_user_id ON activity_log (user_id);
```

### draft_replies
- Fast lookups by message/user:
```sql
CREATE INDEX draft_replies_message_id ON draft_replies (message_id);
CREATE INDEX draft_replies_user_id ON draft_replies (user_id);
```

## Ticket ID Scalability
Current approach: `MAX(CAST(SUBSTRING(ticket_id FROM 2) AS INTEGER))` by org → table scan, not index‑friendly.

Recommended: Use a per‑org counter and derive display IDs.
- Schema:
```sql
CREATE TABLE message_counters (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  next_id integer NOT NULL DEFAULT 1
);
```
- Atomic next ticket number (example):
```sql
CREATE OR REPLACE FUNCTION next_ticket_num(p_org uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE v_next integer; BEGIN
  INSERT INTO message_counters(organization_id) VALUES (p_org)
    ON CONFLICT (organization_id) DO NOTHING;
  UPDATE message_counters
     SET next_id = next_id + 1
   WHERE organization_id = p_org
  RETURNING next_id - 1 INTO v_next;
  RETURN v_next;
END; $$;
```
- App flow: call function to get numeric `n`, store it separately if desired, and format `ticket_id` as `'#' || LPAD(n::text, 6, '0')`.

## Schema Drift & Cleanup
- Message status values:
  - DB constraint: `pending/approved/rejected/edited/sent/review`
  - App enum: `new/to_send_queue/rejected/edited/sent/to_review_queue`
  - Action: unify on one set (update code or DB check) so indexes on `status` are effective and writes don’t fail.
- `ai_reviewed` vs `auto_reviewed`:
  - Action: standardize column and code. Either rename the column or map consistently; avoid double concepts.
- Settings duplication:
  - Action: choose one source of truth. If encrypted settings are the standard, migrate keys from `organizations.settings` and plan removal of that column; or invert and deprecate `organization_settings` if not needed.
- Ticket ID generation duplication:
  - You have both a DB function and app‑side generation. Action: keep one (prefer the counter approach above) and remove the other.

## Row‑Level Security (RLS)
- RLS is enabled, but no policies are defined. That yields:
  - No added safety (if you connect as owner/bypass), and confusion for maintainers.
  - Or unexpected blocks if you later change roles.
- Action: either
  - Define explicit per‑table policies enforcing `organization_id = current_setting('app.org_id')::uuid` (or similar session variable), or
  - Disable RLS to reflect that isolation is enforced in the app layer.

## Optional Quality Improvements
- Email handling: switching to `CITEXT` removes the need for `LOWER(email)` in queries and simplifies uniqueness.
- Partial indexes for hotspots, e.g. heavy queues:
```sql
CREATE INDEX messages_org_new_created_at
  ON messages (organization_id, created_at DESC)
  WHERE status = 'new';
```
- Foreign key delete behavior: consider `ON DELETE SET NULL` for `messages.agent_id` and `activity_log.user_id` to simplify user deletion.
- Billing correctness: Prefer org‑based gating (store Stripe IDs on `organizations` and check subscription by org) instead of email search.

## Rollout Order (Suggested)
1) Add safe indexes (no behavior change).
2) Introduce message counter + switch app to it; deprecate string‑scan.
3) Unify status enum and `ai_reviewed`/`auto_reviewed` naming.
4) Consolidate settings storage.
5) Decide and implement RLS strategy.
6) Optional: adopt `CITEXT` + enforce email uniqueness model.

---
Questions or want a migration drafted for these? I can produce a single SQL file covering indexes, counters, and enum alignment with minimal downtime.

## Proposed Migration SQL (paste into one or more migrations)

Note: Use the “dev-safe” block in development. For production, prefer the “CONCURRENTLY” variant for indexes (outside a transaction) to avoid long table locks.

### Preflight checks (run manually)
```sql
-- Find duplicate emails ignoring case
SELECT LOWER(email) AS email_lc, COUNT(*)
FROM users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Any nonstandard message statuses (sanity)
SELECT DISTINCT status FROM messages ORDER BY 1;
```

### Dev-safe migration (transactional; non-concurrent indexes)
```sql
BEGIN;

-- CITEXT for case-insensitive emails
CREATE EXTENSION IF NOT EXISTS citext;

-- Migrate users.email to citext (no-op if already citext)
ALTER TABLE users ALTER COLUMN email TYPE citext;

-- Global unique emails (fails if duplicates exist; resolve prior to running)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'users_email_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX users_email_unique ON users (email)';
  END IF;
END $$;

-- Speed common lookups
CREATE INDEX IF NOT EXISTS idx_users_org ON users (organization_id);

-- Organizations
CREATE UNIQUE INDEX IF NOT EXISTS organizations_domain_unique
  ON organizations (domain) WHERE domain IS NOT NULL;

-- One row per org in organization_settings
ALTER TABLE organization_settings
  ADD CONSTRAINT IF NOT EXISTS organization_settings_organization_id_key UNIQUE (organization_id);

-- Messages: composite indexes matching filters/sorts
CREATE INDEX IF NOT EXISTS messages_org_created_at
  ON messages (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_org_status_created_at
  ON messages (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_agent_id
  ON messages (agent_id);

-- Activity log
CREATE INDEX IF NOT EXISTS activity_log_org_created_at
  ON activity_log (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_message_id
  ON activity_log (message_id);
CREATE INDEX IF NOT EXISTS activity_log_user_id
  ON activity_log (user_id);

-- Draft replies
CREATE INDEX IF NOT EXISTS draft_replies_message_id
  ON draft_replies (message_id);
CREATE INDEX IF NOT EXISTS draft_replies_user_id
  ON draft_replies (user_id);

-- Align message status check (temporarily allow both old and new sets)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
ALTER TABLE messages
  ADD CONSTRAINT messages_status_check
  CHECK (
    status IN (
      'pending','approved','rejected','edited','sent','review',
      'new','to_send_queue','to_review_queue'
    )
  );

-- Align ai_reviewed column name (rename if old name exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='messages' AND column_name='auto_reviewed'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='messages' AND column_name='ai_reviewed'
  ) THEN
    EXECUTE 'ALTER TABLE messages RENAME COLUMN auto_reviewed TO ai_reviewed';
  END IF;
END $$;

COMMIT;
```

### Production-friendly index creation (CONCURRENTLY; run outside a transaction)
```sql
-- Users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org ON users (organization_id);
-- Organizations
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS organizations_domain_unique
  ON organizations (domain) WHERE domain IS NOT NULL;
-- Messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_org_created_at
  ON messages (organization_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_org_status_created_at
  ON messages (organization_id, status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_agent_id
  ON messages (agent_id);
-- Activity log
CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_log_org_created_at
  ON activity_log (organization_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_log_message_id
  ON activity_log (message_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_log_user_id
  ON activity_log (user_id);
-- Draft replies
CREATE INDEX CONCURRENTLY IF NOT EXISTS draft_replies_message_id
  ON draft_replies (message_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS draft_replies_user_id
  ON draft_replies (user_id);
```

### Ticket counter (introduce alongside code change)
```sql
-- Per-org message counters
CREATE TABLE IF NOT EXISTS message_counters (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  next_id integer NOT NULL DEFAULT 1
);

-- Atomic next ticket number
CREATE OR REPLACE FUNCTION next_ticket_num(p_org uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE v_next integer; BEGIN
  INSERT INTO message_counters(organization_id) VALUES (p_org)
    ON CONFLICT (organization_id) DO NOTHING;
  UPDATE message_counters
     SET next_id = next_id + 1
   WHERE organization_id = p_org
  RETURNING next_id - 1 INTO v_next;
  RETURN v_next;
END; $$;

-- Optional (after code change):
-- ALTER TABLE messages ADD COLUMN ticket_num integer;
-- UPDATE messages SET ticket_num = NULLIF(REGEXP_REPLACE(ticket_id, '^#', ''), '')::int;
-- ALTER TABLE messages ADD CONSTRAINT messages_org_ticket_num_unique UNIQUE (organization_id, ticket_num);
```

### RLS strategy (pick one)
```sql
-- Option A: disable RLS if isolation is app-enforced
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE draft_replies DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Option B: define org-based policies (example shown for messages)
-- Requires setting a session var: SELECT set_config('app.org_id', '<uuid>', true);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS messages_tenant_isolation ON messages;
CREATE POLICY messages_tenant_isolation ON messages
  USING (organization_id = current_setting('app.org_id')::uuid)
  WITH CHECK (organization_id = current_setting('app.org_id')::uuid);
```

### Post-migration follow-ups
- Resolve any duplicate emails before enabling the unique index.
- Switch app code to use `next_ticket_num()` for ticket creation.
- Align message status usage in code with the (union) check constraint, then later narrow it to a single set.
- Decide final source of truth for organization settings and plan a data move.
