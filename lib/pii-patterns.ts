/**
 * PII Detection Patterns for GDPR Compliance
 *
 * These patterns detect personally identifiable information (PII) in text
 * before sending to AI providers, ensuring customer data privacy.
 */

export interface PIIPattern {
  name: string;
  pattern: RegExp;
  placeholder: string;
  sensitivity: 'high' | 'medium' | 'low';
  description: string;
}

/**
 * Core PII detection patterns
 * Ordered by specificity (most specific first to avoid partial matches)
 */
export const PII_PATTERNS: PIIPattern[] = [
  // Credit Card Numbers (high sensitivity)
  {
    name: 'creditCard',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    placeholder: 'CARD',
    sensitivity: 'high',
    description: 'Credit/debit card numbers',
  },

  // Social Security Numbers (high sensitivity)
  {
    name: 'ssn',
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    placeholder: 'SSN',
    sensitivity: 'high',
    description: 'Social Security Numbers (US)',
  },

  // Email addresses (high sensitivity)
  {
    name: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
    placeholder: 'EMAIL',
    sensitivity: 'high',
    description: 'Email addresses',
  },

  // Phone numbers - International format
  {
    name: 'phoneIntl',
    pattern: /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g,
    placeholder: 'PHONE',
    sensitivity: 'high',
    description: 'International phone numbers',
  },

  // Phone numbers - US format
  {
    name: 'phoneUS',
    pattern: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    placeholder: 'PHONE',
    sensitivity: 'high',
    description: 'US phone numbers',
  },

  // Phone numbers - European format (common patterns)
  {
    name: 'phoneEU',
    pattern: /\b(?:0\d{1,2}[-.\s]?)?(?:\d{2}[-.\s]?){3,4}\d{2}\b/g,
    placeholder: 'PHONE',
    sensitivity: 'high',
    description: 'European phone numbers',
  },

  // IP Addresses (medium sensitivity)
  {
    name: 'ipAddress',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    placeholder: 'IP',
    sensitivity: 'medium',
    description: 'IPv4 addresses',
  },

  // Postal/ZIP codes - US
  {
    name: 'zipCodeUS',
    pattern: /\b\d{5}(?:-\d{4})?\b/g,
    placeholder: 'ZIP',
    sensitivity: 'low',
    description: 'US ZIP codes',
  },

  // Postal codes - UK
  {
    name: 'postalCodeUK',
    pattern: /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi,
    placeholder: 'POSTAL',
    sensitivity: 'low',
    description: 'UK postal codes',
  },
];

/**
 * Context patterns that help identify PII with higher confidence
 * These patterns look for surrounding context clues
 */
export const CONTEXT_PATTERNS = {
  name: [
    /(?:my name is|i am|i'm|this is|from|regards|sincerely|best|thanks|signed)\s*[,:]?\s*/i,
    /(?:customer|user|account holder|client)\s*[,:]?\s*/i,
  ],
  email: [
    /(?:email|contact|reach|write|send to)\s+(?:me at|us at|to)?\s*[,:]?\s*/i,
    /(?:my email|email address|e-mail)\s*[,:]?\s*/i,
  ],
  phone: [
    /(?:call|phone|mobile|cell|contact|reach)\s+(?:me at|us at|at)?\s*[,:]?\s*/i,
    /(?:my (?:phone|number|mobile|cell))\s*[,:]?\s*/i,
  ],
  address: [
    /(?:ship to|send to|mail to|deliver to|address)\s*[,:]?\s*/i,
    /(?:my address|shipping address|billing address|home address)\s*[,:]?\s*/i,
  ],
};

/**
 * Get pattern by name
 */
export function getPatternByName(name: string): PIIPattern | undefined {
  return PII_PATTERNS.find(p => p.name === name);
}

/**
 * Get patterns by sensitivity level
 */
export function getPatternsBySensitivity(sensitivity: 'high' | 'medium' | 'low'): PIIPattern[] {
  return PII_PATTERNS.filter(p => p.sensitivity === sensitivity);
}

/**
 * Get all high-sensitivity patterns (recommended for AI anonymization)
 */
export function getHighSensitivityPatterns(): PIIPattern[] {
  return getPatternsBySensitivity('high');
}
