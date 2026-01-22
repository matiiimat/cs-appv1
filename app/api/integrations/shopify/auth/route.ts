import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { generateShopifyAuthUrl, normalizeShopDomain } from '@/lib/shopify-client'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
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

    // Get shop domain from query params
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter. Provide your Shopify store URL.' },
        { status: 400 }
      )
    }

    // Validate shop domain format
    const shopDomain = normalizeShopDomain(shop)
    if (!shopDomain.endsWith('.myshopify.com')) {
      return NextResponse.json(
        { error: 'Invalid shop domain. Please use your .myshopify.com domain.' },
        { status: 400 }
      )
    }

    // Generate a secure state parameter (prevents CSRF)
    // State includes org ID for verification on callback
    const stateData = {
      orgId: orgUser.organizationId,
      nonce: crypto.randomBytes(16).toString('hex'),
      timestamp: Date.now(),
    }
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

    // Generate the Shopify OAuth URL
    const authUrl = generateShopifyAuthUrl(shopDomain, state)

    // Set state in a secure, HTTP-only cookie for verification
    const response = NextResponse.redirect(authUrl)
    response.cookies.set('shopify_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Shopify auth error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Shopify authorization' },
      { status: 500 }
    )
  }
}
