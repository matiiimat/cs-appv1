import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/lib/auth/server'
import Stripe from 'stripe'

export interface Invoice {
  id: string
  date: string
  amount: number
  status: string
  invoice_pdf: string | null
  description: string | null
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

    // Find customer by email
    const customers = await stripe.customers.list({ email, limit: 1 })
    const customer = customers.data[0]

    if (!customer) {
      // No customer = no invoices (free plan user who never subscribed)
      return NextResponse.json({ invoices: [] })
    }

    // Fetch invoices for this customer
    const invoices = await stripe.invoices.list({
      customer: customer.id,
      limit: 24, // Last 2 years of monthly invoices
    })

    const formattedInvoices: Invoice[] = invoices.data
      .filter((invoice) => invoice.id) // Filter out any without an ID
      .map((invoice) => ({
        id: invoice.id!,
        date: invoice.created ? new Date(invoice.created * 1000).toISOString() : '',
        amount: invoice.amount_paid || invoice.amount_due || 0,
        status: invoice.status || 'unknown',
        invoice_pdf: invoice.invoice_pdf || null,
        description: invoice.lines.data[0]?.description || null,
      }))

    return NextResponse.json({ invoices: formattedInvoices })
  } catch (err) {
    console.error('[billing/invoices] error:', err)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}
