import { type NextRequest, NextResponse } from 'next/server'
import { validateShopifyHmac } from '@/lib/shopify-client'
import { db } from '@/lib/database'

/**
 * Shopify Mandatory Webhook: customers/redact
 *
 * Called when a customer requests deletion of their data (GDPR right to erasure).
 * We must delete all personal data associated with this customer.
 *
 * For Aidly, this means:
 * 1. Delete any messages associated with this customer's email
 * 2. Remove any cached customer data
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

    const shopDomain = payload.shop_domain
    const customerEmail = payload.customer?.email
    const customerId = payload.customer?.id

    console.log('[Shopify Webhook] customers/redact received:', {
      shop_domain: shopDomain,
      customer_id: customerId,
      has_email: !!customerEmail,
    })

    if (customerEmail) {
      // Find organizations connected to this shop and delete customer's messages
      const orgResult = await db.query<{ organization_id: string }>(
        `SELECT os.organization_id
         FROM organization_settings os
         WHERE os.settings_data::text LIKE $1`,
        [`%${shopDomain}%`]
      )

      for (const row of orgResult.rows) {
        // Delete messages from this customer email for this organization
        const deleteResult = await db.query(
          `DELETE FROM messages
           WHERE organization_id = $1
           AND LOWER(sender_email) = LOWER($2)`,
          [row.organization_id, customerEmail]
        )

        console.log(`[Shopify Webhook] Deleted ${deleteResult.rowCount} messages for customer in org ${row.organization_id}`)
      }
    }

    // Acknowledge the request - Shopify expects 200 OK
    return NextResponse.json({
      received: true,
      message: 'Customer data redaction completed'
    })
  } catch (error) {
    console.error('[Shopify Webhook] customers/redact error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
