import { type NextRequest, NextResponse } from "next/server"
import { MessageModel, CreateMessageSchema, UpdateMessageSchema } from "@/lib/models/message"
import { z } from "zod"

// For now, we'll use the demo organization ID from seeded data
// In production, this would come from authentication/JWT
const DEMO_ORGANIZATION_ID = "82ef6e9f-e0b2-419f-82e3-2468ae4c1d21"

export async function GET(request: NextRequest) {
  try {
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

    const result = await MessageModel.findByOrganization(DEMO_ORGANIZATION_ID, options)

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
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const messageData = await request.json()

    // Validate input data
    const validatedData = CreateMessageSchema.parse(messageData)

    // Create message in database
    const newMessage = await MessageModel.create(DEMO_ORGANIZATION_ID, validatedData)

    // Log activity
    await MessageModel.addActivity(
      DEMO_ORGANIZATION_ID,
      newMessage.id,
      null, // No user context yet
      'received',
      { source: 'api' }
    )

    return NextResponse.json({ message: newMessage }, { status: 201 })
  } catch (error) {
    // Enhanced diagnostics for easier troubleshooting in dev
    console.error('Error creating message:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid message data", details: error.errors },
        { status: 400 }
      )
    }

    const err = error as any
    const code = err?.code as string | undefined // PG error code if present
    const message = err?.message as string | undefined

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
    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 })
    }

    console.log('PUT /api/messages - updates received:', updates)

    // Validate update data
    const validatedUpdates = UpdateMessageSchema.parse(updates)

    // Update message in database
    const updatedMessage = await MessageModel.update(DEMO_ORGANIZATION_ID, id, validatedUpdates)

    if (!updatedMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    return NextResponse.json({ message: updatedMessage })
  } catch (error) {
    console.error('Error updating message:', error)

    if (error instanceof z.ZodError) {
      console.log('Validation error details:', error.errors)
      return NextResponse.json(
        { error: "Invalid update data", details: error.errors },
        { status: 400 }
      )
    }

    const err = error as any
    const code = err?.code as string | undefined
    const message = err?.message as string | undefined

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
