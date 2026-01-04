import { betterAuth } from 'better-auth'
import { magicLink } from 'better-auth/plugins'
import { createKysely } from './db'
import { sendMagicLinkEmail } from '@/lib/email/sendgrid'
import Stripe from 'stripe'
import { stripe as stripePlugin } from '@better-auth/stripe'
import { ensureProvisioned } from '@/lib/tenant'
import { EmailUsageModel } from '@/lib/models/email-usage'
import { db as pgDb } from '@/lib/database'

const db = createKysely()

// Stripe client with safe fallbacks (validation handled at startup)
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_dev'
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder_for_dev'
const stripeClient = new Stripe(stripeKey)

type PlanConfig = {
  name: string
  monthlyPriceId?: string
  yearlyPriceId?: string
}

// Cache resolved plan prices to avoid repeated Stripe API calls
let resolvedPlans: { plus: PlanConfig; pro: PlanConfig } | null = null

async function resolvePlanPrices(planName: 'plus' | 'pro'): Promise<{ monthlyPriceId?: string; yearlyPriceId?: string }> {
  const planUpper = planName.toUpperCase()
  const priceMonthlyEnv = process.env[`STRIPE_PRICE_${planUpper}_MONTHLY`]
  const priceYearlyEnv = process.env[`STRIPE_PRICE_${planUpper}_YEARLY`]
  const prodMonthly = process.env[`STRIPE_PRODUCT_${planUpper}_MONTHLY`]
  const prodYearly = process.env[`STRIPE_PRODUCT_${planUpper}_YEARLY`]

  let monthlyPriceId = priceMonthlyEnv
  let yearlyPriceId = priceYearlyEnv

  if ((!monthlyPriceId || !yearlyPriceId) && (!prodMonthly || !prodYearly)) {
    console.warn(`[Stripe] Missing price or product IDs for ${planName} plan.`)
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

async function resolveAllPlans(): Promise<{ plus: PlanConfig; pro: PlanConfig }> {
  if (resolvedPlans) return resolvedPlans

  const [plusPrices, proPrices] = await Promise.all([
    resolvePlanPrices('plus'),
    resolvePlanPrices('pro'),
  ])

  resolvedPlans = {
    plus: { name: 'plus', ...plusPrices },
    pro: { name: 'pro', ...proPrices },
  }

  return resolvedPlans
}

// Detect which plan was purchased based on price ID
async function detectPlanFromPriceId(priceId: string): Promise<'plus' | 'pro' | null> {
  const plans = await resolveAllPlans()

  if (priceId === plans.plus.monthlyPriceId || priceId === plans.plus.yearlyPriceId) {
    return 'plus'
  }
  if (priceId === plans.pro.monthlyPriceId || priceId === plans.pro.yearlyPriceId) {
    return 'pro'
  }

  return null
}

// Determine the base URL for auth (magic links, callbacks, etc.)
function getAuthBaseURL(): string {
  // Explicit APP_URL takes priority
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '')
  }
  // Vercel deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  // Fallback for local dev
  return 'http://localhost:3000'
}

export const auth = betterAuth({
  baseURL: getAuthBaseURL(),
  database: { db },
  session: {
    // 8 hours in seconds
    expiresIn: 8 * 60 * 60,
  },
  // Provision app-level user/org after Better Auth creates the user (post magic link verification)
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // This runs AFTER magic link verification when Better Auth creates the user
          // Now we can safely create our app-level org and user records
          const email = user.email
          if (email) {
            try {
              const result = await ensureProvisioned(email, user.name || undefined)
              console.log(`[databaseHooks] Provisioned org ${result.organizationId} for verified user: ${email}`)
            } catch (e) {
              // Log but don't fail - protected layout will retry if needed
              console.error(`[databaseHooks] Failed to provision for ${email}:`, e)
            }
          }
        },
      },
    },
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
      stripeWebhookSecret: webhookSecret,
      createCustomerOnSignUp: false,
      subscription: {
        enabled: true,
        plans: async () => {
          const plans = await resolveAllPlans()
          return [
            {
              name: 'plus',
              priceId: plans.plus.monthlyPriceId || 'price_missing',
              annualDiscountPriceId: plans.plus.yearlyPriceId,
            },
            {
              name: 'pro',
              priceId: plans.pro.monthlyPriceId || 'price_missing',
              annualDiscountPriceId: plans.pro.yearlyPriceId,
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

            // Store Stripe customer ID on the organization for future webhook lookups
            const stripeCustomerId = typeof session.customer === 'string'
              ? session.customer
              : session.customer?.id

            if (stripeCustomerId) {
              try {
                await pgDb.query(
                  'UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2',
                  [stripeCustomerId, provisionResult.organizationId]
                )
                console.log(`[Stripe onEvent] Stored stripe_customer_id ${stripeCustomerId} for org ${provisionResult.organizationId}`)
              } catch (e) {
                console.error('[Stripe onEvent] Failed to store stripe_customer_id:', e)
              }
            }

            // Detect which plan was purchased and upgrade accordingly
            try {
              let detectedPlan: 'plus' | 'pro' = 'pro' // Default to pro for safety

              // Get the subscription to find the price ID
              if (session.subscription) {
                const subscriptionId = typeof session.subscription === 'string'
                  ? session.subscription
                  : session.subscription.id
                const subscription = await stripeClient.subscriptions.retrieve(subscriptionId)
                const priceId = subscription.items.data[0]?.price?.id

                if (priceId) {
                  const detected = await detectPlanFromPriceId(priceId)
                  if (detected) {
                    detectedPlan = detected
                  }
                  console.log(`[Stripe onEvent] Detected plan from price ${priceId}: ${detectedPlan}`)
                }
              }

              await EmailUsageModel.updatePlan(provisionResult.organizationId, detectedPlan, true)
              console.log(`[Stripe onEvent] Upgraded org ${provisionResult.organizationId} to ${detectedPlan} plan`)
            } catch (e) {
              console.error('[Stripe onEvent] Failed to upgrade plan:', e)
              // Continue anyway - plan can be fixed manually
            }

            // Auto magic-link send removed by request; users can sign in via the standard login flow.
            console.log(`[Stripe onEvent] Checkout completed; provisioned org and user for ${email}.`)
          }

          // Handle subscription cancellation - downgrade to free at period end
          if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object as Stripe.Subscription
            const customerId = typeof subscription.customer === 'string'
              ? subscription.customer
              : subscription.customer.id

            console.log(`[Stripe onEvent] Subscription deleted for customer: ${customerId}`)

            // Find org by Stripe customer ID and downgrade to free
            try {
              const orgResult = await pgDb.query<{ id: string }>(
                'SELECT id FROM organizations WHERE stripe_customer_id = $1 LIMIT 1',
                [customerId]
              )

              if (orgResult.rows.length > 0) {
                const orgId = orgResult.rows[0].id
                // Downgrade without resetting period - they keep access until current period ends
                await EmailUsageModel.updatePlan(orgId, 'free', false)
                console.log(`[Stripe onEvent] Downgraded org ${orgId} to free plan`)
              } else {
                console.warn(`[Stripe onEvent] No org found for stripe_customer_id: ${customerId}`)
              }
            } catch (e) {
              console.error('[Stripe onEvent] Failed to downgrade plan:', e)
            }
          }
        } catch (err) {
          console.error('[Stripe onEvent] error handling event', event.type, err)
        }
      },
    }),
  ],
})
