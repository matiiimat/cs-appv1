"use client"

import { useState, useEffect } from "react"
import { SectionHeader } from "../section-header"
import { SettingCard } from "../setting-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  ShoppingBag,
  Check,
  Loader2,
  ExternalLink,
  AlertCircle,
  Unplug
} from "lucide-react"
import { useSettings } from "@/lib/settings-context"
import { useSearchParams } from "next/navigation"

export function IntegrationsSection() {
  const { settings, updateSettings, shopifyConfigured, setShopifyConfigured } = useSettings()
  const searchParams = useSearchParams()

  // Shopify state
  const [shopDomain, setShopDomain] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Check for success/error from OAuth callback
  useEffect(() => {
    const shopifyStatus = searchParams.get('shopify')
    const errorParam = searchParams.get('error')

    if (shopifyStatus === 'connected') {
      setSuccessMessage('Shopify store connected successfully!')
      setShopifyConfigured(true)
      // Clear the URL params
      window.history.replaceState({}, '', '/settings?tab=integrations')
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        missing_params: 'OAuth failed: Missing parameters',
        invalid_state: 'OAuth failed: Security validation failed. Please try again.',
        state_expired: 'OAuth session expired. Please try again.',
        org_mismatch: 'Organization mismatch. Please try again.',
        verification_failed: 'Could not verify Shopify connection. Please try again.',
        callback_failed: 'Connection failed. Please try again.',
      }
      setError(errorMessages[errorParam] || 'Connection failed. Please try again.')
      window.history.replaceState({}, '', '/settings?tab=integrations')
    }
  }, [searchParams, setShopifyConfigured])

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleConnectShopify = () => {
    if (!shopDomain.trim()) {
      setError('Please enter your Shopify store URL')
      return
    }

    setIsConnecting(true)
    setError(null)

    // Redirect to OAuth flow
    window.location.href = `/api/integrations/shopify/auth?shop=${encodeURIComponent(shopDomain.trim())}`
  }

  const handleDisconnectShopify = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to disconnect your Shopify store? The AI will no longer have access to order data.'
    )
    if (!confirmed) return

    setIsDisconnecting(true)
    setError(null)

    try {
      const response = await fetch('/api/integrations/shopify/disconnect', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      // Update local state
      setShopifyConfigured(false)
      updateSettings({
        shopifyIntegration: {
          enabled: false,
        },
      })
      setSuccessMessage('Shopify store disconnected')
    } catch (err) {
      console.error('Disconnect error:', err)
      setError('Failed to disconnect Shopify. Please try again.')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleToggleShopify = async (enabled: boolean) => {
    setIsToggling(true)
    setError(null)

    try {
      const response = await fetch('/api/integrations/shopify/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to toggle')
      }

      // Update local state
      updateSettings({
        shopifyIntegration: {
          ...settings.shopifyIntegration,
          enabled,
        },
      })
    } catch (err) {
      console.error('Toggle error:', err)
      setError(err instanceof Error ? err.message : 'Failed to toggle Shopify integration')
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div className="animate-in fade-in duration-200">
      <SectionHeader
        title="Integrations"
        description="Connect external services to enhance AI responses"
      />

      <div className="space-y-6">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
            <Check className="h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Shopify Integration */}
        <SettingCard>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#96BF48]/10 flex items-center justify-center shrink-0">
              <ShoppingBag className="h-5 w-5 text-[#96BF48]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Shopify</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary ml-2">
                    E-commerce
                  </span>
                </div>
                {shopifyConfigured && (
                  <div className="flex items-center gap-2">
                    {isToggling && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Switch
                      checked={settings.shopifyIntegration?.enabled ?? false}
                      onCheckedChange={handleToggleShopify}
                      disabled={isToggling || isDisconnecting}
                    />
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground mt-2">
                Connect your Shopify store to let AI access order history, shipping status, and customer data for more accurate support responses.
              </p>

              {!shopifyConfigured ? (
                // Not connected - show connection form
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Shopify Store URL
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="your-store.myshopify.com"
                        value={shopDomain}
                        onChange={(e) => setShopDomain(e.target.value)}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleConnectShopify()
                          }
                        }}
                      />
                      <Button
                        onClick={handleConnectShopify}
                        disabled={isConnecting || !shopDomain.trim()}
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Connect
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      You&apos;ll be redirected to Shopify to authorize the connection
                    </p>
                  </div>

                  {/* What this integration does */}
                  <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
                    <p className="font-medium text-foreground">What this integration provides:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>AI sees customer&apos;s order history when responding</li>
                      <li>Accurate shipping and fulfillment status</li>
                      <li>Personalized responses based on purchase history</li>
                      <li>Product names and order numbers in context</li>
                    </ul>
                  </div>

                  {/* Privacy notice */}
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm space-y-2">
                    <p className="font-medium text-amber-800 dark:text-amber-200">Privacy Notice</p>
                    <p className="text-amber-700 dark:text-amber-300 text-xs">
                      When enabled, order data (product names, prices, tracking numbers, city/country)
                      is sent to your configured AI provider to generate accurate responses.
                      Customer names and email addresses are anonymized before processing.
                      No Shopify data is stored permanently - it&apos;s fetched on-demand for each support request.
                    </p>
                  </div>
                </div>
              ) : (
                // Connected - show status and controls
                <div className="mt-4 space-y-4">
                  {/* Connection status */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-foreground">
                        Connected to {settings.shopifyIntegration?.shopDomain || 'your store'}
                      </span>
                    </div>
                    {settings.shopifyIntegration?.installedAt && (
                      <span className="text-xs text-muted-foreground">
                        Since {new Date(settings.shopifyIntegration.installedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Enable/disable explanation */}
                  <p className="text-sm text-muted-foreground">
                    {settings.shopifyIntegration?.enabled ? (
                      <>
                        <span className="text-green-600 font-medium">Active:</span> AI will include Shopify order data in responses.
                      </>
                    ) : (
                      <>
                        <span className="text-amber-600 font-medium">Paused:</span> AI will not fetch Shopify data. Toggle on to enable.
                      </>
                    )}
                  </p>

                  {/* Active privacy reminder */}
                  {settings.shopifyIntegration?.enabled && (
                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      Order data is processed by your AI provider to generate responses.
                      No customer PII (names, emails, addresses) is shared.
                    </p>
                  )}

                  {/* Disconnect button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectShopify}
                    disabled={isDisconnecting}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {isDisconnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <Unplug className="h-4 w-4 mr-2" />
                        Disconnect Shopify
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SettingCard>

      </div>
    </div>
  )
}
