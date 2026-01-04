/**
 * Cloudflare Turnstile verification helper
 * https://developers.cloudflare.com/turnstile/
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

/**
 * Verifies a Turnstile token with Cloudflare's API.
 * Returns { success: true } if valid, or { success: false, error: string } if invalid.
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<{ success: true } | { success: false; error: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // Skip verification in development if no secret key is configured
  if (!secretKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Turnstile] No TURNSTILE_SECRET_KEY configured, skipping verification in development')
      return { success: true }
    }
    console.error('[Turnstile] TURNSTILE_SECRET_KEY is not configured')
    return { success: false, error: 'Captcha verification is not configured' }
  }

  if (!token) {
    return { success: false, error: 'Captcha token is required' }
  }

  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)
    if (remoteIp) {
      formData.append('remoteip', remoteIp)
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      console.error('[Turnstile] API request failed:', response.status, response.statusText)
      return { success: false, error: 'Captcha verification failed' }
    }

    const result: TurnstileVerifyResponse = await response.json()

    if (result.success) {
      return { success: true }
    }

    // Log error codes for debugging
    const errorCodes = result['error-codes'] || []
    console.warn('[Turnstile] Verification failed:', errorCodes.join(', '))

    // Map common error codes to user-friendly messages
    if (errorCodes.includes('timeout-or-duplicate')) {
      return { success: false, error: 'Captcha expired. Please try again.' }
    }
    if (errorCodes.includes('invalid-input-response')) {
      return { success: false, error: 'Invalid captcha. Please try again.' }
    }

    return { success: false, error: 'Captcha verification failed. Please try again.' }
  } catch (err) {
    console.error('[Turnstile] Verification error:', err)
    return { success: false, error: 'Captcha verification failed' }
  }
}

/**
 * Extracts client IP from Next.js request headers.
 * Checks common headers set by proxies/CDNs.
 */
export function getClientIp(headers: Headers): string | undefined {
  // Cloudflare
  const cfIp = headers.get('cf-connecting-ip')
  if (cfIp) return cfIp

  // Standard proxy headers
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, first one is the client
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp

  return undefined
}
