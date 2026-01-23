import { type NextRequest, NextResponse } from "next/server"
import { AIService } from "@/lib/ai-providers"
import { type Category } from "@/lib/settings-context"
import { searchCompanyKnowledge } from "@/lib/knowledge-search"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { KnowledgeBaseModel } from '@/lib/models/knowledge-base'
import { validateEmailData } from '@/lib/email-validation'
import { withRateLimit } from '@/lib/rate-limiter'
import { EmailUsageModel } from '@/lib/models/email-usage'
import { TokenUsageModel } from '@/lib/models/token-usage'
import { canUseAIWithConfig } from '@/lib/ai-config-helpers'
import { createCustomerAnonymizer } from '@/lib/pii-anonymizer'
import { ShopifyClient, formatShopifyContextForAI, type ShopifyOrder } from '@/lib/shopify-client'

// Extract order numbers from text (e.g., #1002, order 1002, order #1002)
function extractOrderNumbers(text: string): string[] {
  const patterns = [
    /#(\d{3,})/g,                           // #1002
    /order\s*#?\s*(\d{3,})/gi,              // order 1002, order #1002
    /commande\s*#?\s*(\d{3,})/gi,           // French: commande 1002
    /numéro\s+de\s+commande\s*:?\s*#?(\d{3,})/gi, // French: numéro de commande
  ]

  const orderNumbers: Set<string> = new Set()
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      orderNumbers.add(match[1])
    }
  }

  return Array.from(orderNumbers)
}

// Format a single order for AI context
function formatSingleOrderForAI(order: ShopifyOrder): string {
  const lines: string[] = [
    '## Order Information (from Shopify)',
    '',
    `**Order ${order.name}** (${new Date(order.createdAt).toLocaleDateString()})`,
    `- Status: ${order.financialStatus}${order.fulfillmentStatus ? ` / ${order.fulfillmentStatus}` : ''}`,
    `- Total: ${order.currency} ${order.totalPrice}`,
  ]

  if (order.lineItems.length > 0) {
    lines.push('- Items:')
    for (const item of order.lineItems) {
      const variant = item.variant?.title && item.variant.title !== 'Default Title'
        ? ` (${item.variant.title})`
        : ''
      const price = item.unitPrice ? ` - ${order.currency} ${item.unitPrice} each` : ''
      lines.push(`  - ${item.quantity}x ${item.title}${variant}${price}`)
    }
  }

  if (order.trackingInfo && order.trackingInfo.length > 0) {
    const tracking = order.trackingInfo[0]
    lines.push(`- Tracking: ${tracking.company} - ${tracking.number}`)
  }

  if (order.shippingAddress) {
    lines.push(`- Ships to: ${order.shippingAddress.city}, ${order.shippingAddress.country}`)
  }

  return lines.join('\n')
}

interface GenerateResponseRequest {
  customerName: string
  customerEmail: string
  subject: string
  message: string
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

function extractSearchTerms(messageContent: string): string[] {
  if (!messageContent) return []

  // Remove common words but keep important business terms
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those'
  ])

  // Important short terms to preserve
  const preserveShortTerms = new Set([
    'api', 'ui', 'ux', 'ai', 'ml', 'id', 'ip', 'db', 'os', 'app', 'web', 'ios', 'sms', 'pdf',
    'fee', 'pro', 'dev', 'qa', 'pm', 'hr', 'crm', 'erp', 'roi', 'kpi', 'sla'
  ])

  // Handle compound terms that should stay together
  let processedContent = messageContent.toLowerCase()

  // Preserve important compound terms by replacing spaces with underscores
  const compoundTerms = [
    'subscription plan', 'pricing plan', 'cost savings', 'annual plan', 'monthly plan',
    'billing cycle', 'payment method', 'price range', 'cost effective', 'price point',
    'technical support', 'customer service', 'user account', 'login issue', 'password reset',
    'bug report', 'feature request', 'error message', 'system error', 'data loss'
  ]

  compoundTerms.forEach(term => {
    const regex = new RegExp(term.replace(/\s+/g, '\\s+'), 'gi')
    processedContent = processedContent.replace(regex, term.replace(/\s+/g, '_'))
  })

  return processedContent
    .replace(/[^a-z0-9\s_]/g, ' ') // Remove punctuation but preserve underscores
    .split(/\s+/) // Split on whitespace
    .map(word => word.replace(/_/g, ' ')) // Convert underscores back to spaces for compound terms
    .filter(word => {
      const trimmed = word.trim()
      // Keep word if it's long enough, or it's a preserved short term, or it's a compound term
      return (trimmed.length > 2 && !commonWords.has(trimmed)) ||
             preserveShortTerms.has(trimmed) ||
             trimmed.includes(' ') // compound term
    })
    .slice(0, 15) // Increased limit for more comprehensive matching
}

async function requireOrgId(headers: Headers): Promise<string> {
  const session = await auth.api.getSession({ headers })
  if (!session?.user?.email) throw new Error('UNAUTHORIZED')
  const orgUser = await getOrgAndUserByEmail(session.user.email)
  if (!orgUser) throw new Error('ORG_NOT_FOUND')
  return orgUser.organizationId
}

async function handler(request: NextRequest) {
  try {
    const requestData = await request.json()
    const { customerName, customerEmail, subject, message, agentName, agentSignature, categories, quickActionInstruction, currentResponse, companyKnowledge }: GenerateResponseRequest = requestData

    // Validate email data for security
    const emailValidation = validateEmailData({
      customerEmail,
      subject,
      body: message
    })

    const orgId = await requireOrgId(request.headers)

    // Check email usage limits (applies to all plans)
    const emailUsageCheck = await EmailUsageModel.canSendEmail(orgId)
    if (!emailUsageCheck.allowed) {
      return NextResponse.json({
        error: emailUsageCheck.reason,
        code: 'EMAIL_LIMIT_REACHED',
        usage: emailUsageCheck.usage,
      }, { status: 429 })
    }

    // Check AI access and get configuration (handles managed vs BYOK)
    const aiCheck = await canUseAIWithConfig(orgId)
    if (!aiCheck.allowed || !aiCheck.config) {
      return NextResponse.json({
        error: aiCheck.reason || 'AI configuration is required',
        code: aiCheck.tokenUsage ? 'TOKEN_LIMIT_REACHED' : 'AI_CONFIG_MISSING',
        usage: aiCheck.tokenUsage,
      }, { status: 429 })
    }

    const { config: effectiveAiConfig, isManaged } = aiCheck

    const aiService = new AIService(effectiveAiConfig)

    // Create PII anonymizer for GDPR compliance
    // This ensures customer PII is never sent to AI providers
    const piiAnonymizer = createCustomerAnonymizer({
      name: customerName,
      email: emailValidation.customerEmail,
    })

    // Handle quick actions - modify existing response
    if (quickActionInstruction && currentResponse) {
      // Anonymize customer data before sending to AI
      const anonymizedSubject = piiAnonymizer.anonymize(subject).anonymizedText
      const anonymizedMessage = piiAnonymizer.anonymize(message).anonymizedText
      const anonymizedResponse = piiAnonymizer.anonymize(currentResponse).anonymizedText

      const quickActionSystem = `You are a professional customer support agent. Modify the existing response according to the instruction.

Current response:
"${anonymizedResponse}"

Instruction: ${quickActionInstruction}

Output requirements:
- Return only the final, customer-ready email body.
- Do not include any prefaces, labels, quotes, code fences, or markdown.
- Do not say things like "Here is the response" or "Translated version:".
- Keep the existing signature if present; otherwise, end with this exact signature once: "${agentSignature}".
- Ensure there is only one signature in the final output.`

      // Use anonymized placeholders instead of real customer data
      const { anonymizedText: anonymizedName } = piiAnonymizer.anonymize(customerName)

      const quickActionPrompt = `Original customer message context:
Customer: ${anonymizedName}
Subject: ${anonymizedSubject}
Message: ${anonymizedMessage}

Please modify the response according to the instruction.`

      const anonymizedAiResponse = await aiService.generateText(
        quickActionSystem,
        quickActionPrompt
      )

      // Re-hydrate the response with original customer data
      const modifiedResponse = piiAnonymizer.rehydrate(anonymizedAiResponse)

      // Track token usage for managed plans (using chars/4 estimation)
      if (isManaged) {
        const estimatedTokens = TokenUsageModel.estimateTokens(
          quickActionSystem + quickActionPrompt + modifiedResponse
        )
        await TokenUsageModel.incrementUsage(orgId, estimatedTokens)
      }

      return NextResponse.json({
        aiSuggestedResponse: modifiedResponse,
        category: "N/A", // Keep existing category
      })
    }

    // Generate category (for new responses only)
    // Anonymize all customer PII before sending to AI provider
    const { anonymizedText: anonymizedName } = piiAnonymizer.anonymize(customerName)
    const { anonymizedText: anonymizedEmail } = piiAnonymizer.anonymize(emailValidation.customerEmail)
    const { anonymizedText: anonymizedSubject } = piiAnonymizer.anonymize(emailValidation.subject)
    const { anonymizedText: anonymizedBody } = piiAnonymizer.anonymize(emailValidation.body)

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

    // Use anonymized data in prompts sent to AI
    const categoryPrompt = `Customer: ${anonymizedName}
Email: ${anonymizedEmail}
Subject: ${anonymizedSubject}
Message: ${anonymizedBody}`

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

    // Fetch and process knowledge base entries from database
    let relevantKbEntries = ''
    try {
      // Extract search terms from the customer message (using validated data)
      const searchTerms = extractSearchTerms(`${emailValidation.subject} ${emailValidation.body}`)

      // Fetch relevant knowledge base entries from database
      const dbEntries = await KnowledgeBaseModel.findRelevant(
        orgId,
        parsedCategory.category, // Use detected category
        searchTerms
      )

      if (dbEntries.length > 0) {
        relevantKbEntries = '\n\nRELEVANT CASE RESOLUTIONS:\n' +
          dbEntries.map((entry, index) =>
            `${index + 1}. Issue: ${entry.case_summary}\n   Resolution: ${entry.resolution}`
          ).join('\n\n')
      }
    } catch (error) {
      console.warn('Knowledge base entry processing failed:', error)
    }

    // Fetch Shopify customer context if integration is enabled
    let shopifyContext = ''
    let shopifyConnected = false
    try {
      const shopifyClient = await ShopifyClient.fromOrganizationId(orgId)
      if (shopifyClient) {
        shopifyConnected = true

        // First, try to find customer by email
        const customerContext = await shopifyClient.getCustomerContext(emailValidation.customerEmail)
        if (customerContext) {
          shopifyContext = formatShopifyContextForAI(customerContext)
          console.log(`[Shopify] Found customer context for ${emailValidation.customerEmail}: ${customerContext.totalOrders} orders`)
        } else {
          // Fallback: try to find order by number if mentioned in the message
          const orderNumbers = extractOrderNumbers(`${emailValidation.subject} ${emailValidation.body}`)
          if (orderNumbers.length > 0) {
            console.log(`[Shopify] Customer not found, trying order numbers: ${orderNumbers.join(', ')}`)
            for (const orderNum of orderNumbers) {
              const order = await shopifyClient.getOrderByNumber(orderNum)
              if (order) {
                shopifyContext = formatSingleOrderForAI(order)
                console.log(`[Shopify] Found order ${order.name} by number search`)
                break // Use first found order
              }
            }
          }

          // If still no data found, log for debugging
          if (!shopifyContext) {
            console.log(`[Shopify] No customer or order data found for email: ${emailValidation.customerEmail}`)
          }
        }
      }
    } catch (error) {
      // Graceful degradation - continue without Shopify context
      console.warn('Shopify context fetch failed, continuing without:', error)
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

Use these previous resolutions as guidance for handling similar issues. If the current customer inquiry is similar to any of these cases, adapt the successful resolution approach while personalizing it for the current customer's specific situation.` : ''}${shopifyContext ? `

IMPORTANT: The following is the customer's order history from our Shopify store. Use this information to provide accurate, personalized responses about their orders, shipping status, and purchase history:

${shopifyContext}

When responding:
- Reference specific order numbers (e.g., #1001) when discussing their orders
- Provide accurate shipping/fulfillment status if they're asking about delivery
- Acknowledge their purchase history to provide personalized service
- If they're asking about a specific order, locate it in the history and address their concern directly` : shopifyConnected ? `

IMPORTANT: Our Shopify store is connected, but NO order history was found for this customer's email address. This means either:
- They used a different email for their purchase
- They haven't made a purchase yet
- The order was placed under a different account

DO NOT make up or invent any order information. If they mention an order or purchase, politely ask them to:
1. Confirm the email address they used for the order
2. Provide the order number if they have it
3. Check if they received an order confirmation email

Never fabricate order details, product names, prices, or tracking information.` : ''}`

    // Use anonymized data in the main response prompt
    const aiResponsePrompt = `Customer: ${anonymizedName}
Email: ${anonymizedEmail}
Subject: ${anonymizedSubject}
Message: ${anonymizedBody}

Generate a professional customer support response.`

    const anonymizedAiResponse = await aiService.generateText(
      aiResponseSystem,
      aiResponsePrompt
    )

    // Re-hydrate the AI response with original customer data
    const aiResponse = piiAnonymizer.rehydrate(anonymizedAiResponse)

    // Track token usage for managed plans (using chars/4 estimation)
    // Includes both category detection and response generation
    if (isManaged) {
      const estimatedTokens = TokenUsageModel.estimateTokens(
        categorySystem + categoryPrompt + categoryResponse +
        aiResponseSystem + aiResponsePrompt + anonymizedAiResponse
      )
      await TokenUsageModel.incrementUsage(orgId, estimatedTokens)
    }

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
    // Handle email validation errors
    if (error instanceof Error && error.message.includes('Email validation failed')) {
      return NextResponse.json({ error: 'Invalid email data provided' }, { status: 400 })
    }
    console.error("[v0] Error generating AI response:", error)

    // Provide specific error messages for common issues
    let errorMessage = "Failed to generate AI response"

    if (error instanceof Error && process.env.NODE_ENV !== 'production') {
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

// Apply rate limiting: 10 AI requests per minute (expensive operation)
export const POST = withRateLimit(handler, 'ai')
