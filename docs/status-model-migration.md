# Status Model & Workflow Migration Plan

This document describes how to implement the new, clearer message lifecycle for the SupportAI app. It replaces ambiguous statuses (e.g., "approved") with explicit, low-ambiguity states and separates AI processing state from the human workflow.

Goals
- Reduce ambiguity between approval and sending.
- Make triage vs. deep review explicit.
- Separate AI processing from human workflow state.
- Enforce consistency using DB enums and shared TS types.

New Data Model
- Primary status (single source of truth):
  - `incoming`: created, not AI-processed yet
  - `triage_ready`: AI has produced a draft; awaiting agent decision (current: pending + autoReviewed)
  - `needs_review`: escalated for deeper human review
  - `ready_to_send` (optional queue state): agent approved; queued if sending async
  - `sent`: delivered to customer
  - `discarded`: explicitly not sending (replaces "rejected")
- Auxiliary fields:
  - `ai_state`: `unprocessed | processing | ready | failed`
  - `last_action_at`: timestamp of last meaningful state transition (optional but recommended)
  - `edit_history`: unchanged; keep edits as activity, not a status

Current → New Mapping
- `pending` AND `auto_reviewed = false`:
  - `status = incoming`, `ai_state = CASE WHEN is_generating THEN 'processing' ELSE 'unprocessed' END`
- `pending` AND `auto_reviewed = true`:
  - `status = triage_ready`, `ai_state = 'ready'`
- `review` → `needs_review` (keep ai_state as is; usually `ready`)
- `approved` → `ready_to_send` (or `sent` if sending is immediate)
- `sent` → `sent`
- `rejected` → `discarded`
- `edited` → remove as a status (keep the prior base status, increment `edit_history`). If present, map conservatively to `needs_review`.

Database Changes (SQL)
1) Create enums and new columns
```sql
-- 1. Enums
CREATE TYPE message_status_enum AS ENUM (
  'incoming', 'triage_ready', 'needs_review', 'ready_to_send', 'sent', 'discarded'
);
CREATE TYPE ai_state_enum AS ENUM ('unprocessed','processing','ready','failed');

-- 2. New columns (non-breaking)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS ai_state ai_state_enum DEFAULT 'unprocessed' NOT NULL,
  ADD COLUMN IF NOT EXISTS last_action_at timestamptz DEFAULT now() NOT NULL;
```

2) Backfill using mapping (perform in a transaction/window)
```sql
-- 3. Map AI state first
UPDATE public.messages
SET ai_state = CASE
  WHEN is_generating THEN 'processing'::ai_state_enum
  WHEN auto_reviewed THEN 'ready'::ai_state_enum
  ELSE 'unprocessed'::ai_state_enum
END
WHERE ai_state IS DISTINCT FROM CASE
  WHEN is_generating THEN 'processing'::ai_state_enum
  WHEN auto_reviewed THEN 'ready'::ai_state_enum
  ELSE 'unprocessed'::ai_state_enum
END;

-- 4. Map primary status
UPDATE public.messages SET status = 'incoming'
WHERE status = 'pending' AND (NOT auto_reviewed OR auto_reviewed IS FALSE);

UPDATE public.messages SET status = 'triage_ready'
WHERE status = 'pending' AND auto_reviewed IS TRUE;

UPDATE public.messages SET status = 'needs_review'
WHERE status = 'review' OR status = 'edited';

UPDATE public.messages SET status = 'ready_to_send'
WHERE status = 'approved';

UPDATE public.messages SET status = 'discarded'
WHERE status = 'rejected';
```

3) Convert `status` column to enum and drop old CHECK
```sql
-- 5. Convert varchar->enum using USING cast
ALTER TABLE public.messages
  ALTER COLUMN status TYPE message_status_enum
  USING status::message_status_enum;

-- 6. Drop old CHECK constraint if present
-- Find the constraint name or recreate table without it.
-- Example (adjust if your constraint name differs):
-- ALTER TABLE public.messages DROP CONSTRAINT messages_status_check;
```

4) Optional cleanup (defer until app updated)
```sql
-- Remove redundancy after code migration
-- A) Drop auto_reviewed once ai_state adopted everywhere
-- ALTER TABLE public.messages DROP COLUMN auto_reviewed;
-- B) Consider dropping is_generating if ai_state used exclusively
-- ALTER TABLE public.messages DROP COLUMN is_generating;
```

API & Types Changes
- Update TS interfaces in `lib/api-client.ts`:
  - `status: 'incoming' | 'triage_ready' | 'needs_review' | 'ready_to_send' | 'sent' | 'discarded'`
  - Add `ai_state?: 'unprocessed' | 'processing' | 'ready' | 'failed'`
- Update `UpdateMessageInput` to accept `status` and `ai_state`.
- Ensure endpoints validate against the new unions. If needed, accept legacy values and map to new ones during a short deprecation window.

Backend/Server Changes
- Stats endpoint: recompute counts and rename fields accordingly (ensure UI still renders):
  - triageReadyCount, needsReviewCount, sentCount, discardedCount, totalMessages, approvalRate (revisit definition if needed).
- Activity log: use explicit events (received, ai_processed, ai_failed, triage_escalated, draft_edited, ready_to_send, sent, discarded).
- Generation pipeline (`/api/generate-response`):
  - When starting: set `ai_state = 'processing'`.
  - On success: set `ai_state = 'ready'`, `status = 'triage_ready'`.
  - On failure: set `ai_state = 'failed'`, keep `status` unchanged.

Frontend Changes
- `lib/message-manager.tsx`:
  - `convertApiMessage`: pass through new `status` and `ai_state`.
  - Replace filters that use `status === 'pending' && autoReviewed` with `status === 'triage_ready'`.
  - Replace review filters `status === 'review'` with `status === 'needs_review'`.
  - `generateAIResponse`: set `ai_state` transitions and set `status = 'triage_ready'` on success.
  - Rename helper methods (optional but recommended):
    - `approveMessage` → `sendMessage` (set `status = 'sent'` if sending is immediate; otherwise `ready_to_send`).
    - `sendToReview` → `escalateToReview` (set `status = 'needs_review'`).
- Components:
  - `components/customer-support-dashboard.tsx` (Triage):
    - Source list from `triage_ready`.
    - Keyboard hints and button actions call `sendMessage`/`escalateToReview`.
  - `components/detailed-review-interface.tsx` (Review & Edit):
    - Source list from `needs_review`.
    - Primary action sets `status = 'sent'` (or `ready_to_send`).
  - `components/agent-dashboard.tsx`:
    - Metrics renamed/realigned with new stats fields and labels.

Migration & Rollout Plan
- Phase 0 (prep): ship code that understands both old and new status values (mapping layer on the client/server) behind a feature flag (e.g., `NEXT_PUBLIC_STATUS_V2=true`).
- Phase 1 (DB): add enums/columns and backfill statuses; DO NOT drop old columns yet.
- Phase 2 (App): deploy updated API + frontend that reads `status` (enum) and `ai_state`. Keep compatibility for a deprecation window.
- Phase 3 (Cleanup): remove compatibility mappings; drop `auto_reviewed` and (optionally) `is_generating`.

Testing Checklist
- Unit tests for mapping logic (legacy→new, new→stats aggregation).
- Integration tests for:
  - AI generation transitions (`ai_state` and `status` changes).
  - Triage list (shows only `triage_ready`).
  - Review list (shows only `needs_review`).
  - Send action results in `sent` (or `ready_to_send`).
- Data migration dry run on a copy of production data.
- Manual QA script:
  - Seed 10 messages across legacy statuses.
  - Run migration script; verify backfill.
  - Exercise triage, review, send, discard.

Operational Notes
- SLA logic: Update queries to use `last_action_at` or `created_at` for aging visuals; ensure urgency tags still reflect message age correctly.
- Analytics: Revisit “approval rate” definition if “approved” is removed; consider “send rate” or “resolution rate”.
- Observability: Add logs/metrics around `ai_state` transitions and error rates.

Developer Guardrails
- Use shared constants/enums: define `MessageStatus` and `AIState` in a single shared module and import server + client.
- Block invalid transitions with server-side guards (e.g., cannot go from `sent` → `triage_ready`).
- Keep edits out of `status`; use `edit_history` and derive `edit_count` for UI badges.

Appendix: Example Shared Types (TS)
```ts
export type MessageStatus =
  | 'incoming'
  | 'triage_ready'
  | 'needs_review'
  | 'ready_to_send'
  | 'sent'
  | 'discarded';

export type AIState = 'unprocessed' | 'processing' | 'ready' | 'failed';
```

Appendix: Minimal Server Update Example
```ts
// When generating a response
await db.updateMessage(id, { ai_state: 'processing' });
const result = await ai.generate(...);
await db.updateMessage(id, { ai_state: 'ready', status: 'triage_ready', ai_suggested_response: result });

// When agent sends
await db.updateMessage(id, { status: 'sent', last_action_at: new Date().toISOString() });

// When agent escalates
await db.updateMessage(id, { status: 'needs_review' });
```

Timeline (suggested)
- Day 1–2: Implement DB migration + backfill scripts in staging; update API types and server; ship compatibility mapping.
- Day 3–4: Frontend filters/flows; QA; update metrics.
- Day 5: Release; monitor; remove legacy columns in a later maintenance window.

Owner Matrix (suggested)
- DB & migration scripts: Backend/Infra
- API contracts & stats: Backend
- Frontend filters/flows: Web/App
- QA plan & signoff: QA/PM

