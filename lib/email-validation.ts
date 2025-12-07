/**
 * Comprehensive email validation and security library
 * Prevents email injection attacks and ensures data integrity
 */

import { z } from 'zod'

// Strict email validation schema
export const EmailSchema = z.string()
  .email('Invalid email format')
  .min(5, 'Email too short')
  .max(254, 'Email too long') // RFC 5321 limit
  .refine(
    (email) => {
      // Additional security checks
      const parts = email.split('@')
      if (parts.length !== 2) return false

      const [local, domain] = parts

      // Local part checks
      if (local.length > 64) return false // RFC 5321 limit
      if (local.startsWith('.') || local.endsWith('.')) return false
      if (local.includes('..')) return false

      // Domain checks
      if (domain.length > 253) return false
      if (domain.startsWith('-') || domain.endsWith('-')) return false

      // Security: Block suspicious patterns
      const suspiciousPatterns = [
        /[\r\n\t]/,           // Line breaks (header injection)
        /[<>]/,               // HTML/script tags
        /%0[ad]/i,            // URL-encoded CRLF
        /\\x[0-9a-f]{2}/i,    // Hex-encoded characters
        /javascript:/i,        // JavaScript protocol
        /data:/i,             // Data URLs
        /vbscript:/i,         // VBScript
      ]

      return !suspiciousPatterns.some(pattern => pattern.test(email))
    },
    'Email contains suspicious characters'
  )

// Email subject validation (prevents header injection)
export const EmailSubjectSchema = z.string()
  .max(998, 'Subject too long') // RFC 5322 limit
  .refine(
    (subject) => {
      // Block header injection attempts
      const headerInjectionPatterns = [
        /[\r\n]/,             // Line breaks
        /\bto:/i,             // Additional recipients
        /\bcc:/i,             // Carbon copy
        /\bbcc:/i,            // Blind carbon copy
        /\bfrom:/i,           // Sender spoofing
        /\breply-to:/i,       // Reply hijacking
        /\bx-/i,              // Custom headers
        /%0[ad]/i,            // URL-encoded CRLF
        /\\[rn]/i,            // Escaped line breaks
      ]

      return !headerInjectionPatterns.some(pattern => pattern.test(subject))
    },
    'Subject contains potentially malicious content'
  )

// Email body validation
export const EmailBodySchema = z.string()
  .max(50000, 'Email body too long') // Reasonable limit
  .refine(
    (body) => {
      // Block obvious malicious content
      const maliciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
        /javascript:/i,                                          // JavaScript protocol
        /vbscript:/i,                                           // VBScript
        /data:text\/html/i,                                     // HTML data URLs
        /\bon\w+\s*=/i,                                         // Event handlers (onclick, etc)
      ]

      return !maliciousPatterns.some(pattern => pattern.test(body))
    },
    'Email body contains potentially malicious content'
  )

/**
 * Sanitizes email headers to prevent injection attacks
 */
export function sanitizeEmailHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers)) {
    // Sanitize header names
    const cleanKey = key.replace(/[^\w-]/g, '').toLowerCase()

    // Skip dangerous headers
    const dangerousHeaders = [
      'bcc', 'cc', 'to', 'from', 'reply-to', 'return-path',
      'sender', 'x-', 'content-type', 'mime-version'
    ]

    if (dangerousHeaders.some(dangerous => cleanKey.includes(dangerous))) {
      continue
    }

    // Sanitize header values (remove line breaks and control characters)
    const cleanValue = String(value)
      .replace(/[\r\n\t]/g, ' ')
      .replace(/[\x00-\x1f\x7f]/g, '')
      .trim()
      .slice(0, 200) // Limit header value length

    if (cleanValue && cleanKey) {
      sanitized[cleanKey] = cleanValue
    }
  }

  return sanitized
}

/**
 * Validates and sanitizes customer email data
 */
export function validateCustomerEmail(email: string): string {
  const result = EmailSchema.safeParse(email)

  if (!result.success) {
    throw new Error(`Invalid email: ${result.error.issues[0]?.message}`)
  }

  // Additional normalization
  return result.data.toLowerCase().trim()
}

/**
 * Validates email subject line
 */
export function validateEmailSubject(subject: string): string {
  const result = EmailSubjectSchema.safeParse(subject)

  if (!result.success) {
    throw new Error(`Invalid subject: ${result.error.issues[0]?.message}`)
  }

  // Normalize whitespace
  return subject.replace(/\s+/g, ' ').trim()
}

/**
 * Validates email body content
 */
export function validateEmailBody(body: string): string {
  const result = EmailBodySchema.safeParse(body)

  if (!result.success) {
    throw new Error(`Invalid email body: ${result.error.issues[0]?.message}`)
  }

  return body
}

/**
 * Comprehensive email validation for API endpoints
 */
export interface ValidatedEmailData {
  customerEmail: string
  subject: string
  body: string
  metadata: Record<string, string>
}

export function validateEmailData(data: {
  customerEmail?: string
  subject?: string
  body?: string
  metadata?: unknown
}): ValidatedEmailData {
  const errors: string[] = []

  // Validate customer email
  let customerEmail = ''
  if (data.customerEmail) {
    try {
      customerEmail = validateCustomerEmail(data.customerEmail)
    } catch (err) {
      errors.push(`Customer email: ${err instanceof Error ? err.message : 'Invalid'}`)
    }
  }

  // Validate subject
  let subject = ''
  if (data.subject) {
    try {
      subject = validateEmailSubject(data.subject)
    } catch (err) {
      errors.push(`Subject: ${err instanceof Error ? err.message : 'Invalid'}`)
    }
  }

  // Validate body
  let body = ''
  if (data.body) {
    try {
      body = validateEmailBody(data.body)
    } catch (err) {
      errors.push(`Body: ${err instanceof Error ? err.message : 'Invalid'}`)
    }
  }

  // Validate and sanitize metadata
  let metadata: Record<string, string> = {}
  if (data.metadata && typeof data.metadata === 'object') {
    metadata = sanitizeEmailHeaders(data.metadata as Record<string, string>)
  }

  if (errors.length > 0) {
    throw new Error(`Email validation failed: ${errors.join(', ')}`)
  }

  return { customerEmail, subject, body, metadata }
}