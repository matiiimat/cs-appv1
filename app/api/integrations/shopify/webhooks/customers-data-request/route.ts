import { type NextRequest, NextResponse } from 'next/server'
import { validateShopifyHmac } from '@/lib/shopify-client'

/**
 * Shopify Mandatory Webhook: customers/data_request
 *
 * Called when a customer requests their data (GDPR data portability).
 * We should return/email the data we have about this customer.
 *
 * For Aidly, we fetch Shopify data on-demand and don't permanently store
 * customer data, so we acknowledge the request and note that no additional
 * data is stored beyond what's in Shopify.
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for HMAC verification
    const rawBody = await request.text()
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')

    if (!hmacHeader) {
      console.error('[Shopify Webhook] Missing HMAC header')
      return NextResponse.json({ error: 'Missing HMAC header' }, { status: 401 })
    }

    // Verify HMAC signature
    if (!validateShopifyHmac(rawBody, hmacHeader)) {
      console.error('[Shopify Webhook] Invalid HMAC signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody)

    console.log('[Shopify Webhook] customers/data_request received:', {
      shop_domain: payload.shop_domain,
      customer_id: payload.customer?.id,
      orders_requested: payload.orders_requested?.length || 0,
    })

    // Aidly fetches Shopify data on-demand and does not permanently store
    // customer personal data. Support messages are associated with email
    // addresses but the Shopify customer data is fetched live from Shopify.
    //
    // If we stored customer data, we would:
    // 1. Query our database for this customer's data
    // 2. Compile it into a report
    // 3. Send it to the shop owner or customer

    // Acknowledge the request - Shopify expects 200 OK
    return NextResponse.json({
      received: true,
      message: 'Data request acknowledged. Aidly fetches customer data on-demand from Shopify and does not maintain separate customer data storage.'
    })
  } catch (error) {
    console.error('[Shopify Webhook] customers/data_request error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
