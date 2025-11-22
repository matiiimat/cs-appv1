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

export async function GET(req: NextRequest) {
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
      return NextResponse.json({
        isActive: false,
        willCancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        canResume: false,
      })
    }

    const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 10 })
    const activeSub = subs.data.find((s) => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status))
    if (!activeSub) {
      return NextResponse.json({
        isActive: false,
        willCancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        canResume: false,
      })
    }

    const end = getUnixTs(activeSub, 'current_period_end')
    const currentPeriodEndIso = end ? new Date(end * 1000).toISOString() : null

    return NextResponse.json({
      isActive: ['active', 'trialing'].includes(activeSub.status),
      willCancelAtPeriodEnd: Boolean(activeSub.cancel_at_period_end),
      currentPeriodEnd: currentPeriodEndIso,
      canResume: Boolean(activeSub.cancel_at_period_end) && ['active', 'trialing', 'past_due', 'unpaid'].includes(activeSub.status),
    })
  } catch (err) {
    console.error('[billing/status] error:', err)
    return NextResponse.json({ error: 'Failed to fetch billing status' }, { status: 500 })
  }
}
