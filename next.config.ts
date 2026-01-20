import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next"

// Force environment validation at startup
import './lib/startup-validation'

// Build a conservative Content Security Policy with dev-friendly allowances
function buildCSP(): string {
  const isDev = process.env.NODE_ENV !== 'production'

  // Cloudflare Turnstile domains for captcha
  const turnstileDomains = [
    "https://challenges.cloudflare.com",
    "https://*.challenges.cloudflare.com",
  ]

  // LinkedIn Insight Tag domains for conversion tracking
  const linkedInDomains = [
    "https://snap.licdn.com",
    "https://px.ads.linkedin.com",
  ]

  // Vercel Analytics domains
  const vercelDomains = [
    "https://va.vercel-scripts.com",
  ]

  // Google Fonts domains
  const googleFontsDomains = [
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
  ]

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    // Allow Next.js/Tailwind inline styles + Google Fonts stylesheets
    "style-src": ["'self'", "'unsafe-inline'", ...googleFontsDomains],
    // Next.js dev overlay may need 'unsafe-eval'; restrict to dev
    // Next.js injects small inline bootstrap scripts for hydration.
    // In production we allow 'unsafe-inline' unless you implement nonces.
    // Turnstile requires loading scripts from challenges.cloudflare.com
    // LinkedIn Insight Tag and Vercel Analytics need their domains
    "script-src": isDev
      ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...turnstileDomains, ...linkedInDomains, ...vercelDomains]
      : ["'self'", "'unsafe-inline'", ...turnstileDomains, ...linkedInDomains, ...vercelDomains],
    // Allow images and data URIs + LinkedIn tracking pixel
    "img-src": ["'self'", "data:", "blob:", ...linkedInDomains],
    // Allow Google Fonts font files
    "font-src": ["'self'", "https://fonts.gstatic.com"],
    // Restrict media/frame embedding
    "media-src": ["'none'"],
    // Turnstile renders in an iframe from challenges.cloudflare.com
    "frame-src": [...turnstileDomains],
    // Network calls from the browser
    // Sentry ingest URL must be included for error reporting to work
    // LinkedIn and Vercel analytics need to phone home
    "connect-src": isDev
      ? ["'self'", "https:", "ws:", "wss:", "http://localhost:*"]
      : ["'self'", "https://api.openai.com", "https://api.anthropic.com", "https://api.stripe.com", "https://*.ingest.de.sentry.io", ...turnstileDomains, ...linkedInDomains, ...vercelDomains]
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
  // Security: Control cross-origin requests
  // Note: COEP set to 'unsafe-none' to allow LinkedIn/Vercel analytics to load
  // These are third-party scripts that don't support CORP headers
  { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "aidly-25",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
