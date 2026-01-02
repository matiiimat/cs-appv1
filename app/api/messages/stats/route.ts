import { NextResponse, type NextRequest } from "next/server"
import { MessageModel } from "@/lib/models/message"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'

async function requireOrgId(headers: Headers): Promise<string> {
  const session = await auth.api.getSession({ headers })
  if (!session?.user?.email) throw new Error('UNAUTHORIZED')
  const orgUser = await getOrgAndUserByEmail(session.user.email)
  if (!orgUser) throw new Error('ORG_NOT_FOUND')
  return orgUser.organizationId
}

export async function GET(request: NextRequest) {
  try {
    const orgId = await requireOrgId(request.headers)

    // Parse dateRange query parameter
    const { searchParams } = new URL(request.url)
    const dateRangeParam = searchParams.get('dateRange')
    const dateRange = (dateRangeParam === '7d' || dateRangeParam === '30d') ? dateRangeParam : 'all'

    const stats = await MessageModel.getStats(orgId, dateRange)
    return NextResponse.json({ stats })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    console.error('Error fetching message stats:', error)
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    )
  }
}
