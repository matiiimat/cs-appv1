import { NextRequest, NextResponse } from 'next/server'
import { MessageModel } from '@/lib/models/message'
import { parseOrgIdFromRecipient } from '@/lib/email'
import { db } from '@/lib/database'

// MVP inbound handler for SendGrid Inbound Parse
// Expects multipart/form-data with fields: to, from, subject, text, headers
// Attachments are ignored for MVP.

// No demo fallback: require a valid org alias in recipient

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let to = ''
    let from = ''
    let subject = ''
    let text = ''
    let headers: Record<string, string> = {}

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      to = (form.get('to') as string) || ''
      from = (form.get('from') as string) || ''
      subject = (form.get('subject') as string) || ''
      text = (form.get('text') as string) || ''
      const hdr = (form.get('headers') as string) || ''
      if (hdr) {
        // Best-effort parse key: value per line
        headers = Object.fromEntries(
          hdr
            .split('\n')
            .map((l) => l.split(':'))
            .filter((p) => p.length >= 2)
            .map(([k, ...rest]) => [k.trim().toLowerCase(), rest.join(':').trim()])
        )
      }
      // Fallback to Parse envelope JSON if 'to' missing
      if (!to) {
        const envStr = (form.get('envelope') as string) || ''
        try {
          const env = JSON.parse(envStr) as { to?: string[] }
          if (Array.isArray(env?.to) && env.to.length > 0) {
            to = env.to[0]
          }
        } catch {}
      }
      // If comma-separated, take first
      if (to && to.includes(',')) {
        to = to.split(',')[0]?.trim() || to
      }
    } else {
      // Fallback JSON (for local testing)
      interface InboundBody {
        to?: string
        from?: string
        subject?: string
        text?: string
        headers?: Record<string, string>
      }
      const raw: unknown = await request.json().catch(() => ({}))
      const body = (raw || {}) as InboundBody
      to = body.to ?? ''
      from = body.from ?? ''
      subject = body.subject ?? ''
      text = body.text ?? ''
      headers = body.headers ?? {}
      if (to && to.includes(',')) {
        to = to.split(',')[0]?.trim() || to
      }
    }

    const orgId = parseOrgIdFromRecipient(to)
    if (!orgId) {
      return NextResponse.json({ error: 'Missing or invalid recipient alias' }, { status: 400 })
    }
    // Ensure organization exists; if not, return 404 rather than creating implicitly
    const orgCheck = await db.query<{ id: string }>('SELECT id FROM organizations WHERE id = $1', [orgId])
    if (orgCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Unknown organization' }, { status: 404 })
    }

    // Basic email parsing for name/email
    const fromMatch = (from || '').match(/"?([^"<]*)"?\s*<([^>]+)>/) || []
    const customerName = (fromMatch[1] || '').trim() || null
    const customerEmail = (fromMatch[2] || from || '').trim()

    if (!customerEmail) {
      return NextResponse.json({ error: 'Missing sender email' }, { status: 400 })
    }

    const newMessage = await MessageModel.create(orgId, {
      customer_name: customerName || customerEmail,
      customer_email: customerEmail,
      subject: subject || '(no subject)',
      message: text || '(no body)',
      metadata: {
        channel: 'email',
        provider: 'sendgrid',
        headers,
        inbound_to: to,
      },
      category: 'General Inquiry',
    })

    await MessageModel.addActivity(orgId, newMessage.id, null, 'received', { source: 'email' })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Inbound email error:', error)
    return NextResponse.json({ error: 'Failed to process inbound email' }, { status: 500 })
  }
}

// Removed demo ensure; inbound requires a pre-provisioned org via alias
