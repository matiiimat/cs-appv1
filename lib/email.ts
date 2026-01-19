// No Next.js imports needed here

export interface OutboundEmail {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
  fromName?: string
}

export interface SendResult {
  ok: boolean
  providerMessageId?: string
  error?: string
}

function getEnv(name: string, required = true): string | undefined {
  const value = process.env[name]
  if (required && !value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

export class EmailService {
  static async send(out: OutboundEmail): Promise<SendResult> {
    const provider = (process.env.EMAIL_PROVIDER || 'sendgrid').toLowerCase()
    const fromEmail = getEnv('OUTBOUND_FROM_EMAIL') as string

    if (provider === 'sendgrid') {
      const apiKey = getEnv('SENDGRID_API_KEY') as string
      const content: Array<{ type: string; value: string }> = [
        { type: 'text/plain', value: out.text }
      ]
      if (out.html) {
        content.push({ type: 'text/html', value: out.html })
      }
      const payload = {
        personalizations: [
          { to: [{ email: out.to }] }
        ],
        from: out.fromName ? { email: fromEmail, name: out.fromName } : { email: fromEmail },
        subject: out.subject,
        content,
        ...(out.replyTo ? { reply_to: { email: out.replyTo } } : {}),
      }

      const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      })

      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        return { ok: false, error: `SendGrid error ${resp.status}: ${text}` }
      }
      const messageId = resp.headers.get('x-message-id') || undefined
      return { ok: true, providerMessageId: messageId }
    }

    if (provider === 'brevo') {
      const apiKey = getEnv('BREVO_API_KEY') as string
      const payload: Record<string, unknown> = {
        sender: out.fromName ? { email: fromEmail, name: out.fromName } : { email: fromEmail },
        to: [{ email: out.to }],
        subject: out.subject,
        textContent: out.text,
      }
      if (out.html) payload.htmlContent = out.html
      if (out.replyTo) payload.replyTo = { email: out.replyTo }

      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(payload),
      })

      const text = await resp.text().catch(() => '')
      if (!resp.ok) {
        return { ok: false, error: `Brevo error ${resp.status}: ${text}` }
      }
      // Brevo returns JSON with messageId; don't rely strictly on shape for MVP
      return { ok: true }
    }

    // Default: Postmark
    const serverToken = getEnv('POSTMARK_SERVER_TOKEN') as string
    const payload: Record<string, unknown> = {
      From: out.fromName ? `${out.fromName} <${fromEmail}>` : fromEmail,
      To: out.to,
      Subject: out.subject,
      TextBody: out.text,
    }
    if (out.html) payload.HtmlBody = out.html
    if (out.replyTo) payload.ReplyTo = out.replyTo

    const resp = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': serverToken,
      },
      body: JSON.stringify(payload),
    })

    let data: unknown
    let fallbackText = ''
    try {
      data = await resp.json()
    } catch {
      fallbackText = await resp.text().catch(() => '')
    }
    if (!resp.ok) {
      const maybe = (data as { Message?: string } | undefined)
      const message = (maybe && typeof maybe.Message === 'string') ? maybe.Message : fallbackText
      return { ok: false, error: `Postmark error ${resp.status}: ${message}` }
    }

    const maybeOk = (data as { MessageID?: string } | undefined)
    const messageId = (maybeOk && typeof maybeOk.MessageID === 'string') ? maybeOk.MessageID : undefined
    return { ok: true, providerMessageId: messageId }
  }
}

export function makeOrgForwardAddress(orgId: string): string {
  const domain = getEnv('INBOUND_DOMAIN') as string
  return `support+${orgId.toLowerCase()}@${domain}`
}

export function parseOrgIdFromRecipient(to: string): string | null {
  // Accept common forms like "Support <support+ORG@domain>" or raw address
  const match = to.match(/<?([^<>\s@]+)@[^>\s]+>?/)
  if (!match) return null
  const local = match[1] // e.g., support+<orgId>
  const plusIdx = local.indexOf('+')
  if (plusIdx === -1) return null
  const tag = local.slice(plusIdx + 1)
  // Tag may contain additional dots; first part is orgId in MVP
  const orgId = tag.split(/[.]/)[0]
  // Basic UUID check; tolerate lowercase
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  return uuidRe.test(orgId) ? orgId : null
}
