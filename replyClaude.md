Findings

REPLY FROM DEVELOPER: Here are my notes feel free to challenge me. Investigate, answer and plan and wait for my ok before going ahead with the changes.

- No org/user provisioning: After a successful checkout + magic link sign-in, we don’t create an organization row or an app-level user row. All APIs use a hardcoded DEMO_ORGANIZATION_ID. => REPLY FROM DEVELOPER: Are the email addresses used for logging in linked to an organization ID? What is the current flow there? Technically we want: if no organization ID linked to email address then redirect to the register steps (correct me if the flow is currently different) if signed in an active subscription go to the app

- No org resolution in APIs: Message APIs, mailbox alias, and inbound email currently use the demo org; nothing maps a logged-in user to their org. REPLY FROM DEVELOPER: Modify it so the mapping is done so the logged in user sees their own organization

- Encryption key per org: The messages model expects each org to have an `encrypted_data_key` (64-hex). New orgs need that generated at provisioning.

- Mailbox alias: The displayed forwarding alias and reply-to are tied to the demo org, not the new user’s org. REPLY FROM DEVELOPER: Part of the no org resolution comment: we need to ensure that new accounts created create a new organization ID and is reflected where it needs to be

- Stripe linkage: The Better Auth Stripe plugin stores `stripeCustomerId` on the auth user and can infer the portal via subscription. We’re not using that for our own org yet (might be okay MVP, but consider adding `stripe_customer_id` to organizations later). REPLY FROM DEVELOPER: Yes add it

Plan
1) Provision on first sign-in
- On protected layout load (server-side), if no app-level user exists for `session.user.email`, create:
  - `organizations` row with `plan_type='pro'`, `plan_status='active'`, `encrypted_data_key=generateOrganizationKey()`.
  - `users` row linked to that org, email = session email, role = 'admin'.
  - Optional: `organization_settings` with defaults.
- Make this idempotent (only runs on first visit).

2) Resolve org per request
- Add a small util to fetch orgId for the logged-in user (by session email).
- Replace DEMO_ORGANIZATION_ID usage in:
  - `app/api/messages/route.ts` (GET/POST/PUT).
  - `app/api/organization/mailbox/route.ts`.
  - Any other org-bound endpoints.

3) Mailbox and email flows
- Settings → Mailbox should show the forwarding alias for the user’s org: `support+<orgId>@INBOUND_DOMAIN`.
- Outbound reply-to should use the org alias.
- Inbound sendgrid handler already parses `orgId` from recipient; ensure the new
 alias is shown to the user.

4) UX confirmations
- After checkout and sign-in, the user hits `/app` and sees:
  - Their own workspace with no data yet (not the demo org).
  - Settings → Mailbox shows their org’s forwarding address.
  - Billing tab works via plugin portal (already implemented).

5) Optional (nice-to-have, can be later)
- Persist `stripeCustomerId` on our `organizations` table for multi-user orgs and cleaner mapping.
- Add a short “set company name” step on first load, to name the org.

If you approve, I’ll implement:
- A provisioning helper called in `app/app/(protected)/layout.tsx`.
- A `getOrgIdForSession` util and replace hardcoded IDs in API routes.
- Update Mailbox endpoint and UI to be org-aware.

