import { type NextRequest, NextResponse } from "next/server"
import { AIService } from "@/lib/ai-providers"
import { type AIProviderConfig, type Category } from "@/lib/settings-context"
import { searchCompanyKnowledge } from "@/lib/knowledge-search"

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
  companyKnowledge?: string // Company knowledge base
}

interface GenerateResponseResponse {
  aiSuggestedResponse: string
  category: string
}

function getNormalizedCategories(userCategories?: Category[]): string {
  if (!userCategories || userCategories.length === 0) {
    // Default categories when none are configured  
    return "Technical Support, Billing, General Inquiry"
  }
  return userCategories.map(c => c.name).join(', ')
}

export async function POST(request: NextRequest) {
  try {
    const { customerName, customerEmail, subject, message, aiConfig, agentName, agentSignature, categories, quickActionInstruction, currentResponse, companyKnowledge }: GenerateResponseRequest = await request.json()

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
      })
    }

    // Generate category (for new responses only)
    const availableCategories = getNormalizedCategories(categories)
    const categorySystem = `You are an AI assistant that categorizes customer support messages.

Available categories: ${availableCategories}

Analyze the customer message and respond with ONLY a JSON object in this exact format:
{
  "category": "exact category name from the list above"
}

Category guidelines:
- Technical Support: Bug reports, technical issues, software problems, troubleshooting
- Billing: Payment questions, pricing inquiries, subscription changes, invoices, plans
- General Inquiry: General questions, information requests, non-urgent questions

Choose the most appropriate category from the available list. For plans and pricing questions, use "Billing".`

    const categoryPrompt = `Customer: ${customerName}
Email: ${customerEmail}
Subject: ${subject}
Message: ${message}`

    const categoryResponse = await aiService.generateText(
      categorySystem,
      categoryPrompt
    )

    let parsedCategory
    try {
      parsedCategory = JSON.parse(categoryResponse)
    } catch {
      // Fallback if JSON parsing fails
      parsedCategory = { category: "General Inquiry" }
    }

    // Search for relevant company knowledge
    let relevantKnowledge = ''
    if (companyKnowledge) {
      try {
        relevantKnowledge = searchCompanyKnowledge(`${subject} ${message}`, companyKnowledge)
      } catch (error) {
        console.warn('Knowledge search failed, proceeding without company knowledge:', error)
        // Continue without knowledge rather than failing the entire request
      }
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

The message category is: ${parsedCategory.category}

${relevantKnowledge ? `
IMPORTANT: Use the following company-specific information to provide accurate responses:

${relevantKnowledge}

Base your response on this company knowledge when applicable. If the customer's question relates to information in the knowledge base, use that information to provide the most accurate and helpful response.` : ''}`

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
      category: parsedCategory.category,
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
