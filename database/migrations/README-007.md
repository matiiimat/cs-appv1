# Migration 007: Add inbound_message_id for Spam Prevention

## Purpose
This migration adds the `inbound_message_id` column to the `messages` table to enable spam prevention. Only messages created from inbound emails (via SendGrid webhook) will have this field set, allowing us to block API-created messages from being sent as spam.

## To Apply Migration

### Option 1: Using psql
```bash
psql $DATABASE_URL -f database/migrations/007-add-inbound-message-id.sql
```

### Option 2: Using your database client
Execute the SQL in `007-add-inbound-message-id.sql`

### Option 3: Neon Dashboard
1. Go to your Neon dashboard
2. Open SQL Editor
3. Copy and paste the contents of `007-add-inbound-message-id.sql`
4. Run the query

## Verification
After applying, verify the column exists:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages' AND column_name = 'inbound_message_id';
```

Expected result:
```
 column_name        | data_type | is_nullable
--------------------+-----------+-------------
 inbound_message_id | text      | YES
```

## Testing After Migration

### Test 1: Block spam attempt (should fail with 403)
```bash
# Create message without inbound_message_id
MESSAGE_ID=$(curl -s -X POST http://localhost:3000/api/messages \
  -H 'Content-Type: application/json' \
  -H "Cookie: better-auth.session_token=$AUTH_COOKIE" \
  -d '{"customer_name":"Test","customer_email":"test@test.com","subject":"Test","message":"Test"}' \
  | jq -r '.message.id')

# Try to send (should be BLOCKED)
curl -X PUT http://localhost:3000/api/messages \
  -H 'Content-Type: application/json' \
  -H "Cookie: better-auth.session_token=$AUTH_COOKIE" \
  -d "{\"id\":\"${MESSAGE_ID}\",\"status\":\"sent\"}"

# Expected: {"error":"Cannot send outbound email without prior inbound message","code":"OUTBOUND_ONLY_NOT_ALLOWED"}
```

### Test 2: Allow legitimate reply (should succeed)
```bash
# Simulate inbound email via webhook
curl -X POST http://localhost:3000/api/email/inbound/sendgrid \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "your-org@yourdomain.com",
    "from": "customer@example.com",
    "subject": "Need help",
    "text": "I have a question"
  }'

# Check database for the message (should have inbound_message_id set)
# Then try to send reply via your UI - should work!
```

## Rollback (if needed)
```sql
ALTER TABLE messages DROP COLUMN IF EXISTS inbound_message_id;
DROP INDEX IF EXISTS idx_messages_inbound_message_id;
```
