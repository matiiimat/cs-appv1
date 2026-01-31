import { type NextRequest, NextResponse } from 'next/server'
import { validateShopifyHmac } from '@/lib/shopify-client'
import { db } from '@/lib/database'

/**
 * Unified Shopify Compliance Webhooks Handler
 *
 * Handles all three mandatory GDPR compliance webhooks:
 * - customers/data_request: Customer requests their data
 * - customers/redact: Customer requests data deletion
 * - shop/redact: Merchant uninstalls app (48hrs after)
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for HMAC verification
    const rawBody = await request.text()
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
    const topic = request.headers.get('x-shopify-topic')

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

    console.log(`[Shopify Webhook] Received topic: ${topic}`, {
      shop_domain: payload.shop_domain,
    })

    // Route to appropriate handler based on topic
    switch (topic) {
      case 'customers/data_request':
        return handleCustomerDataRequest(payload)

      case 'customers/redact':
        return handleCustomerRedact(payload)

      case 'shop/redact':
        return handleShopRedact(payload)

      default:
        console.warn(`[Shopify Webhook] Unknown topic: ${topic}`)
        return NextResponse.json({ received: true, message: 'Unknown topic' })
    }
  } catch (error) {
    console.error('[Shopify Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

/**
 * customers/data_request handler
 * Customer requests their data (GDPR data portability)
 */
async function handleCustomerDataRequest(payload: {
  shop_domain: string
  customer?: { id: string; email?: string }
  orders_requested?: Array<{ id: string }>
}) {
  console.log('[Shopify Webhook] customers/data_request:', {
    shop_domain: payload.shop_domain,
    customer_id: payload.customer?.id,
    orders_requested: payload.orders_requested?.length || 0,
  })

  // Aidly fetches Shopify data on-demand and does not permanently store
  // customer personal data beyond support messages.
  // Support messages contain customer emails but the order data is fetched live.

  return NextResponse.json({
    received: true,
    message: 'Data request acknowledged. Aidly fetches customer data on-demand from Shopify and does not maintain separate customer data storage.',
  })
}

/**
 * customers/redact handler
 * Customer requests deletion of their data (GDPR right to erasure)
 */
async function handleCustomerRedact(payload: {
  shop_domain: string
  customer?: { id: string; email?: string }
}) {
  const shopDomain = payload.shop_domain
  const customerEmail = payload.customer?.email
  const customerId = payload.customer?.id

  console.log('[Shopify Webhook] customers/redact:', {
    shop_domain: shopDomain,
    customer_id: customerId,
    has_email: !!customerEmail,
  })

  if (customerEmail) {
    try {
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

        console.log(
          `[Shopify Webhook] Deleted ${deleteResult.rowCount} messages for customer in org ${row.organization_id}`
        )
      }
    } catch (dbError) {
      console.error('[Shopify Webhook] Database error during customer redact:', dbError)
    }
  }

  return NextResponse.json({
    received: true,
    message: 'Customer data redaction completed',
  })
}

/**
 * shop/redact handler
 * Called 48 hours after a merchant uninstalls the app
 */
async function handleShopRedact(payload: {
  shop_id: string
  shop_domain: string
}) {
  const shopId = payload.shop_id
  const shopDomain = payload.shop_domain

  console.log('[Shopify Webhook] shop/redact:', {
    shop_id: shopId,
    shop_domain: shopDomain,
  })

  try {
    // Find organizations connected to this shop and clear their Shopify integration
    const orgResult = await db.query<{ organization_id: string; settings_data: string }>(
      `SELECT os.organization_id, os.settings_data
       FROM organization_settings os
       WHERE os.settings_data::text LIKE $1`,
      [`%${shopDomain}%`]
    )

    for (const row of orgResult.rows) {
      try {
        // Parse current settings
        const settings = JSON.parse(row.settings_data)

        // Check if this is the connected shop
        if (
          settings.shopifyIntegration?.shopDomain?.includes(
            shopDomain.replace('.myshopify.com', '')
          )
        ) {
          // Clear Shopify integration data
          settings.shopifyIntegration = {
            enabled: false,
            shopDomain: null,
            accessToken: null,
            scope: null,
            installedAt: null,
          }

          // Update settings
          await db.query(
            `UPDATE organization_settings
             SET settings_data = $1, updated_at = NOW()
             WHERE organization_id = $2`,
            [JSON.stringify(settings), row.organization_id]
          )

          console.log(
            `[Shopify Webhook] Cleared Shopify integration for org ${row.organization_id}`
          )
        }
      } catch (parseError) {
        console.error(
          `[Shopify Webhook] Error processing org ${row.organization_id}:`,
          parseError
        )
      }
    }
  } catch (dbError) {
    console.error('[Shopify Webhook] Database error during shop redact:', dbError)
  }

  return NextResponse.json({
    received: true,
    message: 'Shop data redaction completed',
  })
}
