import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { SlackNotifier } from '@/lib/slack-notifier'
import { OrganizationSettingsModel } from '@/lib/models/organization-settings'
import { withRateLimit } from '@/lib/rate-limiter'

async function handler(request: NextRequest) {
  try {
    // Auth check
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgUser = await getOrgAndUserByEmail(session.user.email)
    if (!orgUser) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get webhook URL from request body or fall back to saved settings
    const body = await request.json().catch(() => ({}))
    let webhookUrl = (body as { webhookUrl?: string }).webhookUrl

    // If no URL provided, try to get from saved settings
    if (!webhookUrl) {
      const settings = await OrganizationSettingsModel.findByOrganizationId(orgUser.organizationId)
      webhookUrl = settings?.slackIntegration?.webhookUrl
    }

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No webhook URL configured' },
        { status: 400 }
      )
    }

    // Test the webhook
    const result = await SlackNotifier.testWebhook(webhookUrl)

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[Slack Test] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to test Slack webhook' },
      { status: 500 }
    )
  }
}

// Rate limit: 5 tests per minute
export const POST = withRateLimit(handler, 'auth')
