import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const config = await request.json()
    
    // In a real app, you'd save this to a database or secure storage
    // For now, we'll just validate it and return success
    
    if (!config.provider || !config.model || !config.apiKey) {
      return NextResponse.json(
        { error: "Missing required configuration" }, 
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: "AI configuration saved successfully" 
    })
  } catch (error) {
    console.error("[v0] Error saving AI configuration:", error)
    return NextResponse.json(
      { error: "Failed to save AI configuration" }, 
      { status: 500 }
    )
  }
}