import type { NextConfig } from "next"

// Force environment validation at startup
import './lib/startup-validation'

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
    // Next.js injects small inline bootstrap scripts for hydration.
    // In production we allow 'unsafe-inline' unless you implement nonces.
    "script-src": isDev
      ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
      : ["'self'", "'unsafe-inline'"],
    // Allow images and data URIs
    "img-src": ["'self'", "data:", "blob:"],
    // Restrict media/frame embedding
    "media-src": ["'none'"],
    "frame-src": ["'none'"],
    // Network calls from the browser
    "connect-src": isDev
      ? ["'self'", "https:", "ws:", "wss:", "http://localhost:*"]
      : ["'self'", "https://api.openai.com", "https://api.anthropic.com", "https://api.stripe.com"]
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
  // Security: Add HSTS header for production HTTPS enforcement
  // Note: Removed includeSubDomains to allow Vercel preview deployments with different subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  // Security: Prevent MIME type confusion attacks
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Security: Control cross-origin requests (no explicit CORS needed for same-origin app)
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
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
