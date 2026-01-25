import { db } from '@/lib/database'
import { z } from 'zod'

// Knowledge base entry schema for database
export const KnowledgeBaseEntryDBSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  case_summary: z.string(),
  resolution: z.string(),
  category: z.string().nullable(),
  source_ticket_id: z.string().nullable(),
  enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type KnowledgeBaseEntryDB = z.infer<typeof KnowledgeBaseEntryDBSchema>

// Input schema for creating KB entries
export const CreateKnowledgeBaseEntryDBSchema = z.object({
  case_summary: z.string().min(1),
  resolution: z.string().min(1),
  category: z.string().optional(),
  source_ticket_id: z.string().optional(),
})

export type CreateKnowledgeBaseEntryDBInput = z.infer<typeof CreateKnowledgeBaseEntryDBSchema>

// Client-side compatible schema (for API responses)
export const KnowledgeBaseEntryClientSchema = z.object({
  id: z.string(),
  case_summary: z.string(),
  resolution: z.string(),
  category: z.string().optional(),
  source_ticket_id: z.string().optional(),
  enabled: z.boolean(),
  created_date: z.string(), // Note: using created_date to match localStorage interface
})

export type KnowledgeBaseEntryClient = z.infer<typeof KnowledgeBaseEntryClientSchema>

export class KnowledgeBaseModel {
  /**
   * Get all knowledge base entries for an organization
   */
  static async findByOrganizationId(organizationId: string): Promise<KnowledgeBaseEntryClient[]> {
    const result = await db.query(
      'SELECT id, case_summary, resolution, category, enabled, created_at FROM knowledge_base_entries WHERE organization_id = $1 ORDER BY created_at DESC',
      [organizationId]
    )

    return result.rows.map((row: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: row.id,
      case_summary: row.case_summary,
      resolution: row.resolution,
      category: row.category || undefined,
      enabled: row.enabled,
      created_date: row.created_at,
    }))
  }

  /**
   * Get enabled knowledge base entries for an organization
   */
  static async findEnabledByOrganizationId(organizationId: string): Promise<KnowledgeBaseEntryClient[]> {
    const result = await db.query(
      'SELECT id, case_summary, resolution, category, enabled, created_at FROM knowledge_base_entries WHERE organization_id = $1 AND enabled = true ORDER BY created_at DESC',
      [organizationId]
    )

    return result.rows.map((row: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: row.id,
      case_summary: row.case_summary,
      resolution: row.resolution,
      category: row.category || undefined,
      enabled: row.enabled,
      created_date: row.created_at,
    }))
  }

  /**
   * Create a new knowledge base entry
   */
  static async create(
    organizationId: string,
    entryData: CreateKnowledgeBaseEntryDBInput
  ): Promise<KnowledgeBaseEntryClient> {
    const result = await db.query(
      'INSERT INTO knowledge_base_entries (organization_id, case_summary, resolution, category, source_ticket_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, case_summary, resolution, category, source_ticket_id, enabled, created_at',
      [organizationId, entryData.case_summary, entryData.resolution, entryData.category || null, entryData.source_ticket_id || null]
    )

    const row = result.rows[0] as any // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      id: row.id,
      case_summary: row.case_summary,
      resolution: row.resolution,
      category: row.category || undefined,
      source_ticket_id: row.source_ticket_id || undefined,
      enabled: row.enabled,
      created_date: row.created_at,
    }
  }

  /**
   * Update a knowledge base entry
   */
  static async update(
    id: string,
    organizationId: string,
    updates: Partial<Pick<KnowledgeBaseEntryDB, 'case_summary' | 'resolution' | 'category' | 'enabled'>>
  ): Promise<KnowledgeBaseEntryClient | null> {
    // Build dynamic update query
    const setClauses: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (updates.case_summary !== undefined) {
      setClauses.push(`case_summary = $${paramIndex++}`)
      values.push(updates.case_summary)
    }
    if (updates.resolution !== undefined) {
      setClauses.push(`resolution = $${paramIndex++}`)
      values.push(updates.resolution)
    }
    if (updates.category !== undefined) {
      setClauses.push(`category = $${paramIndex++}`)
      values.push(updates.category)
    }
    if (updates.enabled !== undefined) {
      setClauses.push(`enabled = $${paramIndex++}`)
      values.push(updates.enabled)
    }

    if (setClauses.length === 0) {
      return null
    }

    // Add WHERE clause parameters
    values.push(id, organizationId)
    const whereIdIndex = paramIndex++
    const whereOrgIndex = paramIndex

    const query = `
      UPDATE knowledge_base_entries
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${whereIdIndex} AND organization_id = $${whereOrgIndex}
      RETURNING id, case_summary, resolution, category, enabled, created_at
    `

    const result = await db.query(query, values)

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0] as any // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      id: row.id,
      case_summary: row.case_summary,
      resolution: row.resolution,
      category: row.category || undefined,
      enabled: row.enabled,
      created_date: row.created_at,
    }
  }

  /**
   * Delete a knowledge base entry
   */
  static async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM knowledge_base_entries WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    )

    return result.rowCount > 0
  }

  /**
   * Find KB entries by source ticket IDs
   * Returns a map of ticketId -> KB entry id
   */
  static async findByTicketIds(
    organizationId: string,
    ticketIds: string[]
  ): Promise<Map<string, string>> {
    if (ticketIds.length === 0) {
      return new Map()
    }

    // Build parameterized query
    const placeholders = ticketIds.map((_, i) => `$${i + 2}`).join(',')
    const query = `
      SELECT source_ticket_id, id
      FROM knowledge_base_entries
      WHERE organization_id = $1
        AND source_ticket_id IN (${placeholders})
        AND source_ticket_id IS NOT NULL
    `

    const result = await db.query(query, [organizationId, ...ticketIds])

    const map = new Map<string, string>()
    for (const row of result.rows as { source_ticket_id: string; id: string }[]) {
      map.set(row.source_ticket_id, row.id)
    }
    return map
  }

  /**
   * Find relevant knowledge base entries by category and search terms
   */
  static async findRelevant(
    organizationId: string,
    category?: string,
    searchTerms?: string[]
  ): Promise<KnowledgeBaseEntryClient[]> {
    // Expand search terms with synonyms
    const expandedTerms = this.expandSearchTermsWithSynonyms(searchTerms || [])

    let results: KnowledgeBaseEntryClient[] = []

    // Strategy 1: Try exact category + enhanced text search
    if (category && expandedTerms.length > 0) {
      results = await this.searchWithCategoryAndTerms(organizationId, category, expandedTerms)
    }

    // Strategy 2: If no results, try broader category matching (e.g., billing-related categories)
    if (results.length === 0 && category) {
      const relatedCategories = this.getRelatedCategories(category)
      for (const relatedCategory of relatedCategories) {
        results = await this.searchWithCategoryAndTerms(organizationId, relatedCategory, expandedTerms)
        if (results.length > 0) break
      }
    }

    // Strategy 3: If still no results, try category-only search
    if (results.length === 0 && category) {
      results = await this.searchCategoryOnly(organizationId, category)
    }

    // Strategy 4: If still no results, try expanded text search across all categories
    if (results.length === 0 && expandedTerms.length > 0) {
      results = await this.searchTextOnly(organizationId, expandedTerms)
    }

    // Strategy 5: Final fallback - return most recent entries
    if (results.length === 0) {
      results = await this.searchMostRecent(organizationId)
    }

    return results.slice(0, 3) // Limit to top 3 most relevant
  }

  /**
   * Expand search terms with common synonyms, especially for pricing/billing
   */
  private static expandSearchTermsWithSynonyms(searchTerms: string[]): string[] {
    const synonyms: Record<string, string[]> = {
      // Pricing synonyms
      'price': ['pricing', 'cost', 'fee', 'rate', 'charge'],
      'pricing': ['price', 'cost', 'fee', 'rate', 'charge'],
      'cost': ['price', 'pricing', 'expense', 'fee', 'rate'],
      'plan': ['subscription', 'package', 'tier', 'option'],
      'subscription': ['plan', 'package', 'tier', 'billing'],
      'monthly': ['month', 'per-month', 'monthly-billing'],
      'annual': ['yearly', 'year', 'annually', 'annual-billing'],
      'billing': ['payment', 'invoice', 'charge', 'subscription'],
      'payment': ['billing', 'pay', 'invoice', 'charge'],
      // Technical synonyms
      'bug': ['error', 'issue', 'problem', 'defect'],
      'error': ['bug', 'issue', 'problem', 'exception'],
      'login': ['signin', 'authentication', 'auth', 'access'],
      'password': ['auth', 'authentication', 'credential', 'login']
    }

    const expanded = new Set(searchTerms)

    searchTerms.forEach(term => {
      const termLower = term.toLowerCase()
      if (synonyms[termLower]) {
        synonyms[termLower].forEach(synonym => expanded.add(synonym))
      }
    })

    return Array.from(expanded)
  }

  /**
   * Get related categories for broader matching
   */
  private static getRelatedCategories(category: string): string[] {
    const categoryGroups: Record<string, string[]> = {
      'billing': ['payment', 'subscription', 'pricing', 'invoice'],
      'payment': ['billing', 'subscription', 'pricing', 'invoice'],
      'pricing': ['billing', 'payment', 'subscription', 'cost'],
      'technical': ['bug', 'error', 'support', 'troubleshooting'],
      'support': ['technical', 'help', 'assistance', 'guidance'],
      'account': ['login', 'access', 'profile', 'settings']
    }

    const categoryLower = category.toLowerCase()
    return categoryGroups[categoryLower] || []
  }

  /**
   * Search with exact category and expanded terms
   */
  private static async searchWithCategoryAndTerms(
    organizationId: string,
    category: string,
    terms: string[]
  ): Promise<KnowledgeBaseEntryClient[]> {
    const searchQuery = terms.join(' | ') // OR search
    const query = `
      SELECT id, case_summary, resolution, category, enabled, created_at,
             ts_rank(to_tsvector('english', case_summary || ' ' || resolution),
                     plainto_tsquery('english', $3)) as rank
      FROM knowledge_base_entries
      WHERE organization_id = $1
        AND enabled = true
        AND LOWER(category) = LOWER($2)
        AND (to_tsvector('english', case_summary || ' ' || resolution) @@ plainto_tsquery('english', $3))
      ORDER BY rank DESC, created_at DESC
      LIMIT 10
    `

    const result = await db.query(query, [organizationId, category, searchQuery])
    return this.mapResultRows(result.rows)
  }

  /**
   * Search by category only
   */
  private static async searchCategoryOnly(organizationId: string, category: string): Promise<KnowledgeBaseEntryClient[]> {
    const query = `
      SELECT id, case_summary, resolution, category, enabled, created_at
      FROM knowledge_base_entries
      WHERE organization_id = $1 AND enabled = true AND LOWER(category) = LOWER($2)
      ORDER BY created_at DESC
      LIMIT 5
    `

    const result = await db.query(query, [organizationId, category])
    return this.mapResultRows(result.rows)
  }

  /**
   * Search by text only across all categories
   */
  private static async searchTextOnly(organizationId: string, terms: string[]): Promise<KnowledgeBaseEntryClient[]> {
    const searchQuery = terms.join(' | ') // OR search
    const query = `
      SELECT id, case_summary, resolution, category, enabled, created_at,
             ts_rank(to_tsvector('english', case_summary || ' ' || resolution),
                     plainto_tsquery('english', $2)) as rank
      FROM knowledge_base_entries
      WHERE organization_id = $1
        AND enabled = true
        AND (to_tsvector('english', case_summary || ' ' || resolution) @@ plainto_tsquery('english', $2))
      ORDER BY rank DESC, created_at DESC
      LIMIT 5
    `

    const result = await db.query(query, [organizationId, searchQuery])
    return this.mapResultRows(result.rows)
  }

  /**
   * Fallback: get most recent entries
   */
  private static async searchMostRecent(organizationId: string): Promise<KnowledgeBaseEntryClient[]> {
    const query = `
      SELECT id, case_summary, resolution, category, enabled, created_at
      FROM knowledge_base_entries
      WHERE organization_id = $1 AND enabled = true
      ORDER BY created_at DESC
      LIMIT 3
    `

    const result = await db.query(query, [organizationId])
    return this.mapResultRows(result.rows)
  }

  /**
   * Helper to map database rows to client format
   */
  private static mapResultRows(rows: any[]): KnowledgeBaseEntryClient[] { // eslint-disable-line @typescript-eslint/no-explicit-any
    return rows.map((row) => ({
      id: row.id,
      case_summary: row.case_summary,
      resolution: row.resolution,
      category: row.category || undefined,
      enabled: row.enabled,
      created_date: row.created_at,
    }))
  }
}