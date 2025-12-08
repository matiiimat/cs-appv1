-- Migration 002: Fix Email Handling
-- Convert emails to CITEXT and add unique constraints

BEGIN;

-- Check for duplicate emails before enforcing uniqueness
-- This will show us any duplicates that need resolving
\echo 'Checking for duplicate emails...'
SELECT LOWER(email) AS email_lc, COUNT(*) as duplicate_count
FROM users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Convert user emails to CITEXT (case-insensitive)
-- This eliminates the need for LOWER(email) in queries
ALTER TABLE users ALTER COLUMN email TYPE citext;

-- Add unique constraint on emails (globally unique)
-- This prevents duplicate accounts and speeds up auth lookups
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Also add unique constraint for organization domains if they exist
-- (PostgreSQL partial unique index syntax)
CREATE UNIQUE INDEX organizations_domain_unique
  ON organizations (domain) WHERE domain IS NOT NULL;

COMMIT;

\echo 'Migration 002 completed - email handling improved'
\echo 'Benefits: Case-insensitive emails, duplicate prevention, faster auth'