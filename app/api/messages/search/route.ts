import { type NextRequest, NextResponse } from "next/server"
import { MessageModel } from "@/lib/models/message"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { z } from "zod"

const SearchSchema = z.object({
  q: z.string().min(1, "Search query is required"),
  field: z.enum(['all', 'subject', 'message', 'customer_email', 'ticket_id']).optional().default('all'),
  status: z.enum(['new', 'to_send_queue', 'rejected', 'edited', 'sent', 'to_review_queue']).optional(),
  page: z.string().optional().default('1').transform(val => parseInt(val) || 1),
  limit: z.string().optional().default('20').transform(val => Math.min(parseInt(val) || 20, 100)),
})

async function requireOrgId(request: NextRequest): Promise<string> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.email) {
    throw new Error('UNAUTHORIZED')
  }
  const orgUser = await getOrgAndUserByEmail(session.user.email)
  if (!orgUser) throw new Error('ORG_NOT_FOUND')
  return orgUser.organizationId
}

export async function GET(request: NextRequest) {
  try {
    const orgId = await requireOrgId(request)
    const { searchParams } = new URL(request.url)

    // Validate search parameters
    const searchData = SearchSchema.parse({
      q: searchParams.get('q'),
      field: searchParams.get('field') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    const { q: query, field, status, page, limit } = searchData
    const offset = (page - 1) * limit

    // Perform search
    const result = await MessageModel.search(orgId, query, {
      field,
      status,
      limit,
      offset,
    })

    return NextResponse.json({
      messages: result.messages,
      pagination: {
        total: result.total,
        page,
        limit,
        pages: Math.ceil(result.total / limit)
      },
      query: {
        text: query,
        field,
        status
      }
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid search parameters", details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error searching messages:', error)
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    )
  }
}