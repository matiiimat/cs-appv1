import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function appUrl() {
  // Priority order: APP_URL > VERCEL_URL > localhost
  const appUrl = process.env.APP_URL
  if (appUrl) {
    try {
      const u = new URL(appUrl)
      return u.origin
    } catch {
      return appUrl.replace(/\/+$/, '')
    }
  }

  // Vercel deployment URL
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    return `https://${vercelUrl}`
  }

  // Fallback to localhost
  return 'http://localhost:3000'
}

async function resolveProPrice(stripe: Stripe, annual?: boolean) {
  const priceEnv = annual ? process.env.STRIPE_PRICE_PRO_YEARLY : process.env.STRIPE_PRICE_PRO_MONTHLY
  if (priceEnv) return priceEnv
  const productId = annual ? process.env.STRIPE_PRODUCT_PRO_YEARLY : process.env.STRIPE_PRODUCT_PRO_MONTHLY
  if (!productId) throw new Error('Missing Stripe product/price configuration for Pro plan')
  const prices = await stripe.prices.list({ product: productId, active: true, type: 'recurring', limit: 100 })
  const price = prices.data.find(p => p.recurring?.interval === (annual ? 'year' : 'month'))
  if (!price) throw new Error('No active recurring price found for product ' + productId)
  return price.id
}

export async function POST(req: Request) {
  try {
    // Check required environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      console.error('[billing/checkout] Missing STRIPE_SECRET_KEY environment variable')
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({})) as { email?: string; annual?: boolean; returnUrl?: string }
    const email = body.email // optional; Stripe Checkout will collect if absent
    const annual = Boolean(body.annual)

    console.log(`[billing/checkout] Creating checkout session for annual: ${annual}, email: ${email ? 'provided' : 'not provided'}`)

    const stripe = new Stripe(stripeSecretKey)

    let priceId: string
    try {
      priceId = await resolveProPrice(stripe, annual)
      console.log(`[billing/checkout] Resolved price ID: ${priceId}`)
    } catch (priceError) {
      console.error('[billing/checkout] Failed to resolve price:', priceError)
      return NextResponse.json({
        error: 'Payment configuration error'
      }, { status: 500 })
    }

    const appOrigin = appUrl()
    const successUrl = `${appOrigin}/payment/success`
    const cancelUrl = `${appOrigin}#pricing`

    console.log(`[billing/checkout] URLs - success: ${successUrl}, cancel: ${cancelUrl}`)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      ...(email ? { customer_email: email } : {}),
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
    })

    console.log(`[billing/checkout] Successfully created session: ${session.id}`)
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing/checkout] Unexpected error:', err)
    return NextResponse.json({
      error: 'Failed to create checkout session'
    }, { status: 500 })
  }
}
