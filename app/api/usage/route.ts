import { type NextRequest, NextResponse } from "next/server"
import { EmailUsageModel } from "@/lib/models/email-usage"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { withRateLimit } from '@/lib/rate-limiter'

async function requireOrgId(request: NextRequest): Promise<string> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.email) {
    throw new Error('UNAUTHORIZED')
  }
  const orgUser = await getOrgAndUserByEmail(session.user.email)
  if (!orgUser) throw new Error('ORG_NOT_FOUND')
  return orgUser.organizationId
}

async function getHandler(request: NextRequest) {
  try {
    const orgId = await requireOrgId(request)
    const usage = await EmailUsageModel.getUsageSummary(orgId)

    return NextResponse.json({ usage })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    console.error('Error fetching usage:', error)
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }
}

export const GET = withRateLimit(getHandler, 'api')
