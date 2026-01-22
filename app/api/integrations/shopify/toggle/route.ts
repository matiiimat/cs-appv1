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

    // Get request body
    const body = await request.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }

    // Get existing settings
    const existingSettings = await OrganizationSettingsModel.findByOrganizationId(orgUser.organizationId)

    if (!existingSettings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
    }

    // Check if Shopify is connected before allowing enable
    if (enabled && !existingSettings.shopifyIntegration?.accessToken) {
      return NextResponse.json(
        { error: 'Cannot enable Shopify integration without connecting a store first' },
        { status: 400 }
      )
    }

    // Update only the enabled flag, preserving credentials
    const updatedSettings = {
      ...existingSettings,
      shopifyIntegration: {
        ...existingSettings.shopifyIntegration,
        enabled: enabled,
      },
    }

    // Save updated settings
    await OrganizationSettingsModel.upsert(orgUser.organizationId, updatedSettings)

    console.log(`Shopify ${enabled ? 'enabled' : 'disabled'} for org ${orgUser.organizationId}`)

    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error('Shopify toggle error:', error)
    return NextResponse.json(
      { error: 'Failed to toggle Shopify integration' },
      { status: 500 }
    )
  }
}
