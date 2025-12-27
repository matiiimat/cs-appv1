# Performance Bottlenecks - Priority Roadmap 2026

> Analysis Date: December 2025
> Current Stack: Next.js 15, React 19, PostgreSQL, AES-256 Encryption

---

## Executive Summary

The application is well-architected for small-to-medium workloads but has **6 critical bottlenecks** that will cause serious performance degradation beyond:
- ~5,000 messages per organization
- ~50 concurrent users
- ~100,000 total records in the database

**Estimated total improvement after all fixes: 5-10x faster load times, 20x better scalability**

---

## Bottleneck Priority Matrix

| Priority | Bottleneck | Impact | Effort | ROI Score |
|:--------:|------------|:------:|:------:|:---------:|
| **#1** | Full Refresh After Every Update | 🔴 Critical | Low | ⭐⭐⭐⭐⭐ |
| **#2** | Decryption Without Caching | 🔴 Critical | Medium | ⭐⭐⭐⭐⭐ |
| **#3** | In-Memory Message Loading | 🟠 High | Medium | ⭐⭐⭐⭐ |
| **#4** | Search with Post-Decryption Filtering | 🟠 High | High | ⭐⭐⭐⭐ |
| **#5** | Offset-Based Pagination | 🟡 Medium | Medium | ⭐⭐⭐ |
| **#6** | Sequential Batch AI Processing | 🟡 Medium | Low | ⭐⭐⭐ |

---

## #1: Full Refresh After Every Update

### Severity: 🔴 CRITICAL
### ROI: ⭐⭐⭐⭐⭐ (Highest impact, lowest effort)

#### Problem

Every single action (approve, reject, edit, category change) triggers a complete data refresh:

```typescript
// lib/message-manager.tsx:249
const updateMessage = useCallback(async (id: string, updates: Partial<CustomerMessage>) => {
  // ...
  await apiClient.updateMessage(id, apiUpdates)
  await refreshData()  // 🔴 REFETCHES ALL 100 MESSAGES + DECRYPTS THEM ALL
}, [refreshData])
```

This means:
- Approving 1 message → Fetches 100 messages → Decrypts 500 fields
- Approving 10 messages rapidly → 10 API calls + 10 full refreshes = **1,000 network requests worth of data**

#### Current Impact

| Action | Current Cost | With 1000 pending |
|--------|--------------|-------------------|
| Approve 1 message | 100 messages fetched, 500 decryptions | 2-3 seconds |
| Approve 10 messages | 1000 messages fetched, 5000 decryptions | 20-30 seconds |
| Rapid triage session | UI freezes, possible timeouts | Unusable |

#### Solution: Optimistic Updates + Selective Refresh

```typescript
// PROPOSED: lib/message-manager.tsx
const updateMessage = useCallback(async (id: string, updates: Partial<CustomerMessage>) => {
  // 1. Optimistic update - instant UI feedback
  setMessages(prev => prev.map(m =>
    m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
  ))

  try {
    // 2. Persist to database
    const response = await apiClient.updateMessage(id, apiUpdates)

    // 3. Only update the single message with server response
    setMessages(prev => prev.map(m =>
      m.id === id ? convertApiMessage(response.message) : m
    ))

    // 4. Refresh stats separately (lightweight)
    const statsResponse = await apiClient.getStats()
    setStats(statsResponse.stats)

  } catch (error) {
    // 5. Rollback on failure
    await refreshData()
    throw error
  }
}, [])
```

#### Implementation Steps

1. Modify `updateMessage` to apply optimistic local state update
2. Create new `updateSingleMessage` helper that updates one message in state
3. Create `refreshStats` function that only fetches stats (not messages)
4. Add error recovery that reverts optimistic update on failure
5. Debounce stats refresh when multiple updates happen rapidly

#### Files to Modify
- `lib/message-manager.tsx` (lines 227-254)
- `lib/api-client.ts` (add `getStats` as separate lightweight call)

#### Expected Improvement
- **Before:** 2-3 seconds per action
- **After:** <100ms per action (instant feel)
- **Scalability:** Constant time regardless of message count

---

## #2: Decryption Without Caching

### Severity: 🔴 CRITICAL
### ROI: ⭐⭐⭐⭐⭐

#### Problem

Every message retrieval decrypts 5 PII fields using AES-256, with **no caching**:

```typescript
// lib/models/message.ts:91-119
private static decryptMessageData(dbRow: Record<string, unknown>, organizationKey: string): Message {
  const fieldsToDecrypt = {
    customer_name: dbRow.customer_name,      // Decrypt #1
    customer_email: dbRow.customer_email,    // Decrypt #2
    subject: dbRow.subject,                  // Decrypt #3
    message: dbRow.message,                  // Decrypt #4
    ai_suggested_response: dbRow.ai_suggested_response,  // Decrypt #5
  };
  // ... 5 AES decrypt operations PER MESSAGE
}
```

Decryption cost per operation: ~1-5ms (varies by payload size)

| Messages | Decrypt Operations | Time (est.) |
|----------|-------------------|-------------|
| 100 | 500 | 500ms - 2.5s |
| 500 | 2,500 | 2.5s - 12.5s |
| 1,000 | 5,000 | 5s - 25s |

#### Solution: Redis-Based Decryption Cache

```typescript
// PROPOSED: lib/cache/message-cache.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)
const CACHE_TTL = 300 // 5 minutes

export class MessageCache {
  static async getDecrypted(orgId: string, messageId: string): Promise<Message | null> {
    const cacheKey = `msg:${orgId}:${messageId}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)
    return null
  }

  static async setDecrypted(orgId: string, message: Message): Promise<void> {
    const cacheKey = `msg:${orgId}:${message.id}`
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(message))
  }

  static async invalidate(orgId: string, messageId: string): Promise<void> {
    await redis.del(`msg:${orgId}:${messageId}`)
  }

  static async invalidateOrg(orgId: string): Promise<void> {
    const keys = await redis.keys(`msg:${orgId}:*`)
    if (keys.length > 0) await redis.del(...keys)
  }
}
```

```typescript
// PROPOSED: lib/models/message.ts modification
static async findByOrganization(organizationId: string, options = {}) {
  const result = await db.query(/* ... */)

  const messages = await Promise.all(result.rows.map(async (row) => {
    // Check cache first
    const cached = await MessageCache.getDecrypted(organizationId, row.id)
    if (cached && cached.updated_at === row.updated_at) {
      return cached
    }

    // Decrypt and cache
    const decrypted = this.decryptMessageData(row, organizationKey)
    await MessageCache.setDecrypted(organizationId, decrypted)
    return decrypted
  }))

  return { messages, total }
}
```

#### Alternative: In-Memory LRU Cache (No Redis)

If Redis is not an option, use in-memory caching with LRU eviction:

```typescript
// PROPOSED: lib/cache/lru-cache.ts
import LRU from 'lru-cache'

const messageCache = new LRU<string, Message>({
  max: 1000,        // Max 1000 messages cached
  ttl: 1000 * 60 * 5, // 5 minute TTL
})

export const getFromCache = (orgId: string, msgId: string) =>
  messageCache.get(`${orgId}:${msgId}`)

export const setInCache = (orgId: string, msg: Message) =>
  messageCache.set(`${orgId}:${msg.id}`, msg)
```

#### Implementation Steps

1. Add Redis dependency OR implement LRU cache
2. Create cache service with get/set/invalidate methods
3. Modify `MessageModel.findByOrganization` to check cache first
4. Modify `MessageModel.update` to invalidate cache on changes
5. Add cache warm-up on application start (optional)

#### Files to Modify
- New: `lib/cache/message-cache.ts`
- `lib/models/message.ts` (lines 201-259, 365-401)
- `package.json` (add `ioredis` or `lru-cache`)

#### Expected Improvement
- **Cache hit rate:** 80-95% for active messages
- **Before:** 500ms - 2.5s for 100 messages
- **After:** <50ms for cached messages (10-50x faster)

---

## #3: In-Memory Message Loading (100 Message Limit)

### Severity: 🟠 HIGH
### ROI: ⭐⭐⭐⭐

#### Problem

The application loads a fixed batch of 100 messages into React state on every page load:

```typescript
// lib/message-manager.tsx:188-189
const [messagesResponse, statsResponse, activityResponse] = await Promise.all([
  apiClient.getMessages({ limit: 100 }),  // 🔴 Always 100, all in memory
  // ...
])

// lib/message-manager.tsx:144
const [messages, setMessages] = useState<CustomerMessage[]>([])  // All messages in state
```

Issues:
- 100 messages × ~2KB each = ~200KB in memory minimum
- All messages must be fetched before UI renders
- Cannot efficiently handle organizations with 1000+ pending messages
- No lazy loading or windowing

#### Solution: Paginated Loading with Virtual Scrolling

**Phase 1: Reduce initial load + add pagination**

```typescript
// PROPOSED: lib/message-manager.tsx
const PAGE_SIZE = 25  // Reduced from 100

const [messagePages, setMessagePages] = useState<Map<number, CustomerMessage[]>>(new Map())
const [currentPage, setCurrentPage] = useState(1)
const [totalMessages, setTotalMessages] = useState(0)

const loadPage = useCallback(async (page: number) => {
  if (messagePages.has(page)) return // Already loaded

  const response = await apiClient.getMessages({
    page,
    limit: PAGE_SIZE,
    status: 'new' // Only fetch pending messages for triage
  })

  setMessagePages(prev => new Map(prev).set(page, response.messages.map(convertApiMessage)))
  setTotalMessages(response.pagination.total)
}, [messagePages])

// Current messages for display
const currentMessages = useMemo(() => {
  return messagePages.get(currentPage) || []
}, [messagePages, currentPage])
```

**Phase 2: Virtual scrolling for list views (if needed)**

```typescript
// For any list view component
import { useVirtualizer } from '@tanstack/react-virtual'

const MessageList = ({ messages }) => {
  const parentRef = useRef(null)

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height
  })

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <MessageRow
            key={messages[virtualItem.index].id}
            message={messages[virtualItem.index]}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              height: virtualItem.size,
            }}
          />
        ))}
      </div>
    </div>
  )
}
```

#### Implementation Steps

1. Reduce `PAGE_SIZE` from 100 to 25
2. Implement page-based state management instead of single array
3. Add "Load More" or infinite scroll for dashboard views
4. Implement status-based filtering at API level (only fetch what's needed)
5. Add virtual scrolling for any list that could exceed 50 items

#### Files to Modify
- `lib/message-manager.tsx` (major refactor)
- `lib/api-client.ts` (add status filter to default calls)
- `components/customer-support-dashboard.tsx` (pagination UI)
- `package.json` (add `@tanstack/react-virtual` if needed)

#### Expected Improvement
- **Initial load:** 100 messages → 25 messages (4x faster initial render)
- **Memory:** 200KB → 50KB base (4x reduction)
- **Scalability:** Can handle 10,000+ messages with pagination

---

## #4: Search with Post-Decryption Filtering

### Severity: 🟠 HIGH
### ROI: ⭐⭐⭐⭐

#### Problem

Due to field-level encryption, search cannot use database indexes. The current implementation:

1. Fetches 2x the requested limit from database
2. Decrypts ALL fetched messages
3. Filters in application memory
4. Returns limited results

```typescript
// lib/models/message.ts:300-360
static async search(organizationId: string, query: string, options = {}) {
  // For encrypted fields, fetch MORE than needed
  params.push(limit * 2)  // 🔴 Fetch 2x to account for filtering

  const result = await db.query(query_sql, params)

  // Decrypt ALL records
  const decryptedMessages = result.rows.map(row =>
    this.decryptMessageData(row, organizationKey)  // 🔴 O(n) decryption
  )

  // Filter AFTER decryption
  filteredMessages = decryptedMessages.filter(msg => {
    return msg.subject?.toLowerCase().includes(searchQuery) // 🔴 O(n) filtering
    // ...
  })
}
```

For a search returning 50 results, this might decrypt 100+ messages.

#### Solution: Multi-Layered Search Strategy

**Layer 1: Unencrypted field search (instant)**
```typescript
// Fields that CAN be searched in database directly
const SEARCHABLE_FIELDS = ['ticket_id', 'category', 'status', 'created_at']

// Use PostgreSQL full-text search for these
WHERE ticket_id ILIKE $1
   OR category ILIKE $1
```

**Layer 2: Search index for encrypted fields**

Create a separate search index table with hashed/tokenized versions of encrypted content:

```sql
-- New table for searchable tokens
CREATE TABLE message_search_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  message_id UUID NOT NULL REFERENCES messages(id),
  field_name VARCHAR(50) NOT NULL,
  token_hash VARCHAR(64) NOT NULL,  -- SHA-256 of lowercased word
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, field_name, token_hash)
);

CREATE INDEX idx_search_tokens_org_hash
  ON message_search_tokens(organization_id, token_hash);
```

```typescript
// PROPOSED: lib/models/message-search.ts
export class MessageSearchIndex {
  static async indexMessage(orgId: string, message: Message) {
    const tokens = this.extractTokens(message)

    await db.query(`
      INSERT INTO message_search_tokens (organization_id, message_id, field_name, token_hash)
      VALUES ${tokens.map((_, i) => `($1, $2, $${i*2+3}, $${i*2+4})`).join(',')}
      ON CONFLICT DO NOTHING
    `, [orgId, message.id, ...tokens.flatMap(t => [t.field, t.hash])])
  }

  private static extractTokens(message: Message) {
    const tokens: { field: string; hash: string }[] = []
    const fields = ['subject', 'message', 'customer_email', 'customer_name']

    for (const field of fields) {
      const value = message[field as keyof Message]
      if (typeof value === 'string') {
        // Tokenize and hash each word
        const words = value.toLowerCase().split(/\s+/).filter(w => w.length > 2)
        for (const word of words) {
          tokens.push({
            field,
            hash: crypto.createHash('sha256').update(word).digest('hex').slice(0, 16)
          })
        }
      }
    }
    return tokens
  }

  static async search(orgId: string, query: string): Promise<string[]> {
    const queryHash = crypto.createHash('sha256')
      .update(query.toLowerCase())
      .digest('hex')
      .slice(0, 16)

    const result = await db.query<{ message_id: string }>(`
      SELECT DISTINCT message_id
      FROM message_search_tokens
      WHERE organization_id = $1 AND token_hash = $2
      LIMIT 100
    `, [orgId, queryHash])

    return result.rows.map(r => r.message_id)
  }
}
```

**Layer 3: Fallback to current method for complex queries**

Keep existing post-decryption search as fallback for complex/fuzzy searches.

#### Implementation Steps

1. Create `message_search_tokens` table with migration
2. Build search index service
3. Index existing messages (background job)
4. Modify search to use index first, fallback to current method
5. Update message create/update to maintain index

#### Files to Modify
- New: `lib/models/message-search.ts`
- New: `migrations/xxx_create_search_tokens.sql`
- `lib/models/message.ts` (modify `search` method)
- `app/api/messages/search/route.ts` (if exists)

#### Expected Improvement
- **Before:** O(n) decryptions for each search
- **After:** O(1) index lookup + targeted decryption
- **Search on 10,000 messages:** 10s → <500ms

---

## #5: Offset-Based Pagination

### Severity: 🟡 MEDIUM
### ROI: ⭐⭐⭐

#### Problem

Current pagination uses SQL `OFFSET` which becomes slow for deep pages:

```typescript
// lib/models/message.ts:252-254
ORDER BY ${orderBy} ${orderDirection}
LIMIT $${params.length + 1} OFFSET $${params.length + 2}
```

PostgreSQL must scan and discard `OFFSET` rows before returning results:
- Page 1 (offset 0): Fast
- Page 100 (offset 4950): Database scans 4950 rows, discards them, returns 50
- Page 1000 (offset 49950): Very slow

| Page | Offset | Estimated Query Time |
|------|--------|---------------------|
| 1 | 0 | 5ms |
| 100 | 4,950 | 50ms |
| 500 | 24,950 | 200ms |
| 1000 | 49,950 | 500ms+ |

#### Solution: Cursor-Based Pagination

```typescript
// PROPOSED: lib/models/message.ts
static async findByOrganizationCursor(
  organizationId: string,
  options: {
    cursor?: string;  // Encoded cursor (timestamp + id)
    limit?: number;
    direction?: 'next' | 'prev';
    status?: MessageStatusType;
  }
): Promise<{ messages: Message[]; nextCursor?: string; prevCursor?: string }> {
  const { cursor, limit = 25, direction = 'next', status } = options

  let whereClause = 'WHERE organization_id = $1'
  const params: unknown[] = [organizationId]
  let paramIndex = 2

  if (status) {
    whereClause += ` AND status = $${paramIndex++}`
    params.push(status)
  }

  // Decode cursor: "timestamp|id"
  if (cursor) {
    const [timestamp, id] = Buffer.from(cursor, 'base64').toString().split('|')

    if (direction === 'next') {
      whereClause += ` AND (created_at, id) < ($${paramIndex++}, $${paramIndex++})`
    } else {
      whereClause += ` AND (created_at, id) > ($${paramIndex++}, $${paramIndex++})`
    }
    params.push(timestamp, id)
  }

  const orderDir = direction === 'next' ? 'DESC' : 'ASC'

  const result = await db.query(`
    SELECT * FROM messages
    ${whereClause}
    ORDER BY created_at ${orderDir}, id ${orderDir}
    LIMIT $${paramIndex}
  `, [...params, limit + 1]) // Fetch one extra to detect if there's more

  const hasMore = result.rows.length > limit
  const messages = result.rows.slice(0, limit).map(row =>
    this.decryptMessageData(row, organizationKey)
  )

  // Generate cursors
  const encodeCursor = (msg: Message) =>
    Buffer.from(`${msg.created_at}|${msg.id}`).toString('base64')

  return {
    messages: direction === 'prev' ? messages.reverse() : messages,
    nextCursor: hasMore ? encodeCursor(messages[messages.length - 1]) : undefined,
    prevCursor: cursor ? encodeCursor(messages[0]) : undefined,
  }
}
```

#### Database Index Required

```sql
-- Add compound index for cursor pagination
CREATE INDEX idx_messages_cursor
  ON messages(organization_id, created_at DESC, id DESC);
```

#### Implementation Steps

1. Add compound index on `(organization_id, created_at, id)`
2. Create `findByOrganizationCursor` method
3. Update API endpoint to accept cursor parameter
4. Update frontend to use cursor-based pagination
5. Keep offset pagination for backward compatibility (deprecate)

#### Files to Modify
- `lib/models/message.ts` (add new method)
- `app/api/messages/route.ts` (support cursor param)
- `lib/api-client.ts` (add cursor support)
- New: `migrations/xxx_add_cursor_index.sql`

#### Expected Improvement
- **Before:** O(offset) - linear degradation
- **After:** O(1) - constant time regardless of page depth
- **Page 1000:** 500ms+ → <10ms

---

## #6: Sequential Batch AI Processing

### Severity: 🟡 MEDIUM
### ROI: ⭐⭐⭐

#### Problem

Batch AI processing runs sequentially with a fixed 500ms delay between each:

```typescript
// lib/message-manager.tsx:374-396
for (let i = 0; i < messagesToProcess.length; i++) {
  const message = messagesToProcess[i]
  const result = await generateAIResponse(message)  // 🔴 Sequential

  // Small delay between requests
  if (i < messagesToProcess.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 500))  // 🔴 Fixed delay
  }
}
```

For a batch of 50 messages:
- AI generation: ~2-5 seconds each
- Fixed delays: 500ms × 49 = 24.5 seconds
- **Total time: 2-5 minutes** (could be 30-60 seconds with parallelism)

#### Solution: Controlled Parallel Processing

```typescript
// PROPOSED: lib/message-manager.tsx
const CONCURRENT_LIMIT = 3  // Process 3 at a time
const RATE_LIMIT_DELAY = 200  // 200ms between batch starts

const processBatch = useCallback(async (batchSize: number) => {
  const unprocessedMessages = messages.filter(m => !m.aiReviewed && m.status === 'new')
  const messagesToProcess = unprocessedMessages.slice(0, batchSize)

  setIsProcessingBatch(true)
  setProcessedCount(0)
  setTotalToProcess(messagesToProcess.length)

  // Process in chunks of CONCURRENT_LIMIT
  const results: { success: boolean; usageLimitHit?: boolean }[] = []

  for (let i = 0; i < messagesToProcess.length; i += CONCURRENT_LIMIT) {
    if (cancelRequestedRef.current) break

    const chunk = messagesToProcess.slice(i, i + CONCURRENT_LIMIT)

    // Process chunk in parallel
    const chunkResults = await Promise.all(
      chunk.map(message => generateAIResponse(message))
    )

    results.push(...chunkResults)
    setProcessedCount(Math.min(i + CONCURRENT_LIMIT, messagesToProcess.length))

    // Check for usage limit
    if (chunkResults.some(r => r.usageLimitHit)) {
      break
    }

    // Rate limit between chunks
    if (i + CONCURRENT_LIMIT < messagesToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY))
    }
  }

  setIsProcessingBatch(false)
  return { usageLimitHit: results.some(r => r.usageLimitHit) }
}, [messages, generateAIResponse])
```

#### Alternative: Queue-Based Processing

For larger scale, use a proper job queue:

```typescript
// PROPOSED: Using background job queue (e.g., BullMQ)
import { Queue, Worker } from 'bullmq'

const aiQueue = new Queue('ai-generation', { connection: redis })

// Producer: Add jobs to queue
export async function queueBatchProcessing(orgId: string, messageIds: string[]) {
  const jobs = messageIds.map(id => ({
    name: 'generate-ai-response',
    data: { orgId, messageId: id }
  }))

  await aiQueue.addBulk(jobs)
}

// Consumer: Process jobs with concurrency
const worker = new Worker('ai-generation', async (job) => {
  const { orgId, messageId } = job.data
  await generateAIResponseForMessage(orgId, messageId)
}, {
  connection: redis,
  concurrency: 5,  // Process 5 jobs concurrently
  limiter: {
    max: 10,       // Max 10 jobs
    duration: 1000 // Per second
  }
})
```

#### Implementation Steps

1. Refactor `processBatch` to use `Promise.all` for chunks
2. Add configurable concurrency limit (start with 3)
3. Implement proper rate limiting based on AI provider limits
4. Add progress reporting per chunk (not per message)
5. (Optional) Migrate to job queue for enterprise scale

#### Files to Modify
- `lib/message-manager.tsx` (lines 361-408)
- (Optional) New: `lib/queue/ai-queue.ts`

#### Expected Improvement
- **Before:** 50 messages = 2-5 minutes
- **After:** 50 messages = 30-60 seconds (3-5x faster)
- **With queue:** Background processing, no UI blocking

---

## Implementation Roadmap

### Phase 1: Quick Wins (Week 1-2)

| Task | Bottleneck | Impact |
|------|-----------|--------|
| Implement optimistic updates | #1 | Instant UI feedback |
| Reduce page size to 25 | #3 | 4x faster initial load |
| Parallel batch processing | #6 | 3-5x faster batch AI |

**Estimated improvement: 3-5x faster perceived performance**

### Phase 2: Caching Layer (Week 3-4)

| Task | Bottleneck | Impact |
|------|-----------|--------|
| Implement LRU cache | #2 | 10x faster repeated access |
| Add Redis (optional) | #2 | Distributed caching |
| Cache invalidation logic | #2 | Data consistency |

**Estimated improvement: 10x faster for cached data**

### Phase 3: Database Optimization (Week 5-6)

| Task | Bottleneck | Impact |
|------|-----------|--------|
| Add cursor pagination | #5 | Constant-time deep pages |
| Add database indexes | #5 | Faster queries |
| Search token index | #4 | Fast encrypted search |

**Estimated improvement: O(1) pagination, 20x faster search**

### Phase 4: Architecture (Week 7-8)

| Task | Bottleneck | Impact |
|------|-----------|--------|
| Virtual scrolling | #3 | Handle 10K+ messages |
| Job queue for AI | #6 | Background processing |
| Full pagination refactor | #3 | Complete solution |

**Estimated improvement: Enterprise-ready scalability**

---

## Monitoring & Metrics

Add these metrics to track improvement:

```typescript
// lib/metrics.ts
export const metrics = {
  // Page load times
  initialLoadTime: performance.now(),

  // API response times
  apiCalls: new Map<string, { count: number; totalTime: number }>(),

  // Cache metrics
  cacheHits: 0,
  cacheMisses: 0,

  // Batch processing
  batchProcessingTime: 0,
  messagesProcessedPerMinute: 0,
}
```

Target metrics after optimization:
- Initial page load: <500ms
- Message action (approve/reject): <100ms
- Search results: <1s for 10K+ messages
- Batch processing: 50+ messages/minute

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Cache invalidation bugs | Implement cache versioning, add TTL |
| Optimistic update conflicts | Add conflict resolution, refresh on error |
| Search index out of sync | Background re-indexing job |
| Redis dependency | Fallback to LRU cache |
| Migration data loss | Run migrations in transaction, backup first |

---

## Conclusion

The highest-impact changes are:
1. **Optimistic updates** (immediate UX improvement, low effort)
2. **Decryption caching** (10x faster for repeated access)
3. **Reduced page size** (4x faster initial load)

These three changes alone will provide a **10-20x improvement** in perceived performance for typical usage patterns. The remaining optimizations unlock enterprise-scale capacity for organizations with 10,000+ messages.
