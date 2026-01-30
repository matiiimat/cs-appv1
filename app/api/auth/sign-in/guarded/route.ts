import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/lib/auth/server'
import { withRateLimit } from '@/lib/rate-limiter'
import { verifyTurnstileToken, getClientIp } from '@/lib/turnstile'
import { maskEmail } from '@/lib/utils'

// Ensure Node.js runtime (SendGrid + server fetch)
export const runtime = 'nodejs'

// Simple in-memory deduplication to prevent double requests
const recentRequests = new Map<string, number>()

async function handler(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      email?: string
      callbackURL?: string
      turnstileToken?: string
    }
    const email = (body.email || '').trim()
    const rawCallback = body.callbackURL || '/app'
    const turnstileToken = body.turnstileToken || ''

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

    // Verify Turnstile token (if configured)
    // This runs BEFORE rate limiting to block bots early
    const clientIp = getClientIp(request.headers)
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp)
    if (!turnstileResult.success) {
      console.log(`[magic-link] Turnstile verification failed for ${maskEmail(email)}: ${turnstileResult.error}`)
      return NextResponse.json(
        { error: 'captcha_failed', message: turnstileResult.error },
        { status: 400 }
      )
    }

    // NOTE: User/org provisioning is now deferred to after magic link verification.
    // This happens via databaseHooks.user.create.after in lib/auth/server.ts
    // This prevents database pollution from unverified email submissions.

    // Prevent duplicate requests within 5 seconds
    const now = Date.now()
    const requestKey = `magic-link-${email}`
    const lastRequest = recentRequests.get(requestKey)

    if (lastRequest && (now - lastRequest) < 5000) {
      console.log(`[magic-link] Duplicate request blocked for ${maskEmail(email)} (within 5s)`)
      return NextResponse.json({ ok: true }) // Return success to avoid confusing the user
    }

    recentRequests.set(requestKey, now)

    // Clean up old entries (keep map from growing indefinitely)
    if (recentRequests.size > 1000) {
      const cutoff = now - 60000 // 1 minute
      for (const [key, time] of recentRequests.entries()) {
        if (time < cutoff) {
          recentRequests.delete(key)
        }
      }
    }

    try {
      console.log(`[magic-link] Attempting direct API call for ${maskEmail(email)}`)
      await auth.api.signInMagicLink({
        body: { email, callbackURL },
        headers: request.headers,
      })
      console.log(`[magic-link] SUCCESS - Direct API worked for ${maskEmail(email)}`)
    } catch (directErr) {
      console.log(`[magic-link] Direct API failed for ${maskEmail(email)}, trying fallback:`, directErr instanceof Error ? directErr.message : directErr)

      // Use fallback but with deduplication
      try {
        console.log(`[magic-link] Attempting fallback for ${maskEmail(email)}`)
        const resp = await fetch(`${origin}/api/auth/sign-in/magic-link`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
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
          console.log(`[magic-link] Fallback failed for ${maskEmail(email)}:`, detail)
          return NextResponse.json(
            { error: 'email_send_failed', detail },
            { status: 502 }
          )
        }
        console.log(`[magic-link] SUCCESS - Fallback worked for ${maskEmail(email)}`)
      } catch (fallbackErr) {
        const message = fallbackErr instanceof Error ? fallbackErr.message : ''
        console.error('[magic-link] Both direct and fallback failed for', maskEmail(email), ':', fallbackErr)
        return NextResponse.json({ error: 'email_send_failed', detail: message }, { status: 502 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'failed_to_send' }, { status: 500 })
  }
}

// Apply rate limiting: 5 login attempts per 15 minutes
export const POST = withRateLimit(handler, 'auth')
