import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/lib/auth/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const headers = new Headers(req.headers)
    const session = await auth.api.getSession({ headers })
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = session.user.email
    const stripe = new Stripe(stripeSecretKey)

    const customers = await stripe.customers.list({ email, limit: 1 })
    const customer = customers.data[0]
    if (!customer) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 })
    }

    const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 10 })
    const sub = subs.data.find((s) => s.cancel_at_period_end && ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status))
    if (!sub) {
      return NextResponse.json({ error: 'No cancel-pending subscription to resume' }, { status: 404 })
    }

    const updated = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false })

    return NextResponse.json({
      willCancelAtPeriodEnd: false,
      currentPeriodEnd: updated.current_period_end ? new Date(updated.current_period_end * 1000).toISOString() : null,
      subscriptionId: updated.id,
    })
  } catch (err) {
    console.error('[billing/resume] error:', err)
    return NextResponse.json({ error: 'Failed to resume subscription' }, { status: 500 })
  }
}

