import { db } from '@/lib/database'

/**
 * Plan configuration
 * - free: 5 emails total, no reset (one-time allowance) - includes managed AI
 * - plus: 5000 emails per month, resets on plan anniversary - includes managed AI
 * - pro: 1000 emails per month, resets on plan anniversary - BYOK (bring your own key)
 */
export const PLAN_LIMITS = {
  free: { limit: 5, resetsMonthly: false },
  plus: { limit: 5000, resetsMonthly: true },
  pro: { limit: 1000, resetsMonthly: true },
  // Legacy plans map to pro behavior
  basic: { limit: 1000, resetsMonthly: true },
  enterprise: { limit: null, resetsMonthly: true }, // unlimited
} as const

export type PlanType = keyof typeof PLAN_LIMITS

export interface UsageInfo {
  planType: PlanType
  limit: number | null // null = unlimited
  used: number
  remaining: number | null // null = unlimited
  isAtLimit: boolean
  isNearLimit: boolean // 90% threshold
  resetsAt: string | null // null for free plan (no reset)
  isFreePlan: boolean
}

export interface EmailOrganizationPlan {
  plan_type: string
  plan_status: string
  current_period_start: string | null
}

interface EmailUsageRow {
  id: string
  organization_id: string
  period_start: string
  period_end: string | null
  emails_sent: number
}

export class EmailUsageModel {
  /**
   * Calculate current period boundaries based on plan anniversary
   * For pro plan: 1 month from current_period_start
   * For free plan: no period (lifetime)
   */
  private static calculatePeriodBoundaries(
    currentPeriodStart: Date,
    planType: PlanType
  ): { start: Date; end: Date | null } {
    const planConfig = PLAN_LIMITS[planType] || PLAN_LIMITS.free

    if (!planConfig.resetsMonthly) {
      // Free plan: no reset, period_end is null
      return { start: currentPeriodStart, end: null }
    }

    // Calculate next reset date (1 month from period start)
    const now = new Date()
    let periodStart = new Date(currentPeriodStart)
    let periodEnd = new Date(periodStart)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    // If we're past the period end, advance to current period
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
    planType: PlanType,
    currentPeriodStart: Date
  ): Promise<EmailUsageRow> {
    const { start, end } = this.calculatePeriodBoundaries(currentPeriodStart, planType)

    // Try to get existing record for this period
    const existing = await db.query<EmailUsageRow>(
      `SELECT * FROM email_usage
       WHERE organization_id = $1 AND period_start = $2`,
      [organizationId, start.toISOString()]
    )

    if (existing.rows.length > 0) {
      return existing.rows[0]
    }

    // Create new record for this period
    const created = await db.query<EmailUsageRow>(
      `INSERT INTO email_usage (organization_id, period_start, period_end, emails_sent)
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
  private static async getOrganizationPlan(organizationId: string): Promise<EmailOrganizationPlan | null> {
    const result = await db.query<EmailOrganizationPlan>(
      `SELECT plan_type, plan_status, current_period_start
       FROM organizations WHERE id = $1`,
      [organizationId]
    )

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  }

  /**
   * Get usage summary for an organization
   * @param organizationId - The organization ID
   * @param orgPlan - Optional pre-fetched org plan to avoid duplicate query
   */
  static async getUsageSummary(
    organizationId: string,
    orgPlan?: EmailOrganizationPlan | null
  ): Promise<UsageInfo> {
    const org = orgPlan !== undefined ? orgPlan : await this.getOrganizationPlan(organizationId)

    if (!org) {
      throw new Error('Organization not found')
    }

    const planType = (org.plan_type as PlanType) || 'free'
    const planConfig = PLAN_LIMITS[planType] || PLAN_LIMITS.free

    // Unlimited plan (enterprise)
    if (planConfig.limit === null) {
      return {
        planType,
        limit: null,
        used: 0,
        remaining: null,
        isAtLimit: false,
        isNearLimit: false,
        resetsAt: null,
        isFreePlan: false,
      }
    }

    // Determine period start
    const periodStart = org.current_period_start
      ? new Date(org.current_period_start)
      : new Date() // Fallback to now if not set

    const usage = await this.getOrCreateUsageRecord(organizationId, planType, periodStart)
    const used = usage.emails_sent
    const limit = planConfig.limit
    const remaining = Math.max(0, limit - used)

    return {
      planType,
      limit,
      used,
      remaining,
      isAtLimit: used >= limit,
      isNearLimit: used >= limit * 0.9,
      resetsAt: usage.period_end,
      isFreePlan: planType === 'free',
    }
  }

  /**
   * Check if organization can send an email
   * Returns { allowed: true } or { allowed: false, reason, usage }
   */
  static async canSendEmail(organizationId: string): Promise<{
    allowed: boolean
    reason?: string
    usage?: UsageInfo
  }> {
    const org = await this.getOrganizationPlan(organizationId)

    if (!org) {
      return { allowed: false, reason: 'Organization not found' }
    }

    // Check plan status
    if (org.plan_status !== 'active' && org.plan_status !== 'trial') {
      return { allowed: false, reason: `Plan is ${org.plan_status}` }
    }

    const usage = await this.getUsageSummary(organizationId)

    if (usage.isAtLimit) {
      const reason = usage.isFreePlan
        ? 'Free trial limit reached. Upgrade to Pro for more emails.'
        : 'Monthly email limit reached. Your quota resets soon.'
      return { allowed: false, reason, usage }
    }

    return { allowed: true, usage }
  }

  /**
   * Increment email usage count atomically
   */
  static async incrementUsage(organizationId: string): Promise<void> {
    const org = await this.getOrganizationPlan(organizationId)

    if (!org) {
      throw new Error('Organization not found')
    }

    const planType = (org.plan_type as PlanType) || 'free'
    const periodStart = org.current_period_start
      ? new Date(org.current_period_start)
      : new Date()

    const { start, end } = this.calculatePeriodBoundaries(periodStart, planType)

    // Atomic upsert with increment
    await db.query(
      `INSERT INTO email_usage (organization_id, period_start, period_end, emails_sent)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (organization_id, period_start)
       DO UPDATE SET emails_sent = email_usage.emails_sent + 1, updated_at = NOW()`,
      [organizationId, start.toISOString(), end?.toISOString() || null]
    )
  }

  /**
   * Update organization's plan and reset period
   * Called when user upgrades/downgrades
   */
  static async updatePlan(
    organizationId: string,
    newPlanType: PlanType,
    resetPeriod: boolean = true
  ): Promise<void> {
    const now = new Date()

    if (resetPeriod) {
      // Reset period start to now (anniversary date for billing cycle)
      await db.query(
        `UPDATE organizations
         SET plan_type = $1,
             plan_started_at = $2,
             current_period_start = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newPlanType, now.toISOString(), organizationId]
      )
    } else {
      // Just update plan type without resetting period
      await db.query(
        `UPDATE organizations
         SET plan_type = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [newPlanType, organizationId]
      )
    }
  }

  /**
   * Get usage history for an organization (for future analytics)
   */
  static async getUsageHistory(
    organizationId: string,
    limit: number = 12
  ): Promise<Array<{ period: string; sent: number }>> {
    const result = await db.query<{ period_start: string; emails_sent: number }>(
      `SELECT period_start, emails_sent
       FROM email_usage
       WHERE organization_id = $1
       ORDER BY period_start DESC
       LIMIT $2`,
      [organizationId, limit]
    )

    return result.rows.map((row) => ({
      period: row.period_start,
      sent: row.emails_sent,
    }))
  }
}
