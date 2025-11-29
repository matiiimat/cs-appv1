import type { NextConfig } from "next"

// Build a conservative Content Security Policy with dev-friendly allowances
function buildCSP(): string {
  const isDev = process.env.NODE_ENV !== 'production'

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    // Allow Next.js/Tailwind inline styles; consider migrating to nonces for stricter prod
    "style-src": ["'self'", "'unsafe-inline'"],
    // Next.js dev overlay may need 'unsafe-eval'; restrict to dev
    "script-src": isDev
      ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
      : ["'self'"],
    // Allow images and data URIs
    "img-src": ["'self'", "data:", "blob:"],
    // Restrict media/frame embedding
    "media-src": ["'none'"],
    "frame-src": ["'none'"],
    // Network calls from the browser
    "connect-src": isDev
      ? ["'self'", "https:", "ws:", "wss:", "http://localhost:*"]
      : ["'self'"]
  }

  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ')
}

const securityHeaders = [
  { key: 'Content-Security-Policy', value: buildCSP() },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
