// Utility to drop header-like keys from metadata structures

const HEADER_BUCKET_KEYS = new Set([
  'headers',
  'raw_headers',
  'rawheaders',
  'email_headers',
  'raw',
])

const HEADER_FIELD_KEYS = new Set([
  'from',
  'to',
  'cc',
  'bcc',
  'reply-to',
  'return-path',
  'received',
  'authentication-results',
  'dkim-signature',
  'spf',
  'arc-seal',
  'arc-message-signature',
  'arc-authentication-results',
  'mime-version',
  'content-type',
  'content-transfer-encoding',
  'user-agent',
])

function isHeaderLikeKey(key: string): boolean {
  const k = key.toLowerCase()
  if (HEADER_BUCKET_KEYS.has(k)) return true
  if (HEADER_FIELD_KEYS.has(k)) return true
  if (k.startsWith('x-')) return true // common vendor headers
  return false
}

function sanitizeUnknown(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeUnknown(v))
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isHeaderLikeKey(k)) continue
      out[k] = sanitizeUnknown(v)
    }
    return out
  }
  return value
}

export function sanitizeMetadata(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object') return undefined
  const sanitized = sanitizeUnknown(input)
  if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
    return sanitized as Record<string, unknown>
  }
  // If metadata was not an object (e.g., array/primitive), drop it to avoid storing unexpected shapes
  return undefined
}

