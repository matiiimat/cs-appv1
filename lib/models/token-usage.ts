import { db } from '@/lib/database'

/**
 * Token limits for managed AI plans
 * - free: 100K tokens total, one-time (no reset) - managed AI included
 * - plus: 10M tokens/month, resets monthly - managed AI included
 * - pro/enterprise: No token tracking (BYOK - bring your own key)
 */
export const TOKEN_LIMITS = {
  free: { limit: 100_000, managed: true, resetsMonthly: false },
  plus: { limit: 10_000_000, managed: true, resetsMonthly: true },
  // Pro and enterprise use their own API keys, no token tracking
  pro: { limit: null, managed: false, resetsMonthly: false },
  basic: { limit: null, managed: false, resetsMonthly: false }, // Legacy, treat as pro
  enterprise: { limit: null, managed: false, resetsMonthly: false },
} as const

export type TokenPlanType = keyof typeof TOKEN_LIMITS

export interface TokenUsageInfo {
  planType: TokenPlanType
  limit: number | null // null = unlimited (BYOK)
  used: number
  remaining: number | null // null = unlimited
  isAtLimit: boolean
  isNearLimit: boolean // 90% threshold
  resetsAt: string | null
  isManaged: boolean
}

export interface OrganizationPlan {
  plan_type: string
  current_period_start: string | null
}

interface TokenUsageRow {
  id: string
  organization_id: string
  period_start: string
  period_end: string | null
  tokens_used: number
}

export class TokenUsageModel {
  /**
   * Check if a plan uses managed AI (server's API key)
   */
  static isManagedPlan(planType: string): boolean {
    const config = TOKEN_LIMITS[planType as TokenPlanType]
    return config?.managed ?? false
  }

  /**
   * Calculate current period boundaries
   * - For resetting plans (plus): monthly periods that advance
   * - For non-resetting plans (free): single lifetime period with no end
   */
  private static calculatePeriodBoundaries(
    currentPeriodStart: Date,
    resetsMonthly: boolean
  ): { start: Date; end: Date | null } {
    if (!resetsMonthly) {
      // Free plan: no reset, period_end is null (lifetime)
      return { start: currentPeriodStart, end: null }
    }

    const now = new Date()
    let periodStart = new Date(currentPeriodStart)
    let periodEnd = new Date(periodStart)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    // If past period end, advance to current period
    while (periodEnd <= now) {
      periodStart = new Date(periodEnd)
      periodEnd = new Date(periodStart)
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    return { start: periodStart, end: periodEnd }
  }

  /**
   * Get or create usage record for current period
   */
  private static async getOrCreateUsageRecord(
    organizationId: string,
    currentPeriodStart: Date,
    resetsMonthly: boolean
  ): Promise<TokenUsageRow> {
    const { start, end } = this.calculatePeriodBoundaries(currentPeriodStart, resetsMonthly)

    const existing = await db.query<TokenUsageRow>(
      `SELECT * FROM token_usage
       WHERE organization_id = $1 AND period_start = $2`,
      [organizationId, start.toISOString()]
    )

    if (existing.rows.length > 0) {
      return existing.rows[0]
    }

    const created = await db.query<TokenUsageRow>(
      `INSERT INTO token_usage (organization_id, period_start, period_end, tokens_used)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (organization_id, period_start) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [organizationId, start.toISOString(), end?.toISOString() || null]
    )

    return created.rows[0]
  }

  /**
   * Get organization's plan info
   */
  private static async getOrganizationPlan(organizationId: string): Promise<OrganizationPlan | null> {
    const result = await db.query<OrganizationPlan>(
      `SELECT plan_type, current_period_start FROM organizations WHERE id = $1`,
      [organizationId]
    )
    return result.rows.length > 0 ? result.rows[0] : null
  }

  /**
   * Get usage summary for an organization
   * Returns null for non-managed plans (they don't have token tracking)
   * @param organizationId - The organization ID
   * @param orgPlan - Optional pre-fetched org plan to avoid duplicate query
   */
  static async getUsageSummary(
    organizationId: string,
    orgPlan?: OrganizationPlan | null
  ): Promise<TokenUsageInfo | null> {
    const org = orgPlan !== undefined ? orgPlan : await this.getOrganizationPlan(organizationId)

    if (!org) {
      return null
    }

    const planType = (org.plan_type as TokenPlanType) || 'free'
    const planConfig = TOKEN_LIMITS[planType] || TOKEN_LIMITS.free

    // Non-managed plans don't have token tracking
    if (!planConfig.managed) {
      return {
        planType,
        limit: null,
        used: 0,
        remaining: null,
        isAtLimit: false,
        isNearLimit: false,
        resetsAt: null,
        isManaged: false,
      }
    }

    const periodStart = org.current_period_start
      ? new Date(org.current_period_start)
      : new Date()

    const usage = await this.getOrCreateUsageRecord(organizationId, periodStart, planConfig.resetsMonthly)
    const used = usage.tokens_used
    const limit = planConfig.limit!
    const remaining = Math.max(0, limit - used)

    return {
      planType,
      limit,
      used,
      remaining,
      isAtLimit: used >= limit,
      isNearLimit: used >= limit * 0.9,
      resetsAt: usage.period_end,
      isManaged: true,
    }
  }

  /**
   * Check if organization can use AI (for managed plans)
   * Returns { allowed: true } for BYOK plans (no token limit)
   */
  static async canUseAI(organizationId: string): Promise<{
    allowed: boolean
    reason?: string
    usage?: TokenUsageInfo
  }> {
    const usage = await this.getUsageSummary(organizationId)

    if (!usage) {
      return { allowed: false, reason: 'Organization not found' }
    }

    // BYOK plans always allowed (they use their own API key)
    if (!usage.isManaged) {
      return { allowed: true, usage }
    }

    if (usage.isAtLimit) {
      const reason = usage.planType === 'free'
        ? 'Free plan token limit reached. Upgrade to Plus for more AI capacity.'
        : 'Monthly token limit reached. Your quota resets soon.'
      return { allowed: false, reason, usage }
    }

    return { allowed: true, usage }
  }

  /**
   * Increment token usage count atomically
   * Only tracks for managed plans (free, plus)
   */
  static async incrementUsage(organizationId: string, tokensUsed: number): Promise<void> {
    const org = await this.getOrganizationPlan(organizationId)

    if (!org) {
      return
    }

    const planType = (org.plan_type as TokenPlanType) || 'free'
    const planConfig = TOKEN_LIMITS[planType]

    // Only track for managed plans
    if (!planConfig?.managed) {
      return
    }

    const periodStart = org.current_period_start
      ? new Date(org.current_period_start)
      : new Date()

    const { start, end } = this.calculatePeriodBoundaries(periodStart, planConfig.resetsMonthly)

    // Atomic upsert with increment
    await db.query(
      `INSERT INTO token_usage (organization_id, period_start, period_end, tokens_used)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, period_start)
       DO UPDATE SET tokens_used = token_usage.tokens_used + $4, updated_at = NOW()`,
      [organizationId, start.toISOString(), end?.toISOString() || null, tokensUsed]
    )
  }

  /**
   * Estimate tokens from text using chars/4 approximation
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * Get token usage history for analytics
   */
  static async getUsageHistory(
    organizationId: string,
    limit: number = 12
  ): Promise<Array<{ period: string; used: number }>> {
    const result = await db.query<{ period_start: string; tokens_used: number }>(
      `SELECT period_start, tokens_used
       FROM token_usage
       WHERE organization_id = $1
       ORDER BY period_start DESC
       LIMIT $2`,
      [organizationId, limit]
    )

    return result.rows.map((row) => ({
      period: row.period_start,
      used: row.tokens_used,
    }))
  }
}
