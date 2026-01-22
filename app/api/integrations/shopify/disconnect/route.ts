import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { OrganizationSettingsModel } from '@/lib/models/organization-settings'

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgUser = await getOrgAndUserByEmail(session.user.email)
    if (!orgUser) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get existing settings
    const existingSettings = await OrganizationSettingsModel.findByOrganizationId(orgUser.organizationId)

    if (!existingSettings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
    }

    // Clear Shopify integration data
    const updatedSettings = {
      ...existingSettings,
      shopifyIntegration: {
        enabled: false,
        // Clear all credentials
        shopDomain: undefined,
        accessToken: undefined,
        scope: undefined,
        installedAt: undefined,
      },
    }

    // Save updated settings
    await OrganizationSettingsModel.upsert(orgUser.organizationId, updatedSettings)

    console.log(`Shopify disconnected for org ${orgUser.organizationId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Shopify disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Shopify' },
      { status: 500 }
    )
  }
}
