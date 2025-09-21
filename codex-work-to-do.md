# Codex Work TODOs — AI Provider Hardening (SaaS-Ready)

## Goal
- Move AI provider secrets server-side, avoid CORS and client exposure, keep simple model config, add observability, and prep for org-scoped auth.

## Backend Data Model
- [ ] Add table `organization_settings` (one row per org):
  - Columns: `organization_id (uuid, pk/fk)`, `ai_provider (text)`, `ai_model (text)`, `ai_api_key_enc (text)`, `updated_at (timestamptz default now())`.
  - Index: unique `(organization_id)`.
  - Encryption: store `ai_api_key_enc` encrypted via existing utilities in `lib/encryption.ts`.
- [ ] Add table `provider_usage` for observability:
  - Columns: `id (uuid)`, `organization_id`, `provider`, `model`, `route`, `success (bool)`, `latency_ms (int)`, `error_code (text)`, `created_at (timestamptz default now())`.

## Server APIs
- [ ] `POST /api/settings/ai` (auth/org-scoped):
  - Input: `{ provider, model, apiKey? }`.
  - Behavior: encrypt `apiKey` if present and upsert into `organization_settings`; if omitted, keep existing key.
  - Validation: zod schema; restrict provider to `openai|anthropic|local`.
- [ ] `GET /api/settings/ai` (auth/org-scoped):
  - Returns `{ provider, model }` only (never return the API key).
- [ ] Update existing routes to read settings from DB:
  - `/api/ai/test-connection` → fetch `{ provider, model, key }` from DB using `organization_id`.
  - `/api/ai/chat` → same.
  - `/api/generate-response` → same.

## Auth & Org Context
- [ ] Create helper to resolve `organization_id`:
  - `getOrgId(req)`: from session/JWT in prod; fallback to DEMO org UUID in dev.
- [ ] Optionally add Next.js middleware to attach org id to request context, or pass explicitly in request body until auth is ready.

## Client Changes
- [ ] Settings page (`components/settings-page.tsx`):
  - On load: call `GET /api/settings/ai` to prefill provider/model.
  - On change/save: call `POST /api/settings/ai` (do not persist API key in localStorage; fully remove client key storage after submit).
  - Keep “Test Connection” button calling `/api/ai/test-connection` (server), passing only provider/model (server pulls key from DB).
- [ ] Review/Queue UIs:
  - Chat already uses `/api/ai/chat` (server). Verify all code paths.
  - Quick actions already use `/api/generate-response` (server). Verify all code paths.
- [ ] Model input:
  - Keep simple text field with defaults (OpenAI: `gpt-4o-mini`; Anthropic: `claude-3-5-haiku-20241022`). Allow override.

## Security & Secrets
- [ ] Ensure API keys never leave the server after saving.
- [ ] Redact sensitive info in server logs and error messages.
- [ ] Use `ENCRYPTION_KEY` from env (Vercel/hosted secrets) for at-rest encryption; document rotation process.

## Observability (Optional, Next)
- [ ] In `AIService` server usage paths, log to `provider_usage` with latency, success/failure, route.
- [ ] Normalize error codes/messages for analysis.

## Migrations & Rollout
- [ ] Prepare SQL migration for `organization_settings` and `provider_usage`.
- [ ] Seed demo org settings (provider/model only) so UI isn’t empty.
- [ ] Feature-flag switch for server routes to read from DB (fall back to request body in dev until client fully migrated).

## Testing
- [ ] Unit tests: encryption/decryption roundtrip for keys; zod validation for settings requests.
- [ ] Integration tests: save + get settings; test-connection per provider; chat/generate with DB-backed key.
- [ ] E2E/manual: 
  - Settings → save → test connection succeeds.
  - Review page chat and quick actions work without CORS or exposing keys.
  - No API keys in client storage or network responses.

## Acceptance Criteria
- [ ] No CORS errors in UI; all AI calls happen server-side.
- [ ] No API keys in client state/storage/responses/logs.
- [ ] Test Connection works for OpenAI/Anthropic with server-side keys.
- [ ] Chat/Generate read per-org settings from DB and succeed with defaults or custom models.

## Notes
- Rate limiting intentionally deferred. When adding, prefer Redis-based per-org/IP for `/api/ai/test-connection`, `/api/ai/chat`, `/api/generate-response`.
- Keep Local provider behavior as-is (endpoint-based), but also consider moving local endpoint to org settings for parity later.
