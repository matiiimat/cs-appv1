import { type NextRequest, NextResponse } from "next/server"
import { MessageModel, CreateMessageSchema, UpdateMessageSchema } from "@/lib/models/message"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { z } from "zod"

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
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const options = {
      ...(status && { status: status as 'new' | 'to_send_queue' | 'rejected' | 'edited' | 'sent' | 'to_review_queue' }),
      limit,
      offset: (page - 1) * limit,
      orderBy: 'created_at' as const,
      orderDirection: 'DESC' as const,
    }

    const result = await MessageModel.findByOrganization(orgId, options)

    return NextResponse.json({
      messages: result.messages,
      pagination: {
        total: result.total,
        page,
        limit,
        pages: Math.ceil(result.total / limit)
      }
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await requireOrgId(request)
    const messageData = await request.json()

    // Validate input data
    const validatedData = CreateMessageSchema.parse(messageData)

    // Create message in database
    const newMessage = await MessageModel.create(orgId, validatedData)

    // Log activity
    await MessageModel.addActivity(
      orgId,
      newMessage.id,
      null, // No user context yet
      'received',
      { source: 'api' }
    )

    return NextResponse.json({ message: newMessage }, { status: 201 })
  } catch (error) {
    // Enhanced diagnostics for easier troubleshooting in dev
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    console.error('Error creating message:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid message data", details: error.errors },
        { status: 400 }
      )
    }

    let code: string | undefined
    let message: string | undefined
    if (typeof error === 'object' && error !== null) {
      const e = error as Record<string, unknown>
      if (typeof e.code === 'string') code = e.code
      if (typeof e.message === 'string') message = e.message
    }

    // Heuristic hints
    let hint: string | undefined
    if (message?.includes('Organization not found')) {
      hint = 'Demo organization missing. Seed DB or ensure demo org ID exists.'
    } else if (message?.includes('Organization key must be 64 characters') || message?.includes('Encryption failed')) {
      hint = 'Invalid encrypted_data_key for organization. Set to a 64-hex key.'
    } else if (message?.includes('violates check constraint') || message?.includes('status_check')) {
      hint = 'messages.status constraint mismatch. Allow new/to_send_queue/to_review_queue.'
    }

    const body: Record<string, unknown> = {
      error: 'Failed to create message',
    }
    if (process.env.NODE_ENV !== 'production') {
      body.reason = message || 'Unknown error'
      if (code) body.code = code
      if (hint) body.hint = hint
    }

    return NextResponse.json(body, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const orgId = await requireOrgId(request)
    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 })
    }

    console.log('PUT /api/messages - updates received:', updates)

    // Validate update data
    const validatedUpdates = UpdateMessageSchema.parse(updates)

    // If transitioning to 'sent' and no processed_at provided, stamp it server-side
    if (validatedUpdates.status === 'sent' && validatedUpdates.processed_at === undefined) {
      validatedUpdates.processed_at = new Date().toISOString()
    }

    let updatedMessage = null as Awaited<ReturnType<typeof MessageModel.update>> | null

    // If transitioning to 'sent', do it atomically and idempotently
    if (validatedUpdates.status === 'sent') {
      const transitioned = await MessageModel.transitionToSent(
        orgId,
        id,
        validatedUpdates.agent_id,
        validatedUpdates.processed_at
      )

      if (!transitioned) {
        // Either already sent or not found; fetch current state and return without re-sending email
        const current = await MessageModel.findById(orgId, id)
        if (!current) {
          return NextResponse.json({ error: "Message not found" }, { status: 404 })
        }
        return NextResponse.json({ message: current })
      }

      updatedMessage = transitioned

      // Trigger outbound email only on successful state transition
      try {
        const { EmailService, makeOrgForwardAddress } = await import('@/lib/email')
        const replyTo = makeOrgForwardAddress(orgId)
        const to = updatedMessage.customer_email || ''

        // Build final subject with single canonical bracketed case ID
        // and ensure we don't stack multiple bracketed numbers in subject.
        const originalSubject = (updatedMessage.subject || '').trim()
        const hasRe = /^re:/i.test(originalSubject)
        const baseSubject = hasRe ? originalSubject : (originalSubject ? `Re: ${originalSubject}` : 'Re:')
        const { sanitizeSubjectBrackets } = await import('@/lib/subject-utils')
        const cleaned = sanitizeSubjectBrackets(baseSubject)
        const caseId = (updatedMessage.ticket_id || '').trim()
        const finalSubject = caseId ? `[${caseId}] - ${cleaned}` : cleaned

        // Sanitize body: remove any leading "Subject:" line and subsequent blank line(s)
        const rawText = updatedMessage.ai_suggested_response || ''
        const lines = rawText.split(/\r?\n/)
        let startIdx = 0
        if (lines[0] && /^\s*subject\s*:/i.test(lines[0])) {
          startIdx = 1
          // Skip any immediate blank lines after the Subject line
          while (startIdx < lines.length && /^\s*$/.test(lines[startIdx])) {
            startIdx++
          }
        }
        const text = lines.slice(startIdx).join('\n')

        if (to && text) {
          const result = await EmailService.send({ to, subject: finalSubject.trim(), text, replyTo })
          await MessageModel.addActivity(
            orgId,
            updatedMessage.id,
            validatedUpdates.agent_id ?? null,
            'approved',
            { channel: 'email', provider: 'sendgrid', ok: result.ok, providerMessageId: result.providerMessageId }
          )
        } else {
          console.warn('Skipping email send: missing recipient or body')
        }
      } catch (sendErr) {
        console.error('Failed to send outbound email:', sendErr)
        // Do not fail the PUT response; sending can be retried later
      }
    } else {
      // Non-'sent' updates use the regular update path
      updatedMessage = await MessageModel.update(orgId, id, validatedUpdates)
      if (!updatedMessage) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 })
      }
    }

    return NextResponse.json({ message: updatedMessage })
  } catch (error) {
    console.error('Error updating message:', error)
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (error instanceof z.ZodError) {
      console.log('Validation error details:', error.errors)
      return NextResponse.json(
        { error: "Invalid update data", details: error.errors },
        { status: 400 }
      )
    }

    let code: string | undefined
    let message: string | undefined
    if (typeof error === 'object' && error !== null) {
      const e = error as Record<string, unknown>
      if (typeof e.code === 'string') code = e.code
      if (typeof e.message === 'string') message = e.message
    }

    let hint: string | undefined
    if (message?.includes('violates check constraint')) {
      hint = 'Check constraint violation (likely status). Ensure value matches allowed set.'
    } else if (message?.includes('foreign key')) {
      hint = 'Foreign key issue. Verify organization_id / agent_id exist.'
    }

    const body: Record<string, unknown> = { error: 'Failed to update message' }
    if (process.env.NODE_ENV !== 'production') {
      body.reason = message || 'Unknown error'
      if (code) body.code = code
      if (hint) body.hint = hint
    }

    return NextResponse.json(body, { status: 500 })
  }
}
