import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'

// Ensure Node.js runtime (SendGrid + server fetch)
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { email?: string; callbackURL?: string }
    const email = (body.email || '').trim()
    const rawCallback = body.callbackURL || '/app'
    // Build absolute callback URL using request origin to avoid Invalid URL
    let callbackURL = rawCallback
    // Resolve request origin + headers used for downstream calls
    let origin = ''
    let host = ''
    let proto = 'https'
    try {
      const u = new URL(request.url)
      origin = u.origin
      host = u.host
      proto = u.protocol.replace(':', '') || 'https'
      const originStr = u.origin
      if (!/^https?:\/\//i.test(rawCallback)) {
        callbackURL = `${originStr}${rawCallback.startsWith('/') ? rawCallback : '/' + rawCallback}`
      }
    } catch {}
    if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 })

    const exists = await getOrgAndUserByEmail(email)
    if (!exists) {
      return NextResponse.json({ error: 'no_account' }, { status: 404 })
    }

    try {
      await auth.api.signInMagicLink({
        body: { email, callbackURL },
        headers: request.headers,
      })
    } catch {
      // Direct fetch fallback to Better Auth endpoint using absolute URL
      try {
        const resp = await fetch(`${origin}/api/auth/sign-in/magic-link`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            // Pass explicit origin/host headers so Better Auth can resolve baseURL correctly
            'origin': origin,
            'host': host,
            'x-forwarded-host': host,
            'x-forwarded-proto': proto,
          },
          body: JSON.stringify({ email, callbackURL }),
        })
        if (!resp.ok) {
          let detail = ''
          try {
            const data = await resp.json()
            detail = typeof data === 'string' ? data : JSON.stringify(data)
          } catch {
            try { detail = await resp.text() } catch {}
          }
          return NextResponse.json(
            { error: 'email_send_failed', detail },
            { status: 502 }
          )
        }
      } catch (fallbackErr) {
        const message = fallbackErr instanceof Error ? fallbackErr.message : ''
        if (process.env.NODE_ENV !== 'production') {
          console.error('[guarded-magic-link] fallback send error:', fallbackErr)
        }
        return NextResponse.json({ error: 'email_send_failed', detail: message }, { status: 502 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'failed_to_send' }, { status: 500 })
  }
}
