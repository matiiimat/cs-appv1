import { NextRequest, NextResponse } from "next/server"
import { MessageModel } from "@/lib/models/message"

// For now, we'll use the demo organization ID from seeded data
const DEMO_ORGANIZATION_ID = "82ef6e9f-e0b2-419f-82e3-2468ae4c1d21"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const activities = await MessageModel.getRecentActivity(DEMO_ORGANIZATION_ID, limit)
    return NextResponse.json({ activities })
  } catch (error) {
    console.error('Error fetching recent activities:', error)
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    )
  }
}