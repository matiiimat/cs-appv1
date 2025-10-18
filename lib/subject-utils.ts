/**
 * Utilities for normalizing email subjects.
 */

/**
 * Remove all bracketed numeric tokens like "[#0001]" or "[0001]" anywhere in the subject,
 * then clean leading separators and collapse whitespace.
 */
export function sanitizeSubjectBrackets(subject: string): string {
  let s = subject || ''

  // Remove all instances of [#123], [ 123 ], [# 00123 ], etc.
  s = s.replace(/\[\s*#?\s*\d+\s*\]/g, '')

  // Remove duplicated whitespace introduced by removals
  s = s.replace(/\s{2,}/g, ' ').trim()

  // Remove leading separators (common after stripping tokens)
  s = s.replace(/^(?:[-–—:\s])+/, '')

  return s.trim()
}

