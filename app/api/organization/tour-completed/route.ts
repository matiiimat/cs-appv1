import { type NextRequest, NextResponse } from "next/server"
import { OrganizationSettingsModel } from "@/lib/models/organization-settings"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgUser = await getOrgAndUserByEmail(session.user.email)
    if (!orgUser) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get existing settings
    const existing = await OrganizationSettingsModel.findByOrganizationId(orgUser.organizationId)

    if (!existing) {
      // No settings yet - this shouldn't happen normally but handle gracefully
      // Just return success - the tour completion will be saved when settings are created
      return NextResponse.json({ success: true, deferred: true })
    }

    // Update only hasCompletedTour
    const updated = {
      ...existing,
      hasCompletedTour: true,
    }

    await OrganizationSettingsModel.upsert(orgUser.organizationId, updated)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving tour completion:', error)
    return NextResponse.json(
      { error: "Failed to save tour completion" },
      { status: 500 }
    )
  }
}
