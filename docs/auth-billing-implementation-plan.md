# Auth + Billing Implementation Plan (Aidly)

This document tracks the concrete steps to integrate Better Auth (magic links) and Stripe subscriptions with a strict hard gate.

## Summary
- Flow: Create a pending user → Start Stripe Checkout → On `checkout.session.completed` webhook mark subscription active → Send first magic link → User can access `/app/*`.
- App keeps marketing + app in one Next.js project. `/app/*` is gated by subscription status. Later we can move to `app.aidly.me` via host-based routing.

## Packages
- better-auth
- @better-auth/stripe
- stripe@^18
- email provider SDK (Resend)
- Optional: drizzle-orm (if preferred) or keep Kysely/Prisma per Better Auth docs.

## Env Vars (see .env.local.example)
- BETTER_AUTH_SECRET, APP_URL, WWW_URL, RESEND_API_KEY
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_YEARLY
- DATABASE_URL (Neon)

## Steps
1. Install deps and run `npx @better-auth/cli generate` to produce schema.
2. Create `lib/auth/server.ts` with `betterAuth` config: magic link, Postgres adapter, additional fields as needed.
3. Add Stripe plugin config (`@better-auth/stripe`) with `createCustomerOnSignUp: true` and `subscription.enabled` with plans (Pro monthly/yearly).
4. Implement POST `/api/billing/checkout` to create Checkout session via plugin (or direct Stripe if using pre-auth pending users).
5. Implement POST `/api/stripe/webhook` to handle `checkout.session.completed`, `customer.subscription.updated|deleted`.
6. Add middleware for `/app/*` to enforce `active` or `trialing` subscription; redirect others to `/pricing` or `/app/billing`.
7. Add POST `/api/billing/portal` to create a billing portal session (for cancellations, payment methods).
8. Wire CTAs: “Get started” triggers step 4; “Sign in” routes to `/app/login` which triggers magic link sign-in.

## Notes
- Strict hard gate: do not send magic links until payment confirmed; maintain a pending user row to use plugin ergonomics.
- Tax: enable Stripe Tax for France in dashboard (no code change needed initially).
- Enterprise plan: use `mailto:sales@aidly.me` for now.

## Migration Runner (optional, recommended for CI)
- Generate SQL locally with `npx @better-auth/cli generate` and commit under `database/migrations/better-auth/`.
- Apply in CI or locally with `npm run ba:migrate` (uses `scripts/better-auth-migrate.js`).
- Tracks applied files in `ba_migrations` table; safe to re-run.
