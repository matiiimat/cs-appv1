import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { type NextRequest, NextResponse } from "next/server"

interface GenerateResponseRequest {
  customerName: string
  customerEmail: string
  subject: string
  message: string
}

interface GenerateResponseResponse {
  aiSuggestedResponse: string
  category: string
  priority: "low" | "medium" | "high"
}

export async function POST(request: NextRequest) {
  try {
    const { customerName, customerEmail, subject, message }: GenerateResponseRequest = await request.json()

    // Generate category and priority
    const { text: categoryAndPriority } = await generateText({
      model: openai("gpt-4o"),
      system: `You are an AI assistant that categorizes customer support messages and determines their priority level.

Analyze the customer message and respond with ONLY a JSON object in this exact format:
{
  "category": "one of: Account Access, Billing, Technical, Feature Request, Bug Report, General Inquiry",
  "priority": "one of: low, medium, high"
}

Priority guidelines:
- high: Account access issues, billing disputes, system outages, security concerns
- medium: Feature requests, general billing questions, minor technical issues
- low: General inquiries, documentation requests, non-urgent questions`,
      prompt: `Customer: ${customerName}
Email: ${customerEmail}
Subject: ${subject}
Message: ${message}`,
    })

    let parsedCategoryPriority
    try {
      parsedCategoryPriority = JSON.parse(categoryAndPriority)
    } catch {
      // Fallback if JSON parsing fails
      parsedCategoryPriority = { category: "General Inquiry", priority: "medium" }
    }

    // Generate AI response
    const { text: aiResponse } = await generateText({
      model: openai("gpt-4o"),
      system: `You are a professional customer support agent. Generate helpful, empathetic, and solution-oriented responses to customer inquiries.

Guidelines:
- Be friendly and professional
- Acknowledge the customer's concern
- Provide clear, actionable solutions when possible
- Use the customer's name
- Keep responses concise but thorough
- If you need more information, ask specific questions
- For technical issues, provide step-by-step guidance
- For billing issues, reference account details appropriately
- Always end with an offer for further assistance

The message category is: ${parsedCategoryPriority.category}
The priority level is: ${parsedCategoryPriority.priority}`,
      prompt: `Customer: ${customerName}
Email: ${customerEmail}
Subject: ${subject}
Message: ${message}

Generate a professional customer support response.`,
    })

    const response: GenerateResponseResponse = {
      aiSuggestedResponse: aiResponse,
      category: parsedCategoryPriority.category,
      priority: parsedCategoryPriority.priority,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Error generating AI response:", error)
    return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 })
  }
}
