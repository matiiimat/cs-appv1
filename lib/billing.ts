import Stripe from 'stripe'

export type BillingStatus = {
  isActive: boolean
  willCancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  canResume: boolean
}

export async function getBillingStatusForEmail(email: string): Promise<BillingStatus | null> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) return null

  const stripe = new Stripe(stripeSecretKey)
  const customers = await stripe.customers.list({ email, limit: 1 })
  const customer = customers.data[0]
  if (!customer) {
    return { isActive: false, willCancelAtPeriodEnd: false, currentPeriodEnd: null, canResume: false }
  }

  const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 10 })
  // Prefer an active/trialing subscription
  const activeSub = subs.data.find((s) => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status))
  if (!activeSub) {
    // No active sub — find the most recent subscription to surface period end
    const latest = subs.data
      .slice()
      .sort((a, b) => (b.current_period_end || 0) - (a.current_period_end || 0))[0]
    const endIso = latest?.current_period_end ? new Date(latest.current_period_end * 1000).toISOString() : null
    return { isActive: false, willCancelAtPeriodEnd: false, currentPeriodEnd: endIso, canResume: false }
  }

  const endIso = activeSub.current_period_end ? new Date(activeSub.current_period_end * 1000).toISOString() : null
  return {
    isActive: ['active', 'trialing'].includes(activeSub.status),
    willCancelAtPeriodEnd: Boolean(activeSub.cancel_at_period_end),
    currentPeriodEnd: endIso,
    canResume: Boolean(activeSub.cancel_at_period_end) && ['active', 'trialing', 'past_due', 'unpaid'].includes(activeSub.status),
  }
}

export function isAccessAllowedFromStatus(status: BillingStatus | null): boolean {
  if (!status) return true // if Stripe not configured, do not block
  if (status.isActive) return true
  if (status.willCancelAtPeriodEnd && status.currentPeriodEnd) {
    return new Date(status.currentPeriodEnd).getTime() > Date.now()
  }
  return false
}

