import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { ShopifyClient } from '@/lib/shopify-client'

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

    // Get customer email from query params
    const { searchParams } = new URL(request.url)
    const customerEmail = searchParams.get('email')

    if (!customerEmail) {
      return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 })
    }

    // Get Shopify client for this organization
    const shopifyClient = await ShopifyClient.fromOrganizationId(orgUser.organizationId)

    if (!shopifyClient) {
      return NextResponse.json({
        enabled: false,
        message: 'Shopify integration not configured or disabled',
      })
    }

    // Fetch customer context from Shopify
    const customerContext = await shopifyClient.getCustomerContext(customerEmail)

    if (!customerContext) {
      return NextResponse.json({
        enabled: true,
        found: false,
        message: 'Customer not found in Shopify',
      })
    }

    return NextResponse.json({
      enabled: true,
      found: true,
      ...customerContext,
    })
  } catch (error) {
    console.error('Shopify customer fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer data' },
      { status: 500 }
    )
  }
}
