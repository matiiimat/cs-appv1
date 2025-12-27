import { type NextRequest, NextResponse } from "next/server"
import { OrganizationSettingsModel, SettingsDataSchema } from "@/lib/models/organization-settings"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { db } from '@/lib/database'
import { updateOrganizationName } from '@/lib/tenant'

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
    // Load current organization name to expose as brandName
    let brandName = ''
    try {
      const res = await db.query<{ name: string }>('SELECT name FROM organizations WHERE id = $1', [orgId])
      if (res.rows[0]?.name) {
        // Provide a clean brand default (strip trailing "'s Workspace")
        brandName = res.rows[0].name.replace(/'s Workspace\s*$/i, '').trim()
      }
    } catch {}

    if (!settings) {
      console.log('No settings found, returning defaults')
      // Return default settings if none exist
      return NextResponse.json({
        brandName,
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
        slackIntegration: {
          enabled: false,
        },
        slackWebhookConfigured: false,
      })
    }

    // Sanitize: do not expose API keys or webhook URLs in response
    const hasKey = Boolean(settings?.aiConfig?.apiKey && String(settings.aiConfig.apiKey).trim() !== '')
    const hasWebhook = Boolean(settings?.slackIntegration?.webhookUrl && String(settings.slackIntegration.webhookUrl).trim() !== '')
    const sanitized = {
      ...settings,
      aiConfig: {
        ...settings.aiConfig,
        apiKey: ""
      },
      slackIntegration: settings.slackIntegration ? {
        enabled: settings.slackIntegration.enabled,
        webhookUrl: "" // Don't expose webhook URL
      } : { enabled: false },
      aiConfigHasKey: hasKey,
      slackWebhookConfigured: hasWebhook,
      hasSavedSettings: true,
    }
    return NextResponse.json({ ...sanitized, brandName })
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

    // Preserve existing API key and webhook URL if client posts empty string (since GET hides them)
    try {
      const existing = await OrganizationSettingsModel.findByOrganizationId(orgId)

      // Preserve API key
      const incomingKey = (validatedData?.aiConfig?.apiKey || '').trim()
      const existingKey = (existing?.aiConfig?.apiKey || '').trim()
      if (!incomingKey && existingKey) {
        validatedData.aiConfig.apiKey = existingKey
      }

      // Preserve Slack webhook URL
      const incomingWebhook = (validatedData?.slackIntegration?.webhookUrl || '').trim()
      const existingWebhook = (existing?.slackIntegration?.webhookUrl || '').trim()
      if (!incomingWebhook && existingWebhook && validatedData.slackIntegration) {
        validatedData.slackIntegration.webhookUrl = existingWebhook
      }
    } catch {}

    // Save settings to database
    const result = await OrganizationSettingsModel.upsert(orgId, validatedData)

    // If brandName is provided, update organizations.name to match exactly
    const brand = typeof validatedData.brandName === 'string' ? validatedData.brandName.trim() : ''
    if (brand) {
      await updateOrganizationName(orgId, brand)
    }

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
