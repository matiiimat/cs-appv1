"use client"

import { useState, useEffect } from "react"
import { useSettings } from "@/lib/settings-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ShoppingBag,
  Package,
  Truck,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react"

interface ShopifyOrder {
  id: string
  name: string
  createdAt: string
  fulfillmentStatus: string | null
  financialStatus: string
  totalPrice: string
  currency: string
  lineItems: Array<{
    title: string
    quantity: number
    variant?: {
      title: string
    }
  }>
  shippingAddress?: {
    city: string
    country: string
  }
  trackingInfo?: Array<{
    company: string
    number: string
    url: string | null
  }>
}

interface ShopifyCustomerData {
  enabled: boolean
  found?: boolean
  message?: string
  totalOrders?: number
  totalSpent?: string
  currency?: string
  recentOrders?: ShopifyOrder[]
  customerSince?: string
}

interface ShopifyPanelProps {
  customerEmail: string
  onClose?: () => void
}

export function ShopifyPanel({ customerEmail, onClose }: ShopifyPanelProps) {
  const { shopifyConfigured, settings } = useSettings()
  const [data, setData] = useState<ShopifyCustomerData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  // Don't show if Shopify not configured or not enabled
  const isEnabled = shopifyConfigured && settings.shopifyIntegration?.enabled

  useEffect(() => {
    if (!isEnabled || !customerEmail) {
      return
    }

    const fetchCustomerData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/integrations/shopify/customer?email=${encodeURIComponent(customerEmail)}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Shopify panel error:', err)
        setError('Failed to load Shopify data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCustomerData()
  }, [customerEmail, isEnabled])

  // Don't render if Shopify not configured
  if (!isEnabled) {
    return null
  }

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  const getFulfillmentIcon = (status: string | null) => {
    if (!status) return <Clock className="h-3 w-3 text-amber-500" />
    const lower = status.toLowerCase()
    if (lower.includes('fulfilled') || lower.includes('delivered')) {
      return <CheckCircle className="h-3 w-3 text-green-500" />
    }
    if (lower.includes('shipped') || lower.includes('transit')) {
      return <Truck className="h-3 w-3 text-blue-500" />
    }
    return <Package className="h-3 w-3 text-amber-500" />
  }

  const getFulfillmentLabel = (status: string | null) => {
    if (!status) return 'Unfulfilled'
    return status.replace(/_/g, ' ')
  }

  return (
    <div className="w-64 flex-shrink-0 surface rounded-lg flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-[#96BF48]" />
          <span className="text-sm font-semibold">Shopify</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive p-2 bg-destructive/10 rounded">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {data && !isLoading && (
            <>
              {!data.found ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Customer not found in Shopify
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Customer Summary */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-muted/50 rounded text-center">
                      <div className="text-lg font-semibold">{data.totalOrders || 0}</div>
                      <div className="text-xs text-muted-foreground">Orders</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded text-center">
                      <div className="text-lg font-semibold">
                        {data.currency} {parseFloat(data.totalSpent || '0').toFixed(0)}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Spent</div>
                    </div>
                  </div>

                  {data.customerSince && (
                    <div className="text-xs text-muted-foreground text-center">
                      Customer since {new Date(data.customerSince).toLocaleDateString()}
                    </div>
                  )}

                  {/* Orders */}
                  {data.recentOrders && data.recentOrders.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Recent Orders
                      </h4>

                      {data.recentOrders.map((order) => {
                        const isExpanded = expandedOrders.has(order.id)
                        return (
                          <div
                            key={order.id}
                            className="border border-border rounded-lg overflow-hidden"
                          >
                            {/* Order Header */}
                            <button
                              onClick={() => toggleOrderExpanded(order.id)}
                              className="w-full p-2 text-left hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{order.name}</span>
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {getFulfillmentIcon(order.fulfillmentStatus)}
                                <span className="text-xs text-muted-foreground">
                                  {getFulfillmentLabel(order.fulfillmentStatus)}
                                </span>
                              </div>
                            </button>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="px-2 pb-2 border-t border-border pt-2 space-y-2">
                                {/* Date & Total */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                  </span>
                                  <span className="font-medium">
                                    {order.currency} {parseFloat(order.totalPrice).toFixed(2)}
                                  </span>
                                </div>

                                {/* Items */}
                                <div className="space-y-1">
                                  {order.lineItems.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                                      <span className="shrink-0">{item.quantity}x</span>
                                      <span className="truncate">
                                        {item.title}
                                        {item.variant?.title && item.variant.title !== 'Default Title' && (
                                          <span className="text-muted-foreground/70"> ({item.variant.title})</span>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                  {order.lineItems.length > 3 && (
                                    <div className="text-xs text-muted-foreground">
                                      +{order.lineItems.length - 3} more items
                                    </div>
                                  )}
                                </div>

                                {/* Shipping */}
                                {order.shippingAddress && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Truck className="h-3 w-3" />
                                    {order.shippingAddress.city}, {order.shippingAddress.country}
                                  </div>
                                )}

                                {/* Tracking */}
                                {order.trackingInfo && order.trackingInfo.length > 0 && (
                                  <div className="space-y-1">
                                    {order.trackingInfo.map((tracking, idx) => (
                                      <div key={idx} className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                          {tracking.company}: {tracking.number}
                                        </span>
                                        {tracking.url && (
                                          <a
                                            href={tracking.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                          >
                                            Track
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Financial Status */}
                                <div className="flex items-center gap-1 text-xs">
                                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                                  <span className={`capitalize ${
                                    order.financialStatus.toLowerCase() === 'paid'
                                      ? 'text-green-600'
                                      : 'text-amber-600'
                                  }`}>
                                    {order.financialStatus.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
