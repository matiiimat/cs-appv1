import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { db } from '@/lib/database'
import { TokenUsageModel } from '@/lib/models/token-usage'
import { EmailUsageModel } from '@/lib/models/email-usage'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgUser = await getOrgAndUserByEmail(session.user.email)
    if (!orgUser) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { organizationId } = orgUser

    // Get organization plan info
    const result = await db.query<{ plan_type: string; plan_status: string }>(
      `SELECT plan_type, plan_status FROM organizations WHERE id = $1`,
      [organizationId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { plan_type: planType, plan_status: planStatus } = result.rows[0]

    // Check if this is a managed plan (free or plus)
    const isManaged = TokenUsageModel.isManagedPlan(planType)

    // Get token usage for managed plans
    let tokenUsage = null
    if (isManaged) {
      tokenUsage = await TokenUsageModel.getUsageSummary(organizationId)
    }

    // Get email usage for all plans
    const emailUsage = await EmailUsageModel.getUsageSummary(organizationId)

    return NextResponse.json({
      planType,
      planStatus,
      isManaged,
      tokenUsage: tokenUsage ? {
        used: tokenUsage.used,
        limit: tokenUsage.limit,
        remaining: tokenUsage.remaining,
        isAtLimit: tokenUsage.isAtLimit,
        isNearLimit: tokenUsage.isNearLimit,
        resetsAt: tokenUsage.resetsAt,
      } : null,
      emailUsage: {
        used: emailUsage.used,
        limit: emailUsage.limit,
        remaining: emailUsage.remaining,
        isAtLimit: emailUsage.isAtLimit,
        isNearLimit: emailUsage.isNearLimit,
        resetsAt: emailUsage.resetsAt,
        isFreePlan: emailUsage.isFreePlan,
      },
    })
  } catch (error) {
    console.error('Error fetching plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
