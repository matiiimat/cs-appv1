import { type NextRequest, NextResponse } from "next/server"
import { OrganizationSettingsModel, SettingsDataSchema } from "@/lib/models/organization-settings"

// For now, we'll use the demo organization ID from seeded data
// In production, this would come from authentication/JWT
const DEMO_ORGANIZATION_ID = "82ef6e9f-e0b2-419f-82e3-2468ae4c1d21"

export async function GET() {
  try {
    console.log(`Fetching settings for organization: ${DEMO_ORGANIZATION_ID}`)
    const settings = await OrganizationSettingsModel.findByOrganizationId(DEMO_ORGANIZATION_ID)

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
          model: "mistralai/devstral-small-2505",
          apiKey: "",
          localEndpoint: "http://192.168.1.24:1234",
          temperature: 0.7,
          maxTokens: 1000,
        },
        aiConfigHasKey: false,
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
    }
    return NextResponse.json(sanitized)
  } catch (error) {
    console.error('Error fetching organization settings:', error)
    return NextResponse.json(
      { error: "Failed to fetch organization settings" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const settingsData = await request.json()

    // Validate input data
    const validatedData = SettingsDataSchema.parse(settingsData)

    // Save settings to database
    const result = await OrganizationSettingsModel.upsert(DEMO_ORGANIZATION_ID, validatedData)

    return NextResponse.json({
      success: true,
      version: result.version,
      lastSaved: validatedData.lastSaved
    })
  } catch (error) {
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
