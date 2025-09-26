Email Integration MVP (SendGrid Inbound + Outbound)
=====================

Scope
- One mailbox per workspace (organization).
- Inbound via SendGrid Inbound Parse; no attachments, text body only.
- Outbound via SendGrid Mail Send API; managed from address.
- PII in DB remains encrypted via existing model.
  
Inbound is handled via SendGrid Inbound Parse posting to your app. Outbound email supports SendGrid (default), Postmark, or Brevo via `EMAIL_PROVIDER`.

Addresses
- Forward-to per org: `support+<orgId>@${INBOUND_DOMAIN}`.
- Reply-To on outbound set to the same address to keep the thread flowing back in.

Environment
- POSTMARK_SERVER_TOKEN: server token for Mail Send.
- POSTMARK_INBOUND_TOKEN: inbound webhook token for signature verification (optional, recommended).
- INBOUND_DOMAIN: e.g. `inbound.aidly.me` (MX points to Postmark inbound host).
- OUTBOUND_FROM_EMAIL: e.g. `support@aidly.me` (must be a verified Sender Signature or authenticated domain in Postmark).

Routes
- POST `/api/email/inbound/sendgrid`: receives SendGrid Inbound Parse (multipart or JSON) and creates a `messages` row.
- PUT `/api/messages`: if status transitions to `sent`, triggers outbound email via the selected provider.

Notes
- Tenancy: orgId extracted from recipient local-part after `support+`.
- Security (MVP): you can enable SendGrid signed events later; for MVP rely on unique alias + HTTPS.
- HTML/attachments/custom domains/bounce events are out-of-scope for MVP.

SendGrid Inbound setup (MVP)
- DNS: add an `MX` record for `INBOUND_DOMAIN` (e.g., `inbound.aidly.me`) pointing to `mx.sendgrid.net` with priority 10 (via Cloudflare DNS).
- In SendGrid → Settings → Inbound Parse:
  - Add Hostname: `inbound.aidly.me`
  - Destination URL: `https://<your-app-domain>/api/email/inbound/sendgrid`
  - POST method; leave “Spam Check” off for MVP.
- Test by emailing `support+<orgId>@inbound.aidly.me`.

Outbound provider
- Set `EMAIL_PROVIDER=sendgrid` and `SENDGRID_API_KEY=...`.
- Use `OUTBOUND_FROM_EMAIL` from an authenticated domain or Single Sender (for quick testing).

Outbound provider
- Set `EMAIL_PROVIDER=postmark` and `POSTMARK_SERVER_TOKEN=...` or `EMAIL_PROVIDER=brevo` and `BREVO_API_KEY=...`.
- `OUTBOUND_FROM_EMAIL` must be a verified sender (Postmark) or authorized sender (Brevo).
