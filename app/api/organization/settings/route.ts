import { type NextRequest, NextResponse } from "next/server"
import { OrganizationSettingsModel, SettingsDataSchema } from "@/lib/models/organization-settings"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'

async function requireOrgId(headers: Headers): Promise<string> {
  const session = await auth.api.getSession({ headers })
  if (!session?.user?.email) throw new Error('UNAUTHORIZED')
  const orgUser = await getOrgAndUserByEmail(session.user.email)
  if (!orgUser) throw new Error('ORG_NOT_FOUND')
  return orgUser.organizationId
}

export async function GET(request: NextRequest) {
  try {
    const orgId = await requireOrgId(request.headers)
    const settings = await OrganizationSettingsModel.findByOrganizationId(orgId)

    if (!settings) {
      console.log('No settings found, returning defaults')
      // Return default settings if none exist
      return NextResponse.json({
        theme: "light",
        agentName: "Support Agent",
        agentSignature: "Best regards,\nSupport Team",
        aiInstructions: "You are a helpful customer support AI assistant. Be professional, empathetic, and provide clear solutions.",
        categories: [
          { id: "1", name: "Technical Support", color: "#ef4444" },
          { id: "2", name: "Billing", color: "#22c55e" },
          { id: "3", name: "General Inquiry", color: "#3b82f6" },
        ],
        quickActions: [
          {
            id: "1",
            title: "Translate ES",
            action: "Translate the response to Spanish",
          },
          {
            id: "2",
            title: "Make Formal",
            action: "Rewrite the response in a more formal tone",
          },
          {
            id: "3",
            title: "Simplify",
            action: "Simplify the response for easier understanding",
          },
        ],
        aiConfig: {
          provider: "local",
          model: "",
          apiKey: "",
          localEndpoint: "",
          temperature: 0.7,
          maxTokens: 1000,
        },
        aiConfigHasKey: false,
        hasSavedSettings: false,
        companyKnowledge: "",
        messageAgeThresholds: {
          greenHours: 20,
          yellowHours: 24,
          redHours: 48,
        },
      })
    }

    // Sanitize: do not expose API keys in response
    const hasKey = Boolean(settings?.aiConfig?.apiKey && String(settings.aiConfig.apiKey).trim() !== '')
    const sanitized = {
      ...settings,
      aiConfig: {
        ...settings.aiConfig,
        apiKey: ""
      },
      aiConfigHasKey: hasKey,
      hasSavedSettings: true,
    }
    return NextResponse.json(sanitized)
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    console.error('Error fetching organization settings:', error)
    return NextResponse.json(
      { error: "Failed to fetch organization settings" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await requireOrgId(request.headers)
    const settingsData = await request.json()

    // Validate input data
    const validatedData = SettingsDataSchema.parse(settingsData)

    // Save settings to database
    const result = await OrganizationSettingsModel.upsert(orgId, validatedData)

    return NextResponse.json({
      success: true,
      version: result.version,
      lastSaved: validatedData.lastSaved
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    console.error('Error saving organization settings:', error)
    return NextResponse.json(
      { error: "Failed to save organization settings" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  // PUT is the same as POST for settings (upsert)
  return POST(request)
}
