import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { email?: string; callbackURL?: string }
    const email = (body.email || '').trim()
    const rawCallback = body.callbackURL || '/app'
    // Build absolute callback URL using request origin to avoid Invalid URL
    let callbackURL = rawCallback
    try {
      const origin = new URL(request.url).origin
      if (!/^https?:\/\//i.test(rawCallback)) {
        callbackURL = `${origin}${rawCallback.startsWith('/') ? rawCallback : '/' + rawCallback}`
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
    } catch (err) {
      // Map common provider errors to a clearer response
      const message = err instanceof Error ? err.message : ''
      if (process.env.NODE_ENV !== 'production') {
        console.error('[guarded-magic-link] send error:', err)
      }
      // If email provider failed, surface a specific error
      return NextResponse.json({ error: 'email_send_failed', detail: message }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'failed_to_send' }, { status: 500 })
  }
}
