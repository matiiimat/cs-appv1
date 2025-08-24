import { type NextRequest, NextResponse } from "next/server"

// Mock database for demonstration
const messages: any[] = []

export async function GET() {
  return NextResponse.json({ messages })
}

export async function POST(request: NextRequest) {
  try {
    const messageData = await request.json()
    const newMessage = {
      ...messageData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      status: "pending",
    }

    messages.push(newMessage)

    return NextResponse.json({ message: newMessage }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json()
    const messageIndex = messages.findIndex((m) => m.id === id)

    if (messageIndex === -1) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    messages[messageIndex] = { ...messages[messageIndex], ...updates }

    return NextResponse.json({ message: messages[messageIndex] })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 })
  }
}
