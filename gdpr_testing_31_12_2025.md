# GDPR Testing Steps

**Date:** December 31, 2025
**Version:** 1.0

## Overview

This document outlines testing procedures for Aidly's GDPR compliance features:
- PII Anonymization before AI processing
- Data Export (Article 20 - Right to Data Portability)
- Account Deletion (Article 17 - Right to Erasure)

---

## Prerequisites

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Have a test account ready (preferably a throwaway for deletion testing)

3. Get your session cookie from browser DevTools:
   - Open DevTools > Application > Cookies
   - Copy the value of `better-auth.session_token`

---

## 1. Test PII Anonymization (in generate-response)

### Via UI:

1. Go to **Settings > Setup** and ensure you have an AI config (API key)

2. Create or receive a test message with PII in the body:
   - Customer Name: "John Smith"
   - Customer Email: "john@example.com"
   - Message body:
     ```
     Hi, I'm John Smith, my phone is 555-123-4567,
     SSN 123-45-6789, and my email is john@example.com
     ```

3. Click **"Generate Response"**

4. Check server logs for:
   ```
   [PII] Anonymized 4 PII items before sending to AI
   ```

5. Verify in logs that the AI prompt shows placeholders:
   ```
   [NAME_1], [EMAIL_1], [PHONE_1], [SSN_1]
   ```

6. Verify the returned response has original values restored (rehydrated)

### Expected Behavior:
- PII is replaced with `[TYPE_N]` placeholders before AI call
- AI response contains placeholders
- Final response shown to user has original values restored

---

## 2. Test Data Export

### Via curl:

```bash
# GET - Check export availability
curl -X GET http://localhost:3000/api/gdpr/export \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"
```

**Expected response:**
```json
{
  "available": true,
  "canExport": true,
  "stats": {
    "messageCount": 10,
    "userCount": 1,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

```bash
# POST - Trigger export (admin only)
curl -X POST http://localhost:3000/api/gdpr/export \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
  -o data-export.json
```

### Via UI:

1. Go to **Settings > Privacy & Data**
2. Click **"Export My Data"**
3. A JSON file should download automatically

### Verify Export Contents:

Open `data-export.json` and verify:
- [ ] `exportedAt` timestamp is present
- [ ] `organization` object contains id, name, planType, planStatus
- [ ] `users` array lists all org users with email, name, role
- [ ] `messages` array has decrypted values for:
  - `customerName` (not encrypted gibberish)
  - `customerEmail` (not encrypted gibberish)
  - `subject` (not encrypted gibberish)
  - `message` (not encrypted gibberish)
- [ ] `settings` does NOT contain API keys or sensitive config
- [ ] `activityLog` shows recent activity
- [ ] `knowledgeBase` entries are present if any exist

---

## 3. Test Account Deletion

> **WARNING:** This will permanently delete all data. Use a test account!

### Via curl:

```bash
# GET - Check deletion eligibility
curl -X GET http://localhost:3000/api/gdpr/delete-account \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"
```

**Expected response:**
```json
{
  "canDelete": true,
  "reason": null,
  "stats": {
    "messageCount": 10,
    "userCount": 1,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

```bash
# POST - Attempt WITHOUT confirmation (should fail)
curl -X POST http://localhost:3000/api/gdpr/delete-account \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected response (400):**
```json
{
  "error": "Deletion confirmation required. Set confirmDelete: true in request body."
}
```

```bash
# POST - With confirmation (WILL DELETE EVERYTHING!)
curl -X POST http://localhost:3000/api/gdpr/delete-account \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmDelete": true}'
```

**Expected response (200):**
```json
{
  "success": true,
  "message": "Your account and all associated data have been permanently deleted.",
  "deletedAt": "2025-12-31T12:00:00.000Z",
  "stats": {
    "messagesDeleted": 10,
    "usersDeleted": 1
  }
}
```

### Via UI:

1. Go to **Settings > Privacy & Data**
2. Click **"Delete Account"**
3. Type the organization name in the confirmation dialog
4. Click **"Delete Forever"**

### Post-Deletion Verification:

- [ ] User is logged out / session invalidated
- [ ] Attempting to access `/app` redirects to login
- [ ] Database tables no longer contain org data:
  ```sql
  SELECT * FROM organizations WHERE id = 'deleted-org-id';
  SELECT * FROM users WHERE organization_id = 'deleted-org-id';
  SELECT * FROM messages WHERE organization_id = 'deleted-org-id';
  ```

---

## 4. Test Rate Limiting

```bash
# Run 6+ export requests rapidly - 6th should get 429
for i in {1..7}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    -X POST http://localhost:3000/api/gdpr/export \
    -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"
done
```

**Expected output:**
```
Request 1: 200
Request 2: 200
Request 3: 200
Request 4: 200
Request 5: 200
Request 6: 429
Request 7: 429
```

### Verify 429 Response Headers:
```bash
curl -v -X POST http://localhost:3000/api/gdpr/export \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" 2>&1 | grep -E "(HTTP|Retry-After|X-RateLimit)"
```

Should include:
- `Retry-After: <seconds>`
- `X-RateLimit-Limit: 5`
- `X-RateLimit-Remaining: 0`

---

## 5. Test Admin Authorization

### Setup:
1. Create a non-admin user in the same organization (requires direct DB insert for now)
   ```sql
   INSERT INTO users (organization_id, email, name, role, is_active)
   VALUES ('your-org-id', 'agent@example.com', 'Agent User', 'agent', true);
   ```

2. Log in as the non-admin user and get their session token

### Test Export as Non-Admin:
```bash
curl -X POST http://localhost:3000/api/gdpr/export \
  -H "Cookie: better-auth.session_token=NON_ADMIN_SESSION_TOKEN"
```

**Expected response (403):**
```json
{
  "error": "Only organization administrators can export data"
}
```

### Test Delete as Non-Admin:
```bash
curl -X POST http://localhost:3000/api/gdpr/delete-account \
  -H "Cookie: better-auth.session_token=NON_ADMIN_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmDelete": true}'
```

**Expected response (403):**
```json
{
  "error": "Only organization administrators can delete the account"
}
```

---

## 6. Verify Server Audit Logs

Check your terminal for audit logs during testing:

```
[GDPR] Data export requested by user <userId> for organization: <orgId>
[GDPR] Data export completed for organization: <orgId>
[GDPR] Account deletion requested by user <userId> for organization: <orgId>
[GDPR] Account deletion completed for organization: <orgId>. Deleted X messages, Y users.
```

---

## 7. Test PII Patterns Coverage

Create test messages with various PII formats to verify detection:

| PII Type | Test Values |
|----------|-------------|
| Email | `test@example.com`, `user.name+tag@domain.co.uk` |
| US Phone | `555-123-4567`, `(555) 123-4567`, `+1 555 123 4567` |
| Intl Phone | `+33 6 12 34 56 78`, `+44 20 7946 0958` |
| SSN | `123-45-6789`, `123 45 6789` |
| Credit Card | `4111-1111-1111-1111`, `4111111111111111` |
| US ZIP | `12345`, `12345-6789` |
| Names | (from form field - case insensitive matching) |

---

## Checklist Summary

### Core Features
- [ ] PII anonymization works before AI calls
- [ ] PII rehydration works in AI responses
- [ ] Data export downloads complete JSON
- [ ] Exported data has decrypted PII fields
- [ ] Export excludes sensitive settings (API keys)
- [ ] Account deletion requires confirmation
- [ ] Account deletion removes all org data
- [ ] Post-deletion user is logged out

### Security
- [ ] Rate limiting blocks excessive requests (429)
- [ ] Non-admin users get 403 on export
- [ ] Non-admin users get 403 on delete
- [ ] Audit logs record all GDPR operations

### UI/UX
- [ ] Privacy & Data section appears in Settings
- [ ] Export button triggers download
- [ ] Delete confirmation requires org name
- [ ] Error messages are user-friendly

---

## Notes

- Rate limit for GDPR operations: 5 requests per 15 minutes (auth tier)
- Admin = first user who signed up for the organization
- Deletion is immediate and permanent (no grace period)
- Export includes last 1000 activity log entries for performance
