import { NextResponse } from "next/server"
import { MessageModel } from "@/lib/models/message"

// For now, we'll use the demo organization ID from seeded data
const DEMO_ORGANIZATION_ID = "82ef6e9f-e0b2-419f-82e3-2468ae4c1d21"

export async function GET() {
  try {
    const stats = await MessageModel.getStats(DEMO_ORGANIZATION_ID)
    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching message stats:', error)
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    )
  }
}