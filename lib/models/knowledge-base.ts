import { db } from '@/lib/database'
import { z } from 'zod'

// Knowledge base entry schema for database
export const KnowledgeBaseEntryDBSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  case_summary: z.string(),
  resolution: z.string(),
  category: z.string().nullable(),
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
})

export type CreateKnowledgeBaseEntryDBInput = z.infer<typeof CreateKnowledgeBaseEntryDBSchema>

// Client-side compatible schema (for API responses)
export const KnowledgeBaseEntryClientSchema = z.object({
  id: z.string(),
  case_summary: z.string(),
  resolution: z.string(),
  category: z.string().optional(),
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

    return result.rows.map((row) => ({
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

    return result.rows.map((row) => ({
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
      'INSERT INTO knowledge_base_entries (organization_id, case_summary, resolution, category) VALUES ($1, $2, $3, $4) RETURNING id, case_summary, resolution, category, enabled, created_at',
      [organizationId, entryData.case_summary, entryData.resolution, entryData.category || null]
    )

    const row = result.rows[0]
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

    const row = result.rows[0]
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
   * Find relevant knowledge base entries by category and search terms
   */
  static async findRelevant(
    organizationId: string,
    category?: string,
    searchTerms?: string[]
  ): Promise<KnowledgeBaseEntryClient[]> {
    let query = 'SELECT id, case_summary, resolution, category, enabled, created_at FROM knowledge_base_entries WHERE organization_id = $1 AND enabled = true'
    const params: unknown[] = [organizationId]
    let paramIndex = 2

    // Add category filter if provided
    if (category) {
      query += ` AND LOWER(category) = LOWER($${paramIndex})`
      params.push(category)
      paramIndex++
    }

    // Add text search if provided
    if (searchTerms && searchTerms.length > 0) {
      const searchQuery = searchTerms.join(' | ') // OR search
      query += ` AND (to_tsvector('english', case_summary || ' ' || resolution) @@ plainto_tsquery('english', $${paramIndex}))`
      params.push(searchQuery)
      paramIndex++
    }

    query += ' ORDER BY created_at DESC LIMIT 10'

    const result = await db.query(query, params)

    return result.rows.map((row) => ({
      id: row.id,
      case_summary: row.case_summary,
      resolution: row.resolution,
      category: row.category || undefined,
      enabled: row.enabled,
      created_date: row.created_at,
    }))
  }
}