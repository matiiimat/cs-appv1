import { NextResponse, type NextRequest } from "next/server"
import { AIService } from "@/lib/ai-providers"
import type { AIProviderConfig } from "@/lib/settings-context"

export async function POST(request: NextRequest) {
  try {
    const { aiConfig, system, prompt }: { aiConfig: AIProviderConfig; system: string; prompt: string } = await request.json()

    if (!aiConfig || !aiConfig.apiKey) {
      return NextResponse.json({ error: 'AI configuration is required' }, { status: 400 })
    }

    const aiService = new AIService(aiConfig)
    const content = await aiService.generateText(system, prompt)

    return NextResponse.json({ content })
  } catch (error) {
    console.error('AI chat error:', error)
    let message = 'Failed to generate AI response'
    if (error instanceof Error) {
      if (error.message.includes('fetch')) message = 'Cannot connect to AI service. Please check your configuration.'
      else message = error.message
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

