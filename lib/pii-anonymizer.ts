/**
 * PII Anonymization Module for GDPR Compliance
 *
 * This module detects and anonymizes personally identifiable information (PII)
 * before sending data to AI providers, then re-hydrates the response with
 * original values.
 *
 * Usage:
 *   const anonymizer = new PIIAnonymizer()
 *   const { anonymizedText } = anonymizer.anonymize("Contact john@example.com")
 *   // anonymizedText: "Contact [EMAIL_1]"
 *   const original = anonymizer.rehydrate("Dear [EMAIL_1]...")
 *   // original: "Dear john@example.com..."
 */

import { PII_PATTERNS, type PIIPattern } from '@/lib/pii-patterns';

export interface PIIDetection {
  type: string;
  original: string;
  placeholder: string;
  position: { start: number; end: number };
}

export interface AnonymizationResult {
  anonymizedText: string;
  detections: PIIDetection[];
  stats: {
    totalDetected: number;
    byType: Record<string, number>;
  };
}

export interface AnonymizationOptions {
  /** Specific pattern types to include (if empty, uses all) */
  includeTypes?: string[];
  /** Pattern types to exclude */
  excludeTypes?: string[];
  /** Known values to always anonymize (e.g., customer name/email from form fields) */
  knownPII?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export class PIIAnonymizer {
  private anonymizationMap: Map<string, string> = new Map();
  private reverseMap: Map<string, string> = new Map();
  private counters: Map<string, number> = new Map();

  constructor(private options: AnonymizationOptions = {}) {}

  /**
   * Anonymize text by replacing PII with placeholders
   */
  anonymize(text: string): AnonymizationResult {
    if (!text) {
      return {
        anonymizedText: text,
        detections: [],
        stats: { totalDetected: 0, byType: {} },
      };
    }

    let anonymizedText = text;
    const detections: PIIDetection[] = [];
    const byType: Record<string, number> = {};

    // First, handle known PII values (from form fields)
    if (this.options.knownPII) {
      anonymizedText = this.anonymizeKnownPII(anonymizedText, detections, byType);
    }

    // Then, detect and anonymize pattern-based PII
    const patterns = this.getActivePatterns();

    for (const pattern of patterns) {
      // Reset regex lastIndex for global patterns
      pattern.pattern.lastIndex = 0;

      // Find all matches
      const matches: RegExpExecArray[] = [];
      let match: RegExpExecArray | null;

      while ((match = pattern.pattern.exec(anonymizedText)) !== null) {
        matches.push({ ...match } as RegExpExecArray);
      }

      // Process matches in reverse order to preserve positions
      for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const original = m[0];

        // Skip if already anonymized (starts with [)
        if (original.startsWith('[')) continue;

        // Skip if this is a known value that was already handled
        if (this.reverseMap.has(original)) continue;

        const placeholder = this.getPlaceholder(pattern.placeholder, original);

        anonymizedText =
          anonymizedText.slice(0, m.index) +
          placeholder +
          anonymizedText.slice(m.index + original.length);

        detections.push({
          type: pattern.name,
          original,
          placeholder,
          position: { start: m.index, end: m.index + original.length },
        });

        byType[pattern.name] = (byType[pattern.name] || 0) + 1;
      }
    }

    return {
      anonymizedText,
      detections,
      stats: {
        totalDetected: detections.length,
        byType,
      },
    };
  }

  /**
   * Anonymize multiple fields at once
   */
  anonymizeFields(fields: Record<string, string | null | undefined>): Record<string, string | null | undefined> {
    const result: Record<string, string | null | undefined> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (value) {
        result[key] = this.anonymize(value).anonymizedText;
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Re-hydrate anonymized text with original values
   */
  rehydrate(text: string): string {
    if (!text) return text;

    let result = text;

    // Replace all placeholders with original values
    for (const [placeholder, original] of this.anonymizationMap.entries()) {
      // Use a while loop to replace all occurrences
      while (result.includes(placeholder)) {
        result = result.replace(placeholder, original);
      }
    }

    return result;
  }

  /**
   * Get the anonymization map (for debugging/logging)
   */
  getAnonymizationMap(): Map<string, string> {
    return new Map(this.anonymizationMap);
  }

  /**
   * Reset the anonymizer state
   */
  reset(): void {
    this.anonymizationMap.clear();
    this.reverseMap.clear();
    this.counters.clear();
  }

  /**
   * Handle known PII values from form fields
   */
  private anonymizeKnownPII(
    text: string,
    detections: PIIDetection[],
    byType: Record<string, number>
  ): string {
    let result = text;
    const { knownPII } = this.options;

    if (knownPII?.name && knownPII.name.trim()) {
      const name = knownPII.name.trim();
      // Case-insensitive check and replacement for names
      if (result.toLowerCase().includes(name.toLowerCase())) {
        const placeholder = this.getPlaceholder('NAME', name);
        // Case-insensitive replacement
        const regex = new RegExp(this.escapeRegex(name), 'gi');
        result = result.replace(regex, placeholder);
        detections.push({
          type: 'knownName',
          original: name,
          placeholder,
          position: { start: -1, end: -1 }, // Multiple positions
        });
        byType['knownName'] = (byType['knownName'] || 0) + 1;
      }
    }

    if (knownPII?.email && knownPII.email.trim()) {
      const email = knownPII.email.trim();
      if (result.toLowerCase().includes(email.toLowerCase())) {
        const placeholder = this.getPlaceholder('EMAIL', email);
        // Case-insensitive replacement
        const regex = new RegExp(this.escapeRegex(email), 'gi');
        result = result.replace(regex, placeholder);
        detections.push({
          type: 'knownEmail',
          original: email,
          placeholder,
          position: { start: -1, end: -1 },
        });
        byType['knownEmail'] = (byType['knownEmail'] || 0) + 1;
      }
    }

    if (knownPII?.phone && knownPII.phone.trim()) {
      const phone = knownPII.phone.trim();
      // Build flexible pattern that matches phone with various separators
      const phonePattern = new RegExp(
        phone
          .split('')
          .map(c => (c.match(/\d/) ? c : `[-.\\s()]*`))
          .join(''),
        'g'
      );

      if (phonePattern.test(result)) {
        const placeholder = this.getPlaceholder('PHONE', phone);
        result = result.replace(phonePattern, placeholder);
        detections.push({
          type: 'knownPhone',
          original: phone,
          placeholder,
          position: { start: -1, end: -1 },
        });
        byType['knownPhone'] = (byType['knownPhone'] || 0) + 1;
      }
    }

    return result;
  }

  /**
   * Get active patterns based on options
   */
  private getActivePatterns(): PIIPattern[] {
    let patterns = [...PII_PATTERNS];

    if (this.options.includeTypes && this.options.includeTypes.length > 0) {
      patterns = patterns.filter(p => this.options.includeTypes!.includes(p.name));
    }

    if (this.options.excludeTypes && this.options.excludeTypes.length > 0) {
      patterns = patterns.filter(p => !this.options.excludeTypes!.includes(p.name));
    }

    return patterns;
  }

  /**
   * Generate a unique placeholder for a PII value
   */
  private getPlaceholder(type: string, original: string): string {
    // Check if we already have a placeholder for this value
    if (this.reverseMap.has(original)) {
      return this.reverseMap.get(original)!;
    }

    // Check case-insensitive for emails
    const lowerOriginal = original.toLowerCase();
    for (const [key, placeholder] of this.reverseMap.entries()) {
      if (key.toLowerCase() === lowerOriginal) {
        return placeholder;
      }
    }

    // Generate new placeholder
    const count = (this.counters.get(type) || 0) + 1;
    this.counters.set(type, count);

    const placeholder = `[${type}_${count}]`;

    // Store mappings
    this.anonymizationMap.set(placeholder, original);
    this.reverseMap.set(original, placeholder);

    return placeholder;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/**
 * Convenience function for one-shot anonymization
 */
export function anonymizeText(
  text: string,
  options?: AnonymizationOptions
): { anonymized: string; rehydrate: (text: string) => string } {
  const anonymizer = new PIIAnonymizer(options);
  const { anonymizedText } = anonymizer.anonymize(text);

  return {
    anonymized: anonymizedText,
    rehydrate: (t: string) => anonymizer.rehydrate(t),
  };
}

/**
 * Create an anonymizer with known customer PII
 * This is the primary entry point for the generate-response API
 */
export function createCustomerAnonymizer(customer: {
  name?: string;
  email?: string;
  phone?: string;
}): PIIAnonymizer {
  return new PIIAnonymizer({
    knownPII: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
  });
}
