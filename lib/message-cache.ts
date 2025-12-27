/**
 * LRU cache for decrypted message data
 * Reduces redundant decryption operations by caching Message objects
 */

import { LRUCache } from 'lru-cache';
import type { Message } from '@/lib/models/message';

/**
 * Message cache configuration
 * - 500 message capacity (reasonable memory footprint)
 * - 5 minute TTL (balances freshness vs. performance)
 * - Message ID as key (UUIDs are globally unique)
 */
const CACHE_CONFIG = {
  max: 500,
  ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
};

/**
 * Cache for decrypted message data
 * Stores fully decrypted Message objects keyed by message ID
 */
class MessageCache {
  private cache: LRUCache<string, Message>;

  constructor() {
    this.cache = new LRUCache<string, Message>(CACHE_CONFIG);
  }

  /**
   * Get cached message by ID
   * @param messageId - UUID of the message
   * @returns Cached message or undefined if not found/expired
   */
  get(messageId: string): Message | undefined {
    return this.cache.get(messageId);
  }

  /**
   * Store decrypted message in cache
   * @param messageId - UUID of the message
   * @param message - Fully decrypted message object
   */
  set(messageId: string, message: Message): void {
    this.cache.set(messageId, message);
  }

  /**
   * Invalidate cached message (on update/transition)
   * @param messageId - UUID of the message to invalidate
   */
  invalidate(messageId: string): void {
    this.cache.delete(messageId);
  }

  /**
   * Clear entire cache (for testing/admin purposes)
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns Current cache size and capacity info
   */
  getStats(): { size: number; max: number; ttl: number } {
    return {
      size: this.cache.size,
      max: CACHE_CONFIG.max,
      ttl: CACHE_CONFIG.ttl,
    };
  }
}

// Global singleton instance
export const messageCache = new MessageCache();
