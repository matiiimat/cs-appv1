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

    // Get search parameters
    const { searchParams } = new URL(request.url)
    const customerEmail = searchParams.get('email')
    const orderNumber = searchParams.get('order')

    if (!customerEmail && !orderNumber) {
      return NextResponse.json({ error: 'Missing email or order parameter' }, { status: 400 })
    }

    // Get Shopify client for this organization
    const shopifyClient = await ShopifyClient.fromOrganizationId(orgUser.organizationId)

    if (!shopifyClient) {
      return NextResponse.json({
        enabled: false,
        message: 'Shopify integration not configured or disabled',
      })
    }

    // Search by email first
    if (customerEmail) {
      const customerContext = await shopifyClient.getCustomerContext(customerEmail)

      if (customerContext) {
        return NextResponse.json({
          enabled: true,
          found: true,
          searchType: 'email',
          ...customerContext,
        })
      }
    }

    // If no customer found by email and we have an order number, search by order
    if (orderNumber) {
      const order = await shopifyClient.getOrderByNumber(orderNumber)

      if (order) {
        return NextResponse.json({
          enabled: true,
          found: true,
          searchType: 'order',
          totalOrders: 1,
          totalSpent: order.totalPrice,
          currency: order.currency,
          recentOrders: [order],
        })
      }
    }

    return NextResponse.json({
      enabled: true,
      found: false,
      message: customerEmail
        ? 'Customer not found in Shopify. Try searching by order number.'
        : 'Order not found in Shopify.',
    })
  } catch (error) {
    console.error('Shopify customer fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer data' },
      { status: 500 }
    )
  }
}
