/**
 * Production-ready rate limiting middleware
 * Prevents brute force attacks, API abuse, and DoS attacks
 */

import { NextRequest, NextResponse } from 'next/server'

// Rate limit store types
interface RateLimitEntry {
  count: number
  windowStart: number
  firstRequest: number
}

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Maximum requests per window
  message?: string      // Custom error message
  skipSuccessfulRequests?: boolean  // Only count failed requests
  keyGenerator?: (req: NextRequest) => string  // Custom key generation
}

// In-memory store (upgradeable to Redis for production scale)
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key)
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry)
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      // Remove entries older than 1 hour
      if (now - entry.windowStart > 3600000) {
        this.store.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }
}

// Global rate limit store
const globalStore = new RateLimitStore()

// Default configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints - strict limits
  auth: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,             // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: true
  },

  // AI endpoints - moderate limits (expensive operations)
  ai: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 10,            // 10 requests per minute
    message: 'AI API rate limit exceeded, please slow down'
  },

  // General API endpoints
  api: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 60,            // 60 requests per minute
    message: 'Too many requests, please try again later'
  },

  // Email/message endpoints
  email: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 20,            // 20 emails per minute
    message: 'Email rate limit exceeded, please slow down'
  },

  // Public endpoints (more lenient)
  public: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 100,           // 100 requests per minute
    message: 'Rate limit exceeded'
  }
} as const

/**
 * Extract client identifier from request
 * Uses IP address with fallbacks for various proxy configurations
 */
function getClientIdentifier(req: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfConnectingIp = req.headers.get('cf-connecting-ip')  // Cloudflare

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first
    return forwardedFor.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Fallback to remote address (may be proxy IP)
  // Note: In Next.js edge runtime, we might not have access to connection info
  return req.headers.get('host') || 'unknown'
}

/**
 * Rate limiter middleware factory
 * Creates a rate limiter with specified configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async function rateLimiter(
    req: NextRequest
  ): Promise<NextResponse | null> {
    // Generate rate limit key
    const keyGenerator = config.keyGenerator || ((req) => {
      const clientId = getClientIdentifier(req)
      const path = new URL(req.url).pathname
      return `rate_limit:${clientId}:${path}`
    })

    const key = keyGenerator(req)
    const now = Date.now()

    // Get or create rate limit entry
    let entry = globalStore.get(key)

    if (!entry) {
      // First request from this client
      entry = {
        count: 1,
        windowStart: now,
        firstRequest: now
      }
      globalStore.set(key, entry)
      return null // Allow first request
    }

    // Check if we're still in the same window
    if (now - entry.windowStart > config.windowMs) {
      // Window expired, reset
      entry = {
        count: 1,
        windowStart: now,
        firstRequest: now
      }
      globalStore.set(key, entry)
      return null // Allow request
    }

    // Increment counter
    entry.count++
    globalStore.set(key, entry)

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      // Calculate retry-after
      const retryAfter = Math.ceil((entry.windowStart + config.windowMs - now) / 1000)

      // Log suspicious activity
      if (entry.count === config.maxRequests + 1) {
        console.warn(`[Rate Limit] Limit exceeded for ${key}: ${entry.count} requests in window`)
      }

      // Return rate limit error
      return NextResponse.json(
        {
          error: config.message || 'Too many requests',
          retryAfter: retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.windowStart + config.windowMs).toISOString()
          }
        }
      )
    }

    // Request allowed, but add rate limit headers
    return null
  }
}

/**
 * Apply rate limiting to a handler function
 */
export function withRateLimit<T extends (req: NextRequest) => Promise<NextResponse>>(
  handler: T,
  config: RateLimitConfig | keyof typeof RATE_LIMIT_CONFIGS
): T {
  const limiterConfig = typeof config === 'string'
    ? RATE_LIMIT_CONFIGS[config]
    : config

  const limiter = createRateLimiter(limiterConfig)

  return (async (req: NextRequest) => {
    // Check rate limit
    const rateLimitResponse = await limiter(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Call original handler
    return handler(req)
  }) as T
}

/**
 * Rate limit middleware for specific user-based operations
 * Useful for authenticated endpoints
 */
export function createUserRateLimiter(
  getUserId: (req: NextRequest) => string | null,
  config: RateLimitConfig
) {
  return createRateLimiter({
    ...config,
    keyGenerator: (req) => {
      const userId = getUserId(req)
      if (!userId) {
        // Fallback to IP-based limiting if no user ID
        return `rate_limit:ip:${getClientIdentifier(req)}:${new URL(req.url).pathname}`
      }
      return `rate_limit:user:${userId}:${new URL(req.url).pathname}`
    }
  })
}

// Export store for testing purposes
export const __testStore = globalStore