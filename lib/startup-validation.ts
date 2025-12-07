/**
 * Startup validation that runs during Next.js build and server startup
 * This ensures environment issues are caught early
 */

import { validateEnvironment } from './env-validation'

// Run validation immediately when this module is imported
const envResult = validateEnvironment()

if (envResult.warnings.length > 0) {
  console.warn('🟡 Environment warnings:', envResult.warnings.join(', '))
}

if (!envResult.valid) {
  console.error('🔴 Critical environment configuration issues:', envResult.errors.join(', '))

  // In production, refuse to start with missing critical environment variables
  if (process.env.NODE_ENV === 'production') {
    console.error('🔴 Production startup failed due to environment issues')
    process.exit(1) // Kill the process in production
  }

  // In development, warn loudly but continue with limited functionality
  console.error('🟡 DEVELOPMENT MODE: Continuing with placeholder values - Stripe operations will fail!')
  console.error('🟡 Add proper STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable payments')
}

// Export a function that can be called to re-validate if needed
export function revalidateEnvironment() {
  return validateEnvironment()
}