import crypto from 'crypto';

// Token constants - base64url encoding of 32 bytes = 43 characters
export const TOKEN_LENGTH = 43;
export const TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;
export const TOKEN_EXPIRY_DAYS = 7;

// Delay before including CSAT survey in outbound emails (in milliseconds)
// Set to 0 for immediate inclusion (useful for testing)
// Production recommendation: 24 hours (24 * 60 * 60 * 1000 = 86400000)
export const CSAT_SURVEY_DELAY_MS = 0;

// Maximum length for customer feedback text
export const CSAT_FEEDBACK_MAX_LENGTH = 500;

export interface CSATToken {
  token: string;
  expiresAt: string; // ISO 8601
}

/**
 * Generate a secure CSAT token with 7-day expiry
 * Uses 32 random bytes (256 bits) - URL-safe base64 encoding
 */
export function generateCSATToken(): CSATToken {
  // Generate 32 bytes of random data, encode as URL-safe base64
  const token = crypto.randomBytes(32).toString('base64url');

  // 7-day expiry
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  return { token, expiresAt };
}

/**
 * Check if a CSAT token is still valid (not expired)
 */
export function isCSATTokenValid(expiresAt: string): boolean {
  return new Date(expiresAt) > new Date();
}

/**
 * Validate token format (for early rejection of invalid tokens)
 */
export function isValidTokenFormat(token: string | null | undefined): token is string {
  return !!token && TOKEN_REGEX.test(token);
}

/**
 * CSAT metadata structure stored in message.metadata
 */
export interface CSATMetadata {
  token: string;
  expiresAt: string;
  rating?: number;       // 1-5 stars
  feedback?: string;     // Optional text feedback
  submittedAt?: string;  // ISO 8601 timestamp of submission
}

/**
 * Type guard to check if metadata has CSAT data
 */
export function hasCSATData(metadata: Record<string, unknown> | null | undefined): metadata is { csat: CSATMetadata } {
  return !!(metadata && typeof metadata === 'object' && 'csat' in metadata && metadata.csat);
}

/**
 * Generate HTML email content with CSAT survey invitation
 * @param ratingUrl - The full URL to the rating page
 * @param companyName - Optional company name for branding
 */
export function generateCSATEmailHTML(ratingUrl: string, companyName?: string): string {
  const brandName = companyName || 'Our Team';

  return `
<div style="margin: 24px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
  <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">
    How was your experience with ${brandName}?
  </p>
  <div style="margin: 16px 0;">
    <a href="${ratingUrl}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
      Rate Your Experience
    </a>
  </div>
  <p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8;">
    Your feedback helps us improve our service
  </p>
</div>
`.trim();
}

/**
 * Generate plain text email content with CSAT survey invitation
 * @param ratingUrl - The full URL to the rating page
 */
export function generateCSATEmailText(ratingUrl: string): string {
  return `
---
How was your experience? Rate us here: <${ratingUrl}>
`.trim();
}
