import { type NextRequest, NextResponse } from "next/server"
import { MessageModel } from "@/lib/models/message"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'

async function requireOrgId(request: NextRequest): Promise<string> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.email) {
    throw new Error('UNAUTHORIZED')
  }
  const orgUser = await getOrgAndUserByEmail(session.user.email)
  if (!orgUser) throw new Error('ORG_NOT_FOUND')
  return orgUser.organizationId
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const orgId = await requireOrgId(request)
    const { caseId } = await params

    if (!caseId) {
      return NextResponse.json({ error: "Case ID is required" }, { status: 400 })
    }

    // Format the ticket ID (add # prefix if not present)
    const ticketId = caseId.startsWith('#') ? caseId : `#${caseId}`

    // Find message by ticket ID within the organization
    const message = await MessageModel.findByTicketId(orgId, ticketId)

    if (!message) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    console.error('Error fetching case:', error)
    return NextResponse.json(
      { error: "Failed to fetch case" },
      { status: 500 }
    )
  }
}