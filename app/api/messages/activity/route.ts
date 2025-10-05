import { NextRequest, NextResponse } from "next/server"
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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const activities = await MessageModel.getRecentActivity(orgId, limit)
    return NextResponse.json({ activities })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    console.error('Error fetching recent activities:', error)
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    )
  }
}
