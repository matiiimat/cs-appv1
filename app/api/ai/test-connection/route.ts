import { NextResponse, type NextRequest } from "next/server"
import { auth } from '@/lib/auth/server'

// Simple in-memory rate limiter per authenticated user
// Limits: 5 requests per 5 minutes
const WINDOW_MS = 5 * 60 * 1000
const LIMIT = 5
type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

function rateLimitKey(email: string): string {
  return `ai-test:${email.toLowerCase()}`
}

function checkRateLimit(email: string): { allowed: boolean; retryAfterSec?: number } {
  const key = rateLimitKey(email)
  const now = Date.now()
  let b = buckets.get(key)
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS }
    buckets.set(key, b)
  }
  if (b.count >= LIMIT) {
    const retryAfterSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000))
    return { allowed: false, retryAfterSec }
  }
  b.count += 1
  return { allowed: true }
}

export async function POST(request: NextRequest) {
  try {
    // Require authenticated session
    const session = await auth.api.getSession({ headers: request.headers })
    const email = session?.user?.email
    if (!email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Enforce simple per-user rate limit
    const rl = checkRateLimit(email)
    if (!rl.allowed) {
      return new NextResponse(JSON.stringify({ success: false, error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...(rl.retryAfterSec ? { 'Retry-After': String(rl.retryAfterSec) } : {}),
        },
      })
    }

    const { provider, apiKey, model } = await request.json() as {
      provider: 'openai' | 'anthropic';
      apiKey: string;
      model?: string;
    }

    if (!provider || !apiKey) {
      return NextResponse.json({ success: false, error: 'provider and apiKey are required' }, { status: 400 })
    }

    if (provider === 'openai') {
      // Strict test: minimal chat completion
      const testModel = model || 'gpt-3.5-turbo'
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: testModel,
          messages: [
            { role: 'system', content: 'You are a test system.' },
            { role: 'user', content: 'ping' }
          ],
          max_tokens: 1,
          temperature: 0,
        })
      })

      if (!resp.ok) {
        let msg = `OpenAI API error: ${resp.status} ${resp.statusText}`
        if (resp.status === 401) msg = 'Invalid API key. Please check your OpenAI API key.'
        if (resp.status === 429) msg = 'Rate limit exceeded. Please try again later.'
        try {
          const data = await resp.json()
          // Security: Don't expose detailed API error messages in production
          if (data?.error?.message && process.env.NODE_ENV !== 'production') {
            msg = `OpenAI API error: ${data.error.message}`
          }
        } catch {}
        return NextResponse.json({ success: false, error: msg }, { status: 200 })
      }

      return NextResponse.json({ success: true })
    }

    if (provider === 'anthropic') {
      // Strict test: minimal message
      const testModel = model || 'claude-3-haiku-20240307'
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey.trim(),
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: testModel,
          max_tokens: 1,
          temperature: 0,
          messages: [ { role: 'user', content: 'ping' } ]
        })
      })

      if (!resp.ok) {
        let msg = `Anthropic API error: ${resp.status} ${resp.statusText}`
        if (resp.status === 401) msg = 'Invalid API key. Please check your Anthropic API key.'
        if (resp.status === 429) msg = 'Rate limit exceeded. Please try again later.'
        try {
          const data = await resp.json()
          // Security: Don't expose detailed API error messages in production
          if (data?.error?.message && process.env.NODE_ENV !== 'production') {
            msg = `Anthropic API error: ${data.error.message}`
          }
        } catch {}
        return NextResponse.json({ success: false, error: msg }, { status: 200 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: `Unknown provider: ${provider}` }, { status: 400 })
  } catch (error) {
    // Security: Don't expose detailed error messages in production
    const message = process.env.NODE_ENV === 'production'
      ? 'Connection test failed'
      : (error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
