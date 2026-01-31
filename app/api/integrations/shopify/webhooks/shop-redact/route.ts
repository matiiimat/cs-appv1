import { type NextRequest, NextResponse } from 'next/server'
import { validateShopifyHmac } from '@/lib/shopify-client'
import { db } from '@/lib/database'

/**
 * Shopify Mandatory Webhook: shop/redact
 *
 * Called 48 hours after a merchant uninstalls your app.
 * We must delete all data associated with this shop.
 *
 * For Aidly, this means:
 * 1. Remove Shopify integration settings (access token, shop domain)
 * 2. Optionally: Keep support messages but remove Shopify association
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

    const shopId = payload.shop_id
    const shopDomain = payload.shop_domain

    console.log('[Shopify Webhook] shop/redact received:', {
      shop_id: shopId,
      shop_domain: shopDomain,
    })

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
        if (settings.shopifyIntegration?.shopDomain?.includes(shopDomain.replace('.myshopify.com', ''))) {
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

          console.log(`[Shopify Webhook] Cleared Shopify integration for org ${row.organization_id}`)
        }
      } catch (parseError) {
        console.error(`[Shopify Webhook] Error processing org ${row.organization_id}:`, parseError)
      }
    }

    // Acknowledge the request - Shopify expects 200 OK
    return NextResponse.json({
      received: true,
      message: 'Shop data redaction completed'
    })
  } catch (error) {
    console.error('[Shopify Webhook] shop/redact error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
