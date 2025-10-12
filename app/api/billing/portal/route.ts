import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function appUrl() {
  return process.env.APP_URL || 'http://localhost:3000'
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { email?: string; returnUrl?: string; locale?: string }
    const email = body.email
    if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
    const customers = await stripe.customers.list({ email, limit: 1 })
    const customer = customers.data[0]
    if (!customer) return NextResponse.json({ error: 'No customer found' }, { status: 404 })

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: body.returnUrl || appUrl(),
      locale: (body.locale as Stripe.BillingPortal.SessionCreateParams.Locale) || 'auto',
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing/portal] error', err)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
