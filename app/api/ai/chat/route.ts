import { NextResponse, type NextRequest } from "next/server"
import { AIService } from "@/lib/ai-providers"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { EmailUsageModel } from '@/lib/models/email-usage'
import { TokenUsageModel } from '@/lib/models/token-usage'
import { canUseAIWithConfig } from '@/lib/ai-config-helpers'

async function requireOrgId(headers: Headers): Promise<string> {
  const session = await auth.api.getSession({ headers })
  if (!session?.user?.email) throw new Error('UNAUTHORIZED')
  const orgUser = await getOrgAndUserByEmail(session.user.email)
  if (!orgUser) throw new Error('ORG_NOT_FOUND')
  return orgUser.organizationId
}

export async function POST(request: NextRequest) {
  try {
    // Accept legacy shape with aiConfig but ignore any client-sent apiKey; use DB-config instead
    type ChatRequestBody = { system?: string; prompt?: string }
    const bodyUnknown = await request.json().catch(() => ({})) as unknown
    const body: ChatRequestBody = (typeof bodyUnknown === 'object' && bodyUnknown !== null)
      ? bodyUnknown as ChatRequestBody
      : {}
    const system = body.system
    const prompt = body.prompt

    if (!system || !prompt) {
      return NextResponse.json({ error: 'system and prompt are required' }, { status: 400 })
    }

    // Load effective AI configuration (handles managed vs BYOK plans)
    const orgId = await requireOrgId(request.headers)

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
