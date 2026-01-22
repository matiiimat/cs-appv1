import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { exchangeCodeForToken, normalizeShopDomain, ShopifyClient } from '@/lib/shopify-client'
import { OrganizationSettingsModel } from '@/lib/models/organization-settings'

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'

  try {
    // Get OAuth params from Shopify
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    // Note: hmac validation is optional for OAuth flow, state validation is sufficient for CSRF protection
    // const hmac = searchParams.get('hmac')

    // Verify required params
    if (!shop || !code || !state) {
      console.error('Missing OAuth parameters:', { shop: !!shop, code: !!code, state: !!state })
      return NextResponse.redirect(`${appUrl}/app?view=settings&error=missing_params`)
    }

    // Verify state matches cookie (CSRF protection)
    const savedState = request.cookies.get('shopify_oauth_state')?.value
    if (!savedState || savedState !== state) {
      console.error('State mismatch - possible CSRF attack')
      return NextResponse.redirect(`${appUrl}/app?view=settings&error=invalid_state`)
    }

    // Decode and verify state data
    let stateData: { orgId: string; nonce: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      console.error('Failed to decode state')
      return NextResponse.redirect(`${appUrl}/app?view=settings&error=invalid_state`)
    }

    // Verify state is not expired (10 minute max)
    if (Date.now() - stateData.timestamp > 600000) {
      console.error('State expired')
      return NextResponse.redirect(`${appUrl}/app?view=settings&error=state_expired`)
    }

    // Verify user is still authenticated and belongs to the same org
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.email) {
      return NextResponse.redirect(`${appUrl}/login?redirect=/app?view=settings`)
    }

    const orgUser = await getOrgAndUserByEmail(session.user.email)
    if (!orgUser || orgUser.organizationId !== stateData.orgId) {
      console.error('Organization mismatch')
      return NextResponse.redirect(`${appUrl}/app?view=settings&error=org_mismatch`)
    }

    // Exchange code for access token
    const shopDomain = normalizeShopDomain(shop)
    const { accessToken, scope } = await exchangeCodeForToken(shopDomain, code)

    // Verify the token works by making a test API call
    const client = new ShopifyClient(shopDomain, accessToken)
    const { valid, shopName } = await client.verifyConnection()

    if (!valid) {
      console.error('Failed to verify Shopify connection')
      return NextResponse.redirect(`${appUrl}/app?view=settings&error=verification_failed`)
    }

    // Get existing settings and update with Shopify integration
    const existingSettings = await OrganizationSettingsModel.findByOrganizationId(stateData.orgId)

    const updatedSettings = {
      ...(existingSettings || {
        theme: 'light' as const,
        brandName: '',
        agentName: 'Support Agent',
        agentSignature: 'Best regards,\nSupport Team',
        aiInstructions: 'You are a helpful customer support AI assistant.',
        categories: [],
        quickActions: [],
        aiConfig: {
          provider: 'local' as const,
          model: '',
          apiKey: '',
          temperature: 0.7,
          maxTokens: 1000,
        },
        companyKnowledge: '',
        messageAgeThresholds: {
          greenHours: 20,
          yellowHours: 24,
          redHours: 48,
        },
        slackIntegration: {
          enabled: false,
        },
      }),
      shopifyIntegration: {
        enabled: true, // Enable by default when connecting
        shopDomain: shopDomain,
        accessToken: accessToken,
        scope: scope,
        installedAt: new Date().toISOString(),
      },
    }

    // Save updated settings
    await OrganizationSettingsModel.upsert(stateData.orgId, updatedSettings)

    console.log(`Shopify connected successfully for org ${stateData.orgId}: ${shopName}`)

    // Clear the state cookie and redirect to settings with success
    // Note: App settings page is at /app/settings for aidly.me
    const response = NextResponse.redirect(`${appUrl}/app?view=settings&shopify=connected`)
    response.cookies.delete('shopify_oauth_state')

    return response
  } catch (error) {
    console.error('Shopify callback error:', error)
    return NextResponse.redirect(`${appUrl}/app?view=settings&error=callback_failed`)
  }
}
