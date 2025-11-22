import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/lib/auth/server'
import Stripe from 'stripe'

function getUnixTs(obj: unknown, key: string): number | null {
  if (obj && typeof obj === 'object') {
    const v = (obj as Record<string, unknown>)[key]
    if (typeof v === 'number') return v
  }
  return null
}

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

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email, limit: 1 })
    const customer = customers.data[0]
    if (!customer) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 })
    }

    // Find the active/trialing subscription
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 10 })
    const activeSub = subs.data.find((s) => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status))
    if (!activeSub) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // If already set, just return current state
    if ((activeSub as unknown as Record<string, unknown>)['cancel_at_period_end'] === true) {
      return NextResponse.json({
        willCancelAtPeriodEnd: true,
        currentPeriodEnd: (() => {
          const end = getUnixTs(activeSub, 'current_period_end')
          return end ? new Date(end * 1000).toISOString() : null
        })(),
        subscriptionId: activeSub.id,
      })
    }

    const updated = await stripe.subscriptions.update(activeSub.id, { cancel_at_period_end: true })

    return NextResponse.json({
      willCancelAtPeriodEnd: true,
      currentPeriodEnd: (() => {
        const end = getUnixTs(updated, 'current_period_end')
        return end ? new Date(end * 1000).toISOString() : null
      })(),
      subscriptionId: updated.id,
    })
  } catch (err) {
    console.error('[billing/cancel] error:', err)
    return NextResponse.json({ error: 'Failed to schedule cancellation' }, { status: 500 })
  }
}
