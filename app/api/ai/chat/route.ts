import { NextResponse, type NextRequest } from "next/server"
import { AIService } from "@/lib/ai-providers"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { EmailUsageModel } from '@/lib/models/email-usage'
import { TokenUsageModel } from '@/lib/models/token-usage'
import { canUseAIWithConfig } from '@/lib/ai-config-helpers'
import { ShopifyClient } from '@/lib/shopify-client'

async function requireOrg(headers: Headers): Promise<{ organizationId: string }> {
  const session = await auth.api.getSession({ headers })
  if (!session?.user?.email) throw new Error('UNAUTHORIZED')
  const orgUser = await getOrgAndUserByEmail(session.user.email)
  if (!orgUser) throw new Error('ORG_NOT_FOUND')
  return { organizationId: orgUser.organizationId }
}

// Build Shopify context string for AI prompt
function buildShopifyContext(customerData: {
  totalOrders?: number
  totalSpent?: string
  currency?: string
  customerSince?: string
  recentOrders?: Array<{
    name: string
    createdAt: string
    fulfillmentStatus: string | null
    financialStatus: string
    totalPrice: string
    currency: string
    lineItems: Array<{ title: string; quantity: number }>
  }>
}): string {
  const lines: string[] = ['## Shopify Customer Data']

  if (customerData.totalOrders !== undefined) {
    lines.push(`- Total orders: ${customerData.totalOrders}`)
  }
  if (customerData.totalSpent && customerData.currency) {
    lines.push(`- Total spent: ${customerData.currency} ${customerData.totalSpent}`)
  }
  if (customerData.customerSince) {
    lines.push(`- Customer since: ${new Date(customerData.customerSince).toLocaleDateString()}`)
  }

  if (customerData.recentOrders && customerData.recentOrders.length > 0) {
    lines.push('\n### Recent Orders:')
    for (const order of customerData.recentOrders.slice(0, 3)) {
      const status = order.fulfillmentStatus || 'Unfulfilled'
      const items = order.lineItems.map(i => `${i.quantity}x ${i.title}`).join(', ')
      lines.push(`- Order ${order.name} (${new Date(order.createdAt).toLocaleDateString()}): ${status}, ${order.financialStatus}, ${order.currency} ${order.totalPrice}`)
      lines.push(`  Items: ${items}`)
    }
  }

  return lines.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    // Accept legacy shape with aiConfig but ignore any client-sent apiKey; use DB-config instead
    type ChatRequestBody = { system?: string; prompt?: string; customerEmail?: string }
    const bodyUnknown = await request.json().catch(() => ({})) as unknown
    const body: ChatRequestBody = (typeof bodyUnknown === 'object' && bodyUnknown !== null)
      ? bodyUnknown as ChatRequestBody
      : {}
    let system = body.system
    const prompt = body.prompt
    const customerEmail = body.customerEmail

    if (!system || !prompt) {
      return NextResponse.json({ error: 'system and prompt are required' }, { status: 400 })
    }

    // Load effective AI configuration (handles managed vs BYOK plans)
    const { organizationId: orgId } = await requireOrg(request.headers)

    // Fetch Shopify data if customer email provided
    if (customerEmail) {
      try {
        const shopifyClient = await ShopifyClient.fromOrganizationId(orgId)
        if (shopifyClient) {
          const customerContext = await shopifyClient.getCustomerContext(customerEmail)
          if (customerContext) {
            const shopifyContext = buildShopifyContext(customerContext)
            system = `${shopifyContext}\n\n${system}`
          }
        }
      } catch (err) {
        // Log but don't fail the request if Shopify fetch fails
        console.error('Failed to fetch Shopify context:', err)
      }
    }

    // Check email usage limits before allowing AI generation
    const usageCheck = await EmailUsageModel.canSendEmail(orgId)
    if (!usageCheck.allowed) {
      return NextResponse.json({
        error: usageCheck.reason,
        code: 'USAGE_LIMIT_REACHED',
        usage: usageCheck.usage,
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
    const content = await aiService.generateText(system, prompt)

    // Track token usage for managed plans
    if (isManaged) {
      const estimatedTokens = TokenUsageModel.estimateTokens(system + prompt + content)
      await TokenUsageModel.incrementUsage(orgId, estimatedTokens)
    }

    return NextResponse.json({ content })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    console.error('AI chat error:', error)
    let message = 'Failed to generate AI response'
    if (error instanceof Error) {
      if (error.message.includes('fetch')) message = 'Cannot connect to AI service. Please check your configuration.'
      else message = error.message
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
