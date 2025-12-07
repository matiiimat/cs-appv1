# Security Assessment – High-Priority Risks (v2)

Last updated: 2025-12-07
Scope: Next.js app + API routes, Stripe, email providers, AI integrations, PostgreSQL.

## 1) PII Encryption Integrity Gap (AES-CBC without authentication) + Misleading Metadata
- Summary: PII is encrypted using AES-256-CBC without any authentication/MAC. Stored metadata claims `AES-256-GCM`, while code actually uses CBC. This enables ciphertext malleability and potential undetected tampering; the label misleads incident response and migration.
- Impact: High – Integrity and authenticity of encrypted PII cannot be guaranteed; attackers with write access to DB can alter values without detection; future migrations may assume GCM.
- Affected: `lib/encryption.ts` (`DataEncryption.encrypt/decrypt`), `DatabaseEncryption.toStorageFormat`, PII usage in `lib/models/message.ts` and `lib/models/organization-settings.ts`.
- Evidence:
  - CBC in use: `lib/encryption.ts` uses `CryptoJS.AES.encrypt(..., mode: CryptoJS.mode.CBC)`.
  - Metadata mismatch: `DatabaseEncryption.toStorageFormat` sets `algorithm: 'AES-256-GCM'`.
- Exploit scenarios: Bit-flipping/injection in ciphertext stored in DB leading to coerced values post-decrypt; integrity-blind corruption; confusion during audits.
- Severity: Critical (Confidentiality + Integrity).
- Likelihood: Medium (DB write access or MITM on app/DB path).
- Immediate Actions (no code yet):
  - Acknowledge metadata mismatch in runbook; block features depending on integrity checks.
  - Prepare plan for AEAD migration (GCM/ChaCha20-Poly1305) with versioned envelope and integrity verification.

## 2) Key Management: Org Data Keys Stored in Plaintext in DB
- Summary: Each organization’s `encrypted_data_key` is generated and stored as plaintext in the `organizations` table; any DB compromise exposes PII at rest despite encryption.
- Impact: High – Single-point DB compromise reveals all per-org keys; encryption-at-rest provides limited benefit against DB exfiltration.
- Affected: `lib/tenant.ts` (provisioning writes key), `lib/models/*` (reads key), DB schema (`organizations.encrypted_data_key`).
- Evidence: `provisionOrgAndUserForEmail` generates key and inserts into `organizations`; `MessageModel.getOrganizationKey` fetches it.
- Exploit scenarios: Attacker dumps DB -> decrypts PII offline; insider misuse.
- Severity: High (Confidentiality).
- Likelihood: Medium.
- Immediate Actions: Define plan to wrap org keys with KMS/HSM or env master key + rotation schedule; restrict DB role access to the column; audit logs on access.

## 3) SSRF Risk via Local AI Provider Endpoint Handling
- Summary: Local AI provider treats `apiKey` value as an HTTP endpoint (e.g., `http://host:port`) and server `fetch`es it. If a tenant or compromised admin can set AI settings, they can pivot to SSRF/LFI-esque internal calls.
- Impact: High – Potential internal network probing, access to metadata services, or hitting internal control planes.
- Affected: `lib/ai-providers.ts` (LocalAIProvider), settings persistence in `lib/models/organization-settings.ts`, usage in `app/api/generate-response/route.ts`.
- Evidence: LocalAI uses `const endpoint = apiKey || "http://localhost:1234"` and requests `${endpoint}/v1/chat/completions`.
- Exploit scenarios: Tenant sets endpoint to `http://169.254.169.254` or internal DB/Redis; server performs the request.
- Severity: High (Integrity/Confidentiality, potential RCE via downstream services).
- Likelihood: Medium (depending on who can set org settings; current UI stores settings, API route not located in repo but model supports it).
- Immediate Actions: Gate “local” provider to trusted deployments only; enforce strict allowlist/URL validator; disallow private IPs/hostnames; require admin-only with extra policy checks.

## 4) CSP Allows 'unsafe-inline' Scripts in Production
- Summary: `next.config.ts` sets `script-src 'self' 'unsafe-inline'` in production. This weakens XSS defenses and negates CSP’s core value.
- Impact: Medium-High – XSS payloads become executable if any injection exists (including future regressions).
- Affected: `next.config.ts`.
- Evidence: `buildCSP()` returns `'unsafe-inline'` for production in `script-src`.
- Exploit scenarios: Any reflected/stored injection (e.g., mis-sanitized content) can run arbitrary JS.
- Severity: High (given exposure); Practical Severity: Medium-High depending on injection surfaces.
- Likelihood: Medium.
- Immediate Actions: Move to nonces/hashes for inline bootstraps; remove `'unsafe-inline'` in production; keep development allowances only in dev.

## 5) Rate Limiting Not Distributed + Gaps on Costly Endpoints
- Summary: The in-memory limiter (`lib/rate-limiter.ts`) is not shared across instances; restarts reset counters. Some costly endpoints (e.g., `/api/billing/checkout`, AI endpoints) may not be covered or are only partially covered.
- Impact: Medium-High – Abuse/DoS risk and unexpected cost (Stripe/AI). Horizontal scaling bypasses limits.
- Affected: All Next API routes; explicit wrappers added for messages; need review for AI and billing routes.
- Evidence: Global in-memory `Map` store; `app/api/messages/route.ts` is wrapped; `app/api/billing/checkout/route.ts` not wrapped; `generate-response` imports limiter but export coverage not confirmed in file tail.
- Exploit scenarios: Burst calls to Stripe checkout creation; spam AI generation to rack up provider costs; distributed attacks across instances bypass in-memory limits.
- Severity: Medium-High (Availability/Cost).
- Likelihood: High.
- Immediate Actions: Back limiter with Redis; ensure coverage on all costly endpoints (`/api/*ai*`, `/api/billing/*`); add user+IP aware keys and sensible quotas.

## 6) Unauthenticated AI Config Placeholder Route
- Summary: `app/api/ai-config/route.ts` is a placeholder that validates arbitrary config and returns success without auth or persistence. It can be used for probing; may confuse clients and give a false sense of persistence.
- Impact: Medium – Not directly escalating, but increases attack surface and confusion.
- Affected: `app/api/ai-config/route.ts`.
- Evidence: No auth checks; “in a real app you’d save this” comment.
- Exploit scenarios: Attackers spam the endpoint; use as oracle to test payload acceptance.
- Severity: Medium.
- Likelihood: High (public route).
- Immediate Actions: Remove in production or gate behind auth; return 404/410.

## 7) Ticket ID Generation via MAX+1 Race (Integrity/DoS)
- Summary: Ticket IDs are derived using `MAX(SUBSTRING(...)) + 1` per org, which is racy under concurrency and can collide.
- Impact: Medium – Conflicting IDs can break email threading/approvals and degrade trust.
- Affected: `lib/models/message.ts` (create path).
- Evidence: `SELECT COALESCE(MAX(...), 0) + 1 as counter` then formats `#000001`.
- Exploit scenarios: Parallel creates force collisions -> repeated retries or failed constraints -> user-visible errors.
- Severity: Medium.
- Likelihood: Medium-High under load.
- Immediate Actions: Use a DB sequence or a dedicated monotonic generator per organization (e.g., `generate_ticket_id()` server-side function already referenced elsewhere).

---

## Cross-Cutting Observations (Context for Prioritization)
- Security Headers: Strong baseline overall (HSTS, COEP/COOP/CORP, Referrer-Policy, X-CTO). `X-XSS-Protection` is legacy; harmless but not protective.
- Email Injection Protections: Robust subject/body/header validation; metadata header stripping; good hygiene.
- Auth/Org Boundaries: API routes consistently resolve org via session email and parameterized SQL. Good tenant isolation.
- Debugging: Debug endpoint correctly disabled in production.

## Immediate Next Steps (Non-code)
1) Confirm operational posture: are multiple instances and serverless deployments expected at launch? If yes, treating rate-limiting as High.
2) Decide crypto posture for PII: commit to AEAD migration and key wrapping (KMS or master key) with rotation strategy.
3) Decide whether “Local AI” remains enabled in production; if yes, define strict allow/deny URL policy.
4) Approve CSP hardening plan (nonces/hashes; remove `'unsafe-inline'`).
5) Remove or lock down placeholder routes for production (`/api/ai-config`).

> Implementation proposals are intentionally omitted until you approve. This document lists only the high-priority risks and immediate decision points for production readiness.

