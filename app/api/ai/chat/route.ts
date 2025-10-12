import { NextResponse, type NextRequest } from "next/server"
import { AIService } from "@/lib/ai-providers"
import { OrganizationSettingsModel } from "@/lib/models/organization-settings"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'

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
    const body = await request.json().catch(() => ({})) as any
    const system: string = body?.system
    const prompt: string = body?.prompt

    if (!system || !prompt) {
      return NextResponse.json({ error: 'system and prompt are required' }, { status: 400 })
    }

    // Load effective AI configuration from the database (mirrors generate-response)
    const orgId = await requireOrgId(request.headers)
    const orgSettings = await OrganizationSettingsModel.findByOrganizationId(orgId)

    if (!orgSettings || !orgSettings.aiConfig) {
      return NextResponse.json({ error: 'AI configuration is required' }, { status: 400 })
    }

    const effectiveAiConfig = {
      provider: orgSettings.aiConfig.provider,
      model: orgSettings.aiConfig.model,
      apiKey: orgSettings.aiConfig.apiKey, // decrypted from DB
      customEndpoint: orgSettings.aiConfig.customEndpoint,
      localEndpoint: orgSettings.aiConfig.localEndpoint,
      temperature: orgSettings.aiConfig.temperature,
      maxTokens: orgSettings.aiConfig.maxTokens,
    }

    if (!effectiveAiConfig.apiKey && effectiveAiConfig.provider !== 'local') {
      return NextResponse.json({ error: 'AI configuration is required' }, { status: 400 })
    }

    const aiService = new AIService(effectiveAiConfig)
    const content = await aiService.generateText(system, prompt)

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
