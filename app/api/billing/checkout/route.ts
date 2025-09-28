import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function appUrl() {
  return process.env.APP_URL || 'http://localhost:3000'
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
    const body = await req.json().catch(() => ({})) as { email?: string; annual?: boolean; returnUrl?: string }
    const email = body.email
    const annual = Boolean(body.annual)
    if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-02-24.acacia' })
    const priceId = await resolveProPrice(stripe, annual)
    const successUrl = `${appUrl()}/app/login?paid=1`
    const cancelUrl = `${appUrl()}#pricing`

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing/checkout] error', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
