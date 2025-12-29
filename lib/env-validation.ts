/**
 * Environment variable validation for production security
 * Validates critical environment variables on application startup
 */

interface EnvValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validates all required environment variables
 * Returns validation result with errors and warnings
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Critical security variables - must be present
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ]

  // Important but not critical - warn if missing
  // Note: Either PRICE or PRODUCT IDs are needed, not both
  const warningVars = [
    'STRIPE_PRODUCT_PLUS_MONTHLY',
    'STRIPE_PRODUCT_PLUS_YEARLY',
  ]

  // Check required variables
  for (const varName of requiredVars) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      // Cryptic error codes for you to understand but not expose details to attackers
      errors.push(`ENV_CRITICAL_${varName.split('_')[1]}_MISSING`)
    } else if (value.length < 10) {
      // Stripe keys should be reasonably long
      errors.push(`ENV_CRITICAL_${varName.split('_')[1]}_INVALID_LENGTH`)
    }
  }

  // Check warning variables
  for (const varName of warningVars) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      warnings.push(`ENV_WARN_${varName.split('_')[2]}_MISSING`)
    }
  }

  // Validate Stripe key format (should start with sk_ for secret keys)
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (stripeKey && !stripeKey.startsWith('sk_')) {
    errors.push('ENV_CRITICAL_SECRET_INVALID_FORMAT')
  }

  // Validate webhook secret format (should start with whsec_)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (webhookSecret && !webhookSecret.startsWith('whsec_')) {
    errors.push('ENV_CRITICAL_WEBHOOK_INVALID_FORMAT')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Throws an error if environment validation fails
 * Call this during application startup
 */
export function requireValidEnvironment(): void {
  const result = validateEnvironment()

  if (result.warnings.length > 0) {
    console.warn('Environment warnings:', result.warnings.join(', '))
  }

  if (!result.valid) {
    const errorMessage = `Critical environment configuration missing. Errors: ${result.errors.join(', ')}`
    throw new Error(errorMessage)
  }
}