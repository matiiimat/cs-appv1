import { type NextRequest, NextResponse } from "next/server"
import { AIService } from "@/lib/ai-providers"
import { type AIProviderConfig, type Category } from "@/lib/settings-context"

interface GenerateResponseRequest {
  customerName: string
  customerEmail: string
  subject: string
  message: string
  aiConfig: AIProviderConfig
  agentName: string
  agentSignature: string
  categories?: Category[]
  quickActionInstruction?: string // For quick actions
  currentResponse?: string // Existing response to modify
}

interface GenerateResponseResponse {
  aiSuggestedResponse: string
  category: string
  priority: "low" | "medium" | "high"
}

function getNormalizedCategories(userCategories?: Category[]): string {
  if (!userCategories || userCategories.length === 0) {
    return "N/A"
  }
  return userCategories.map(c => c.name).join(', ')
}

export async function POST(request: NextRequest) {
  try {
    const { customerName, customerEmail, subject, message, aiConfig, agentName, agentSignature, categories, quickActionInstruction, currentResponse }: GenerateResponseRequest = await request.json()

    if (!aiConfig || !aiConfig.apiKey) {
      return NextResponse.json(
        { error: "AI configuration is required" }, 
        { status: 400 }
      )
    }

    const aiService = new AIService(aiConfig)

    // Handle quick actions - modify existing response
    if (quickActionInstruction && currentResponse) {
      const quickActionSystem = `You are a professional customer support agent. You have been asked to modify an existing response based on a specific instruction.

Current response:
"${currentResponse}"

Instruction: ${quickActionInstruction}

Please provide the modified response that follows the instruction while maintaining professionalism and the core message intent. Keep the same signature if present.`

      const quickActionPrompt = `Original customer message context:
Customer: ${customerName}
Subject: ${subject}
Message: ${message}

Please modify the response according to the instruction.`

      const modifiedResponse = await aiService.generateText(
        quickActionSystem,
        quickActionPrompt
      )

      return NextResponse.json({
        aiSuggestedResponse: modifiedResponse,
        category: "N/A", // Keep existing category
        priority: "medium" as const, // Keep existing priority
      })
    }

    // Generate category and priority (for new responses only)
    const availableCategories = getNormalizedCategories(categories)
    const categoryAndPrioritySystem = `You are an AI assistant that categorizes customer support messages and determines their priority level.

Analyze the customer message and respond with ONLY a JSON object in this exact format:
{
  "category": "one of: ${availableCategories}",
  "priority": "one of: low, medium, high"
}

Priority guidelines:
- high: Account access issues, billing disputes, system outages, security concerns
- medium: Feature requests, general billing questions, minor technical issues
- low: General inquiries, documentation requests, non-urgent questions`

    const categoryAndPriorityPrompt = `Customer: ${customerName}
Email: ${customerEmail}
Subject: ${subject}
Message: ${message}`

    const categoryAndPriority = await aiService.generateText(
      categoryAndPrioritySystem,
      categoryAndPriorityPrompt
    )

    let parsedCategoryPriority
    try {
      parsedCategoryPriority = JSON.parse(categoryAndPriority)
    } catch {
      // Fallback if JSON parsing fails
      parsedCategoryPriority = { category: "General Inquiry", priority: "medium" }
    }

    // Generate AI response
    const aiResponseSystem = `You are a professional customer support agent named "${agentName}". Generate helpful, empathetic, and solution-oriented responses to customer inquiries.

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
- End your response with this exact signature: "${agentSignature}"

The message category is: ${parsedCategoryPriority.category}
The priority level is: ${parsedCategoryPriority.priority}`

    const aiResponsePrompt = `Customer: ${customerName}
Email: ${customerEmail}
Subject: ${subject}
Message: ${message}

Generate a professional customer support response.`

    const aiResponse = await aiService.generateText(
      aiResponseSystem,
      aiResponsePrompt
    )

    const response: GenerateResponseResponse = {
      aiSuggestedResponse: aiResponse,
      category: parsedCategoryPriority.category,
      priority: parsedCategoryPriority.priority,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Error generating AI response:", error)
    
    // Provide specific error messages for common issues
    let errorMessage = "Failed to generate AI response"
    
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        errorMessage = "Cannot connect to AI service. Please check your API configuration and ensure the service is running."
      } else if (error.message.includes('API key')) {
        errorMessage = "Invalid API key or configuration. Please check your AI provider settings."
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
