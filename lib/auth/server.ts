import { betterAuth } from 'better-auth'
import { magicLink } from 'better-auth/plugins'
import { createKysely } from './db'
import { sendMagicLinkEmail } from '@/lib/email/sendgrid'
import Stripe from 'stripe'
import { stripe as stripePlugin } from '@better-auth/stripe'
import { ensureProvisioned } from '@/lib/tenant'

const db = createKysely()

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '')

async function resolveProPlan() {
  const priceMonthlyEnv = process.env.STRIPE_PRICE_PRO_MONTHLY
  const priceYearlyEnv = process.env.STRIPE_PRICE_PRO_YEARLY
  const prodMonthly = process.env.STRIPE_PRODUCT_PRO_MONTHLY
  const prodYearly = process.env.STRIPE_PRODUCT_PRO_YEARLY

  let monthlyPriceId = priceMonthlyEnv
  let yearlyPriceId = priceYearlyEnv

  if ((!monthlyPriceId || !yearlyPriceId) && (!prodMonthly || !prodYearly)) {
    console.warn('[Stripe] Missing price or product IDs for Pro plan. Set STRIPE_PRICE_PRO_MONTHLY/STRIPE_PRICE_PRO_YEARLY or STRIPE_PRODUCT_PRO_MONTHLY/STRIPE_PRODUCT_PRO_YEARLY')
  }

  // Resolve from product IDs if price IDs not provided
  if (!monthlyPriceId && prodMonthly) {
    const prices = await stripeClient.prices.list({ product: prodMonthly, active: true, type: 'recurring', limit: 100 })
    const monthly = prices.data.find(p => (p.recurring?.interval === 'month'))
    if (monthly) monthlyPriceId = monthly.id
  }
  if (!yearlyPriceId && prodYearly) {
    const prices = await stripeClient.prices.list({ product: prodYearly, active: true, type: 'recurring', limit: 100 })
    const yearly = prices.data.find(p => (p.recurring?.interval === 'year'))
    if (yearly) yearlyPriceId = yearly.id
  }

  return { monthlyPriceId, yearlyPriceId }
}

export const auth = betterAuth({
  database: { db },
  session: {
    // 8 hours in seconds
    expiresIn: 8 * 60 * 60,
  },
  // base path defaults to /api/auth via route mounting
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Do not gate here; guarded endpoint handles existence check.
        await sendMagicLinkEmail(email, url)
      },
    }),
    stripePlugin({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: async () => {
          const { monthlyPriceId, yearlyPriceId } = await resolveProPlan()
          return [
            {
              name: 'pro',
              priceId: monthlyPriceId || 'price_missing',
              annualDiscountPriceId: yearlyPriceId,
            },
          ]
        },
      },
      onEvent: async (event: Stripe.Event) => {
        try {
          if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session
            const email = [session.customer_details?.email ?? null, session.customer_email ?? null].find(
              (e): e is string => typeof e === 'string' && e.length > 0
            )

            if (!email) {
              console.error('[Stripe onEvent] No email found in checkout session:', session.id)
              return
            }

            console.log(`[Stripe onEvent] Processing checkout completion for email: ${email}`)

            // Ensure user/org exists before sending magic link
            let provisionResult
            try {
              provisionResult = await ensureProvisioned(email)
              console.log(`[Stripe onEvent] Successfully provisioned org: ${provisionResult.organizationId}, user: ${provisionResult.userId}`)
            } catch (e) {
              console.error('[Stripe onEvent] Critical provisioning error for email:', email, e)
              // Don't send magic link if provisioning failed
              return
            }

            // Send magic link only after successful payment and provisioning
            try {
              // Build callback URL using origin only (avoid double /app)
              const raw = process.env.APP_URL || ''
              let callbackURL = '/app'
              if (raw) {
                try {
                  const u = new URL(raw)
                  callbackURL = `${u.origin}/app`
                } catch {
                  callbackURL = `${raw.replace(/\/+$/, '')}/app`
                }
              }

              await auth.api.signInMagicLink({
                body: {
                  email,
                  callbackURL,
                },
                headers: {},
              })

              console.log(`[Stripe onEvent] Magic link sent successfully to: ${email}`)
            } catch (magicLinkError) {
              console.error('[Stripe onEvent] Failed to send magic link to:', email, magicLinkError)
            }
          }
        } catch (err) {
          console.error('[Stripe onEvent] error handling event', event.type, err)
        }
      },
    }),
  ],
})
