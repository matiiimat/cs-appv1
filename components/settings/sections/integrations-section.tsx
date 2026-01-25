"use client"

import { useState, useEffect } from "react"
import { SectionHeader } from "../section-header"
import { SettingCard } from "../setting-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Check,
  Loader2,
  ExternalLink,
  AlertCircle,
  Unplug,
  HelpCircle
} from "lucide-react"
import { useSettings } from "@/lib/settings-context"
import { useSearchParams } from "next/navigation"
import Image from "next/image"

export function IntegrationsSection() {
  const { settings, updateSettings, shopifyConfigured, setShopifyConfigured, slackWebhookConfigured, setSlackWebhookConfigured } = useSettings()
  const searchParams = useSearchParams()

  // Shopify state
  const [shopDomain, setShopDomain] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Slack state
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("")
  const [isTestingSlack, setIsTestingSlack] = useState(false)
  const [slackTestResult, setSlackTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isSavingSlack, setIsSavingSlack] = useState(false)
  const [showSlackHelp, setShowSlackHelp] = useState(false)

  // Initialize Slack webhook URL from settings
  useEffect(() => {
    if (settings.slackIntegration?.webhookUrl) {
      setSlackWebhookUrl(settings.slackIntegration.webhookUrl)
    }
  }, [settings.slackIntegration?.webhookUrl])

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

  // Slack handlers
  const handleSlackToggle = async (enabled: boolean) => {
    const newSlackIntegration = {
      ...settings.slackIntegration,
      enabled,
      webhookUrl: settings.slackIntegration?.webhookUrl,
    }

    updateSettings({ slackIntegration: newSlackIntegration })

    setIsSavingSlack(true)
    try {
      const currentSettings = {
        ...settings,
        slackIntegration: newSlackIntegration,
        lastSaved: new Date().toISOString(),
      }
      const { theme: _ignored, ...payloadNoTheme } = currentSettings
      void _ignored

      const response = await fetch('/api/organization/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadNoTheme),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }
    } catch (err) {
      console.error('Failed to save Slack toggle:', err)
    } finally {
      setIsSavingSlack(false)
    }
  }

  const handleSaveSlackWebhook = async () => {
    if (!slackWebhookUrl.trim()) return

    setIsSavingSlack(true)
    setSlackTestResult(null)

    try {
      const newSlackIntegration = {
        enabled: settings.slackIntegration?.enabled ?? false,
        webhookUrl: slackWebhookUrl.trim(),
      }

      updateSettings({ slackIntegration: newSlackIntegration })

      const currentSettings = {
        ...settings,
        slackIntegration: newSlackIntegration,
        lastSaved: new Date().toISOString(),
      }
      const { theme: _ignored, ...payloadNoTheme } = currentSettings
      void _ignored

      const response = await fetch('/api/organization/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadNoTheme),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      setSlackWebhookConfigured(true)
      setSlackWebhookUrl("")
      setSlackTestResult({ success: true, message: "Webhook URL saved" })
    } catch {
      setSlackTestResult({ success: false, message: "Failed to save webhook URL" })
    } finally {
      setIsSavingSlack(false)
    }
  }

  const handleTestSlack = async () => {
    setIsTestingSlack(true)
    setSlackTestResult(null)

    try {
      const body = slackWebhookUrl.trim() && slackWebhookUrl !== "change"
        ? { webhookUrl: slackWebhookUrl.trim() }
        : {}

      const resp = await fetch("/api/slack/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await resp.json()

      if (data.success) {
        setSlackTestResult({ success: true, message: "Test notification sent! Check your Slack channel." })
      } else {
        setSlackTestResult({ success: false, message: data.error || "Test failed" })
      }
    } catch {
      setSlackTestResult({ success: false, message: "Failed to send test notification" })
    } finally {
      setIsTestingSlack(false)
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
        <SettingCard bordered>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0">
              <Image
                src="/integrations/shopify_icon.png"
                alt="Shopify"
                width={64}
                height={64}
                className="rounded-lg"
              />
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
                  {/* Connection status - more prominent */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">
                            {settings.shopifyIntegration?.shopDomain || 'Your store'}
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
                            {settings.shopifyIntegration?.enabled
                              ? 'Connected and active'
                              : 'Connected but paused'}
                          </p>
                        </div>
                      </div>
                      {settings.shopifyIntegration?.installedAt && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          Connected {new Date(settings.shopifyIntegration.installedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status explanation */}
                  <p className="text-sm text-muted-foreground">
                    {settings.shopifyIntegration?.enabled ? (
                      <>
                        AI responses will include relevant order history, shipping status, and product details when available.
                      </>
                    ) : (
                      <>
                        <span className="text-amber-600 font-medium">Paused:</span> Toggle on above to allow AI to access Shopify data.
                      </>
                    )}
                  </p>

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
                        Disconnect
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SettingCard>

        {/* Slack Integration */}
        <SettingCard bordered>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0">
              <Image
                src="/integrations/slack_icon.png"
                alt="Slack"
                width={64}
                height={64}
                className="rounded-lg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Slack</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary ml-2">
                    Notifications
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isSavingSlack && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <Switch
                    checked={settings.slackIntegration?.enabled ?? false}
                    onCheckedChange={handleSlackToggle}
                    disabled={isSavingSlack}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-2">
                Get notified in Slack when new support emails arrive.
              </p>

              {/* How to create webhook - collapsible help */}
              <button
                onClick={() => setShowSlackHelp(!showSlackHelp)}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
              >
                <HelpCircle className="h-4 w-4" />
                How to create a Slack webhook
              </button>

              {showSlackHelp && (
                <div className="mt-3 p-4 bg-muted/50 rounded-lg text-sm space-y-2">
                  <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                    <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">api.slack.com/apps</a> and click <strong className="text-foreground">Create New App</strong></li>
                    <li>Choose <strong className="text-foreground">From scratch</strong></li>
                    <li>Name your app (e.g., &quot;Aidly Notifications&quot;) and select your workspace</li>
                    <li>In the left sidebar, click <strong className="text-foreground">Incoming Webhooks</strong></li>
                    <li>Toggle <strong className="text-foreground">Activate Incoming Webhooks</strong> to ON</li>
                    <li>Click <strong className="text-foreground">Add New Webhook to Workspace</strong></li>
                    <li>Select a channel (e.g., #support) and click <strong className="text-foreground">Allow</strong></li>
                    <li>Copy the Webhook URL and paste it below</li>
                  </ol>
                </div>
              )}

              {settings.slackIntegration?.enabled && (
                <div className="mt-4 space-y-4">
                  {slackWebhookConfigured && !slackWebhookUrl ? (
                    // Webhook is configured - show status and option to change
                    <div className="space-y-4">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            Webhook configured
                          </span>
                        </div>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1 ml-6">
                          New support emails will trigger Slack notifications
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTestSlack}
                          disabled={isTestingSlack}
                        >
                          {isTestingSlack ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Testing...
                            </>
                          ) : (
                            "Send Test"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSlackWebhookUrl("change")}
                        >
                          Change webhook
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Show input to add or change webhook
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        {slackWebhookConfigured ? "New Webhook URL" : "Webhook URL"}
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="url"
                          placeholder="https://hooks.slack.com/services/..."
                          value={slackWebhookUrl === "change" ? "" : slackWebhookUrl}
                          onChange={(e) => setSlackWebhookUrl(e.target.value)}
                          className="font-mono text-sm flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveSlackWebhook}
                          disabled={isSavingSlack || !slackWebhookUrl.trim() || slackWebhookUrl === "change"}
                          className="shrink-0"
                        >
                          {isSavingSlack ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                        {slackWebhookConfigured && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSlackWebhookUrl("")}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {slackTestResult && (
                    <div
                      className={`text-sm p-2 rounded ${
                        slackTestResult.success
                          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {slackTestResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </SettingCard>

      </div>
    </div>
  )
}
