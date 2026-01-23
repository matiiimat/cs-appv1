import { db } from '@/lib/database';
import { DatabaseEncryption } from '@/lib/encryption';
import crypto from 'crypto';

// Shopify OAuth scopes needed for order data
const SHOPIFY_SCOPES = [
  'read_orders',
  'read_customers',
  'read_fulfillments',
  'read_products',
].join(',');

// Types for Shopify data
export interface ShopifyOrder {
  id: string;
  name: string; // Order number like #1001
  createdAt: string;
  fulfillmentStatus: string | null;
  financialStatus: string;
  totalPrice: string;
  currency: string;
  lineItems: Array<{
    title: string;
    quantity: number;
    unitPrice?: string;
    variant?: {
      title: string;
    };
  }>;
  shippingAddress?: {
    city: string;
    country: string;
  };
  trackingInfo?: Array<{
    company: string;
    number: string;
    url: string | null;
  }>;
}

export interface ShopifyCustomerContext {
  totalOrders: number;
  totalSpent: string;
  currency: string;
  recentOrders: ShopifyOrder[];
  customerSince?: string;
}

// OAuth helper functions
export function generateShopifyAuthUrl(shop: string, state: string): string {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/integrations/shopify/callback`;

  if (!clientId) {
    throw new Error('SHOPIFY_CLIENT_ID is not configured');
  }

  // Normalize shop domain
  const shopDomain = normalizeShopDomain(shop);

  const params = new URLSearchParams({
    client_id: clientId,
    scope: SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
    state: state,
  });

  return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ accessToken: string; scope: string }> {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Shopify credentials not configured');
  }

  const shopDomain = normalizeShopDomain(shop);

  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Shopify token exchange failed:', errorText);
    throw new Error('Failed to exchange code for access token');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    scope: data.scope,
  };
}

// Normalize shop domain to format: example.myshopify.com
export function normalizeShopDomain(shop: string): string {
  // Remove protocol if present
  let domain = shop.replace(/^https?:\/\//, '');

  // Remove trailing slashes
  domain = domain.replace(/\/+$/, '');

  // If it's just the shop name without .myshopify.com, add it
  if (!domain.includes('.myshopify.com')) {
    // Handle custom domains - for OAuth we need the myshopify.com domain
    // For now, assume it's the shop handle
    if (!domain.includes('.')) {
      domain = `${domain}.myshopify.com`;
    }
  }

  return domain;
}

// Validate Shopify webhook HMAC (for future webhook support)
export function validateShopifyHmac(
  rawBody: string,
  hmacHeader: string
): boolean {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!secret) {
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  );
}

// Shopify Admin GraphQL client
export class ShopifyClient {
  private shopDomain: string;
  private accessToken: string;

  constructor(shopDomain: string, accessToken: string) {
    this.shopDomain = normalizeShopDomain(shopDomain);
    this.accessToken = accessToken;
  }

  // Create client from organization settings
  static async fromOrganizationId(organizationId: string): Promise<ShopifyClient | null> {
    try {
      // Get organization's encryption key and settings
      const result = await db.query<{
        encrypted_data_key: string;
        settings_data: string | null;
      }>(`
        SELECT o.encrypted_data_key, os.settings_data
        FROM organizations o
        LEFT JOIN organization_settings os ON os.organization_id = o.id
        WHERE o.id = $1
      `, [organizationId]);

      if (result.rows.length === 0 || !result.rows[0].settings_data) {
        return null;
      }

      const { encrypted_data_key, settings_data } = result.rows[0];

      // Decrypt settings
      const decryptedSettings = DatabaseEncryption.decryptFromStorage(
        settings_data,
        encrypted_data_key
      );
      const settings = JSON.parse(decryptedSettings);

      // Check if Shopify is configured and enabled
      const shopifyConfig = settings.shopifyIntegration;
      if (!shopifyConfig?.enabled || !shopifyConfig?.shopDomain || !shopifyConfig?.accessToken) {
        return null;
      }

      return new ShopifyClient(shopifyConfig.shopDomain, shopifyConfig.accessToken);
    } catch (error) {
      console.error('Failed to create Shopify client from organization:', error);
      return null;
    }
  }

  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(
      `https://${this.shopDomain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify GraphQL error:', errorText);
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.error('Shopify GraphQL errors:', result.errors);
      throw new Error(result.errors[0]?.message || 'GraphQL query failed');
    }

    return result.data;
  }

  // Fetch orders by customer email - returns context for AI
  async getCustomerContext(email: string): Promise<ShopifyCustomerContext | null> {
    const query = `
      query getCustomerOrders($searchQuery: String!) {
        customers(first: 1, query: $searchQuery) {
          edges {
            node {
              id
              email
              createdAt
              numberOfOrders
              totalSpentV2 {
                amount
                currencyCode
              }
              orders(first: 5, sortKey: CREATED_AT, reverse: true) {
                edges {
                  node {
                    id
                    name
                    createdAt
                    displayFulfillmentStatus
                    displayFinancialStatus
                    totalPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    lineItems(first: 10) {
                      edges {
                        node {
                          title
                          quantity
                          originalUnitPriceSet {
                            shopMoney {
                              amount
                              currencyCode
                            }
                          }
                          variant {
                            title
                            price
                          }
                        }
                      }
                    }
                    shippingAddress {
                      city
                      country
                    }
                    fulfillments {
                      trackingInfo {
                        company
                        number
                        url
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      // Search by email - Shopify requires `email:` prefix for exact match
      // Note: Email must be lowercase for Shopify search
      const normalizedEmail = email.toLowerCase().trim();
      const searchQuery = `email:${normalizedEmail}`;
      console.log(`[Shopify] Searching for customer with query: ${searchQuery}`);
      console.log(`[Shopify] Store domain: ${this.shopDomain}`);
      const data = await this.graphql<{
        customers: {
          edges: Array<{
            node: {
              id: string;
              email: string;
              createdAt: string;
              numberOfOrders: number;
              totalSpentV2: {
                amount: string;
                currencyCode: string;
              };
              orders: {
                edges: Array<{
                  node: {
                    id: string;
                    name: string;
                    createdAt: string;
                    displayFulfillmentStatus: string | null;
                    displayFinancialStatus: string;
                    totalPriceSet: {
                      shopMoney: {
                        amount: string;
                        currencyCode: string;
                      };
                    };
                    lineItems: {
                      edges: Array<{
                        node: {
                          title: string;
                          quantity: number;
                          originalUnitPriceSet?: {
                            shopMoney: {
                              amount: string;
                              currencyCode: string;
                            };
                          };
                          variant?: {
                            title: string;
                            price: string;
                          };
                        };
                      }>;
                    };
                    shippingAddress?: {
                      city: string;
                      country: string;
                    };
                    fulfillments: Array<{
                      trackingInfo: Array<{
                        company: string;
                        number: string;
                        url: string | null;
                      }>;
                    }>;
                  };
                }>;
              };
            };
          }>;
        };
      }>(query, { searchQuery });

      console.log(`[Shopify] Query returned ${data.customers.edges.length} customers`);

      const customer = data.customers.edges[0]?.node;

      if (!customer) {
        console.log(`[Shopify] No customer found for email: ${normalizedEmail}`);
        console.log(`[Shopify] Raw response edges:`, JSON.stringify(data.customers.edges));
        return null;
      }

      console.log(`[Shopify] Found customer: ${customer.email} with ${customer.numberOfOrders} orders`);

      // Transform orders to our format (anonymizing PII)
      const recentOrders: ShopifyOrder[] = customer.orders.edges.map(({ node }) => ({
        id: node.id,
        name: node.name,
        createdAt: node.createdAt,
        fulfillmentStatus: node.displayFulfillmentStatus,
        financialStatus: node.displayFinancialStatus,
        totalPrice: node.totalPriceSet.shopMoney.amount,
        currency: node.totalPriceSet.shopMoney.currencyCode,
        lineItems: node.lineItems.edges.map(({ node: item }) => ({
          title: item.title,
          quantity: item.quantity,
          unitPrice: item.originalUnitPriceSet?.shopMoney?.amount || item.variant?.price || '0',
          variant: item.variant ? { title: item.variant.title } : undefined,
        })),
        // Only include city/country, not full address
        shippingAddress: node.shippingAddress ? {
          city: node.shippingAddress.city,
          country: node.shippingAddress.country,
        } : undefined,
        trackingInfo: node.fulfillments.flatMap(f => f.trackingInfo),
      }));

      return {
        totalOrders: customer.numberOfOrders,
        totalSpent: customer.totalSpentV2.amount,
        currency: customer.totalSpentV2.currencyCode,
        recentOrders,
        customerSince: customer.createdAt,
      };
    } catch (error) {
      console.error('Failed to fetch customer context from Shopify:', error);
      return null;
    }
  }

  // Search for an order by order number (e.g., #1002 or 1002)
  async getOrderByNumber(orderNumber: string): Promise<ShopifyOrder | null> {
    // Clean up order number - remove # if present
    const cleanNumber = orderNumber.replace(/^#/, '').trim();

    const query = `
      query getOrderByName($query: String!) {
        orders(first: 1, query: $query) {
          edges {
            node {
              id
              name
              createdAt
              displayFulfillmentStatus
              displayFinancialStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              customer {
                email
                firstName
                lastName
              }
              lineItems(first: 10) {
                edges {
                  node {
                    title
                    quantity
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    variant {
                      title
                      price
                    }
                  }
                }
              }
              shippingAddress {
                city
                country
              }
              fulfillments {
                trackingInfo {
                  company
                  number
                  url
                }
              }
            }
          }
        }
      }
    `;

    try {
      console.log(`[Shopify] Searching for order: ${cleanNumber}`);
      const data = await this.graphql<{
        orders: {
          edges: Array<{
            node: {
              id: string;
              name: string;
              createdAt: string;
              displayFulfillmentStatus: string | null;
              displayFinancialStatus: string;
              totalPriceSet: {
                shopMoney: {
                  amount: string;
                  currencyCode: string;
                };
              };
              customer?: {
                email: string;
                firstName: string;
                lastName: string;
              };
              lineItems: {
                edges: Array<{
                  node: {
                    title: string;
                    quantity: number;
                    originalUnitPriceSet?: {
                      shopMoney: {
                        amount: string;
                        currencyCode: string;
                      };
                    };
                    variant?: {
                      title: string;
                      price: string;
                    };
                  };
                }>;
              };
              shippingAddress?: {
                city: string;
                country: string;
              };
              fulfillments: Array<{
                trackingInfo: Array<{
                  company: string;
                  number: string;
                  url: string | null;
                }>;
              }>;
            };
          }>;
        };
      }>(query, { query: `name:#${cleanNumber}` });

      const order = data.orders.edges[0]?.node;

      if (!order) {
        console.log(`[Shopify] No order found with number: ${cleanNumber}`);
        return null;
      }

      console.log(`[Shopify] Found order: ${order.name}`);

      return {
        id: order.id,
        name: order.name,
        createdAt: order.createdAt,
        fulfillmentStatus: order.displayFulfillmentStatus,
        financialStatus: order.displayFinancialStatus,
        totalPrice: order.totalPriceSet.shopMoney.amount,
        currency: order.totalPriceSet.shopMoney.currencyCode,
        lineItems: order.lineItems.edges.map(({ node: item }) => ({
          title: item.title,
          quantity: item.quantity,
          unitPrice: item.originalUnitPriceSet?.shopMoney?.amount || item.variant?.price || '0',
          variant: item.variant ? { title: item.variant.title } : undefined,
        })),
        shippingAddress: order.shippingAddress ? {
          city: order.shippingAddress.city,
          country: order.shippingAddress.country,
        } : undefined,
        trackingInfo: order.fulfillments.flatMap(f => f.trackingInfo),
      };
    } catch (error) {
      console.error('Failed to fetch order from Shopify:', error);
      return null;
    }
  }

  // Verify the connection is working
  async verifyConnection(): Promise<{ shopName: string; valid: boolean }> {
    const query = `
      query {
        shop {
          name
        }
      }
    `;

    try {
      const data = await this.graphql<{ shop: { name: string } }>(query);
      return {
        shopName: data.shop.name,
        valid: true,
      };
    } catch {
      return {
        shopName: '',
        valid: false,
      };
    }
  }
}

// Format Shopify context for AI prompt injection
export function formatShopifyContextForAI(context: ShopifyCustomerContext): string {
  const lines: string[] = [
    '## Customer Order History (from Shopify)',
    '',
    `- Customer since: ${new Date(context.customerSince || '').toLocaleDateString()}`,
    `- Total orders: ${context.totalOrders}`,
    `- Total spent: ${context.currency} ${context.totalSpent}`,
    '',
  ];

  if (context.recentOrders.length > 0) {
    lines.push('### Recent Orders:');
    lines.push('');

    for (const order of context.recentOrders) {
      lines.push(`**Order ${order.name}** (${new Date(order.createdAt).toLocaleDateString()})`);
      lines.push(`- Status: ${order.financialStatus}${order.fulfillmentStatus ? ` / ${order.fulfillmentStatus}` : ''}`);
      lines.push(`- Total: ${order.currency} ${order.totalPrice}`);

      if (order.lineItems.length > 0) {
        lines.push('- Items:');
        for (const item of order.lineItems) {
          const variant = item.variant?.title && item.variant.title !== 'Default Title'
            ? ` (${item.variant.title})`
            : '';
          const price = item.unitPrice ? ` - ${order.currency} ${item.unitPrice} each` : '';
          lines.push(`  - ${item.quantity}x ${item.title}${variant}${price}`);
        }
      }

      if (order.trackingInfo && order.trackingInfo.length > 0) {
        const tracking = order.trackingInfo[0];
        lines.push(`- Tracking: ${tracking.company} - ${tracking.number}`);
      }

      if (order.shippingAddress) {
        lines.push(`- Ships to: ${order.shippingAddress.city}, ${order.shippingAddress.country}`);
      }

      lines.push('');
    }
  }

  return lines.join('\n');
}
