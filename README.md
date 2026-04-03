# Aidly (SupportAI)

**[aidly.me](https://aidly.me)**

AI-powered customer support platform that generates draft responses, triages tickets by priority, and learns from your team's resolved conversations. Built as a multi-tenant SaaS with org-based data isolation.

## Why I Built This

As a Technical Customer Success Manager, I've spent years watching support teams drown in repetitive tickets while their best knowledge lives in one person's head. I built Aidly to solve this: an AI assistant that drafts responses using your team's actual resolution history, surfaces urgent tickets first, and gets smarter over time. This isn't a wrapper around ChatGPT -- it's a full production system with billing, email routing, and multi-org tenancy.

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Database:** PostgreSQL, Redis (caching & queues)
- **AI:** OpenAI, Anthropic, local LLM support via AI SDK
- **Infrastructure:** Vercel, Sentry, GDPR-compliant
- **Integrations:** SendGrid (email), Stripe (billing), Shopify (app)
- **Auth:** Better Auth with org-based multi-tenancy

## Features

- **Tinder-style triage** -- swipe to approve, edit, or reject AI-drafted responses
- **Multi-provider AI** -- switch between OpenAI, Anthropic, or local models per org
- **Knowledge base** -- auto-learns from resolved tickets to improve future drafts
- **Inbound/outbound email** -- full email pipeline via SendGrid webhooks
- **Shopify integration** -- pull customer and order context into tickets
- **Analytics dashboard** -- response times, resolution rates, agent performance
- **Stripe billing** -- usage-based plans with org-level subscription management
- **Multi-tenant architecture** -- complete data isolation between organizations

## Screenshots

> _Coming soon_

## Quick Start

```bash
# Clone and install
git clone https://github.com/matiiimat/cs-appv1.git
cd cs-appv1
npm install

# Start Postgres and Redis
npm run db:up

# Run migrations and seed data
npm run db:migrate
npm run db:seed

# Set up environment variables
cp .env.example .env.local
# Add your API keys (OpenAI, SendGrid, Stripe, etc.)

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

The app follows a layered architecture: Next.js API routes handle business logic, PostgreSQL stores tenant-isolated data, and Redis manages session caching and background job queues. AI response generation is abstracted behind the Vercel AI SDK, allowing hot-swappable model providers. Inbound emails hit a SendGrid webhook endpoint, get classified and queued, then surface in the triage UI with a draft response ready for review.

```
Client (React 19) → Next.js API Routes → PostgreSQL / Redis
                                        → AI SDK (OpenAI / Anthropic / Local)
                                        → SendGrid (Email) / Stripe (Billing)
```

---

*426 commits and counting. Built by a CSM who codes.*
