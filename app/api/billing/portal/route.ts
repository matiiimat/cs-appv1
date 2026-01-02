import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/lib/auth/server'
import Stripe from 'stripe'

function appUrl() {
  return process.env.APP_URL || 'http://localhost:3000'
}

export async function POST(req: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    // Authenticate the user - use their session email, not request body
    const headers = new Headers(req.headers)
    const session = await auth.api.getSession({ headers })
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = session.user.email
    const body = await req.json().catch(() => ({})) as { returnUrl?: string; locale?: string }

    const stripe = new Stripe(stripeSecretKey)
    const customers = await stripe.customers.list({ email, limit: 1 })
    const customer = customers.data[0]
    if (!customer) return NextResponse.json({ error: 'No customer found' }, { status: 404 })

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: body.returnUrl || appUrl(),
      locale: (body.locale as Stripe.BillingPortal.SessionCreateParams.Locale) || 'auto',
    })
    return NextResponse.json({ url: portalSession.url })
  } catch (err) {
    console.error('[billing/portal] error', err)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
