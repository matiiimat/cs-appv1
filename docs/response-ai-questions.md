# Questions to Clarify Before Implementation

## Domain Routing
- Preference: `app.aidly.me` 
- Marketing and app live in one Next.js project - it shouldn't be too heavy as there would be rare changes to the marketing page once live. Feel free to challenge me on this if you disagree

## Signup Gating
- Hard gate - no user until payment and no free trial / freemium

## Pricing and Billing
- Make 2 plans: Pro and Enterprise. Pro starts at $199 / month, $1999 if yearly option selected. Entreprise should just have a contact us button that would send an email to sales@aidly.me
- Stripe tax I don't know about it but we will be located in France
- Don't do team / seat based billing for the moment
- User should be able to cancel subscription from their settings. This would allow them to finish the month they paid but access will be restricted then 

## Auth Specifics
- For auth, whatever is the simplest. Is magic link the simplest? If so we can go ahead with that. Tell me which one is the simplest
- Email provider preference for verification/reset (Resend, Postmark, SES)? => no idea what you mean by that

## Data Model and Database
- I already have a Postgres instance with Neon. Look into it as we have it already created and live

## Stripe Setup
- I already have a Stripe account. I need to set up Product/Price IDs and we will operate in test mode first  
- Webhook destination domain for local/dev (we can use Stripe CLI tunnel) and prod.

## App Readiness
-  `app.aidly.me` is already live but without a login route, so you should scaffold both landing + auth + minimal app shell in one repo for the www.aidly.me page

## Content and Brand
- Basic sections wanted for MVP: Hero, Features, Pricing, FAQ, Footer (privacy/terms/contact).

Logo is in public/logo.png
Brand colors palette:
<?xml version="1.0" encoding="utf-8"?>
          <!-- Exported from Coolors.co - https://coolors.co/3872b9-f38135-b05755-b33275-475b88 -->
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 500 250" xml:space="preserve">
            <rect fill="#3872b9" x="0" y="0" width="100" height="220"/>,<rect fill="#f38135" x="100" y="0" width="100" height="220"/>,<rect fill="#b05755" x="200" y="0" width="100" height="220"/>,<rect fill="#b33275" x="300" y="0" width="100" height="220"/>,<rect fill="#475b88" x="400" y="0" width="100" height="220"/>
            <text x="10" y="235" font-family="Arial" font-size="6" alignment-baseline="middle">Exported from Coolors.co</text>
            <text x="490" y="235" font-family="Arial" font-size="6" alignment-baseline="middle" text-anchor="end">https://coolors.co/3872b9-f38135-b05755-b33275-475b88</text>
          </svg>