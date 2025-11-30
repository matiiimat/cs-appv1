import { type NextRequest, NextResponse } from "next/server"
import { AIService } from "@/lib/ai-providers"
import { type AIProviderConfig, type Category } from "@/lib/settings-context"
import { searchCompanyKnowledge } from "@/lib/knowledge-search"
import { OrganizationSettingsModel } from "@/lib/models/organization-settings"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { KnowledgeBaseStorage } from '@/lib/knowledge-base'

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
  knowledgeBaseEntries?: Array<{
    case_summary: string
    resolution: string
    category?: string
  }> // User's knowledge base entries
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

async function requireOrgId(headers: Headers): Promise<string> {
  const session = await auth.api.getSession({ headers })
  if (!session?.user?.email) throw new Error('UNAUTHORIZED')
  const orgUser = await getOrgAndUserByEmail(session.user.email)
  if (!orgUser) throw new Error('ORG_NOT_FOUND')
  return orgUser.organizationId
}

export async function POST(request: NextRequest) {
  try {
    const { customerName, customerEmail, subject, message, agentName, agentSignature, categories, quickActionInstruction, currentResponse, companyKnowledge, knowledgeBaseEntries }: GenerateResponseRequest = await request.json()

    // Always load AI configuration from the database to access the stored API key.
    const orgId = await requireOrgId(request.headers)
    const orgSettings = await OrganizationSettingsModel.findByOrganizationId(orgId)

    if (!orgSettings || !orgSettings.aiConfig) {
      return NextResponse.json({ error: "AI configuration is required" }, { status: 400 })
    }

    // Construct the effective AI config from DB, overriding any client-supplied apiKey.
    const effectiveAiConfig: AIProviderConfig = {
      provider: orgSettings.aiConfig.provider,
      model: orgSettings.aiConfig.model,
      apiKey: orgSettings.aiConfig.apiKey, // decrypted from DB
      customEndpoint: orgSettings.aiConfig.customEndpoint,
      localEndpoint: orgSettings.aiConfig.localEndpoint,
      temperature: orgSettings.aiConfig.temperature,
      maxTokens: orgSettings.aiConfig.maxTokens,
    }

    if (!effectiveAiConfig.apiKey && effectiveAiConfig.provider !== 'local') {
      return NextResponse.json({ error: "AI configuration is required" }, { status: 400 })
    }

    const aiService = new AIService(effectiveAiConfig)

    // Handle quick actions - modify existing response
    if (quickActionInstruction && currentResponse) {
      const quickActionSystem = `You are a professional customer support agent. Modify the existing response according to the instruction.

Current response:
"${currentResponse}"

Instruction: ${quickActionInstruction}

Output requirements:
- Return only the final, customer-ready email body.
- Do not include any prefaces, labels, quotes, code fences, or markdown.
- Do not say things like "Here is the response" or "Translated version:".
- Keep the existing signature if present; otherwise, end with this exact signature once: "${agentSignature}".
- Ensure there is only one signature in the final output.`

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

    // Process knowledge base entries if provided
    let relevantKbEntries = ''
    if (knowledgeBaseEntries && knowledgeBaseEntries.length > 0) {
      try {
        // Extract search terms from the customer message
        const searchTerms = KnowledgeBaseStorage.extractSearchTerms(`${subject} ${message}`)

        // Find relevant entries based on category and content similarity
        const relevantEntries = knowledgeBaseEntries.filter(entry => {
          // First check if categories match
          if (entry.category && entry.category.toLowerCase() === parsedCategory.category.toLowerCase()) {
            return true
          }

          // Then check content similarity with search terms
          const entryText = (entry.case_summary + ' ' + entry.resolution).toLowerCase()
          return searchTerms.some(term => entryText.includes(term.toLowerCase()))
        }).slice(0, 3) // Limit to 3 most relevant entries

        if (relevantEntries.length > 0) {
          relevantKbEntries = '\n\nRELEVANT CASE RESOLUTIONS:\n' +
            relevantEntries.map((entry, index) =>
              `${index + 1}. Issue: ${entry.case_summary}\n   Resolution: ${entry.resolution}`
            ).join('\n\n')
        }
      } catch (error) {
        console.warn('Knowledge base entry processing failed:', error)
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
-
Output requirements:
- Return only the final, customer-ready email body.
- Do not include any prefaces, labels, quotes, code fences, or markdown.
- Do not say things like "Here is the response" or "Translated version:".
- End your response with this exact signature once: "${agentSignature}".

The message category is: ${parsedCategory.category}

${relevantKnowledge ? `
IMPORTANT: Use the following company-specific information to provide accurate responses:

${relevantKnowledge}

Base your response on this company knowledge when applicable. If the customer's question relates to information in the knowledge base, use that information to provide the most accurate and helpful response.` : ''}${relevantKbEntries ? `

IMPORTANT: Learn from the following similar cases that were successfully resolved:

${relevantKbEntries}

Use these previous resolutions as guidance for handling similar issues. If the current customer inquiry is similar to any of these cases, adapt the successful resolution approach while personalizing it for the current customer's specific situation.` : ''}`

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
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
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
