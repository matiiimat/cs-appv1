import { NextRequest, NextResponse } from 'next/server'
import { MessageModel } from '@/lib/models/message'
import { parseOrgIdFromRecipient } from '@/lib/email'

// MVP inbound handler for SendGrid Inbound Parse
// Expects multipart/form-data with fields: to, from, subject, text, headers
// Attachments are ignored for MVP.

// For demo: fallback org ID (kept consistent with other routes)
const DEMO_ORGANIZATION_ID = '82ef6e9f-e0b2-419f-82e3-2468ae4c1d21'

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
    } else {
      // Fallback JSON (for local testing)
      const body = await request.json().catch(() => ({})) as any
      to = body.to || ''
      from = body.from || ''
      subject = body.subject || ''
      text = body.text || ''
      headers = body.headers || {}
    }

    const orgId = parseOrgIdFromRecipient(to) || DEMO_ORGANIZATION_ID

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

