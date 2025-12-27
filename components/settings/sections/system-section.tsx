"use client"

import { useState, useEffect } from "react"
import { SectionHeader } from "../section-header"
import { SettingCard } from "../setting-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Copy, Check, LogOut, Mail, CreditCard, Settings2, MessageSquare, Loader2, HelpCircle } from "lucide-react"
import { useSettings } from "@/lib/settings-context"

export function SystemSection() {
  const { settings, updateSettings, saveSettings, slackWebhookConfigured, setSlackWebhookConfigured } = useSettings()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [copied, setCopied] = useState(false)
  const [mailbox, setMailbox] = useState<{ forwardToAddress: string } | null>(null)
  const [mailboxError, setMailboxError] = useState<string | null>(null)
  const [billingLoaded, setBillingLoaded] = useState(false)
  const [billingStatus, setBillingStatus] = useState<{
    isActive: boolean
    willCancelAtPeriodEnd: boolean
    currentPeriodEnd: string | null
    canResume?: boolean
  }>({ isActive: false, willCancelAtPeriodEnd: false, currentPeriodEnd: null })

  // Slack integration state
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

  useEffect(() => {
    const loadMailbox = async () => {
      try {
        const resp = await fetch("/api/organization/mailbox")
        if (resp.ok) {
          const data = await resp.json()
          if (data?.forwardToAddress) {
            setMailbox({ forwardToAddress: data.forwardToAddress })
            setMailboxError(null)
          } else {
            setMailbox(null)
            setMailboxError(data?.error || "Mailbox configuration unavailable")
          }
        }
      } catch {
        setMailbox(null)
        setMailboxError("Failed to load mailbox configuration")
      }
    }

    const loadBilling = async () => {
      try {
        const resp = await fetch("/api/billing/status")
        if (resp.ok) {
          const data = await resp.json()
          setBillingStatus({
            isActive: Boolean(data.isActive),
            willCancelAtPeriodEnd: Boolean(data.willCancelAtPeriodEnd),
            currentPeriodEnd: data.currentPeriodEnd ?? null,
            canResume: Boolean(data.canResume),
          })
        }
      } catch {
        // ignore
      } finally {
        setBillingLoaded(true)
      }
    }

    loadMailbox()
    loadBilling()
  }, [])

  const handleCopyMailbox = async () => {
    if (!mailbox) return
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(mailbox.forwardToAddress)
      } else {
        const ta = document.createElement("textarea")
        ta.value = mailbox.forwardToAddress
        ta.style.position = "fixed"
        ta.style.opacity = "0"
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Copy failed:", err)
    }
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await fetch("/api/auth/sign-out", { method: "POST" })
    } catch {
      // ignore
    } finally {
      window.location.href = "https://aidly.me"
    }
  }

  const handleCancelSubscription = async () => {
    const displayDate = billingStatus.currentPeriodEnd
      ? new Date(billingStatus.currentPeriodEnd).toLocaleDateString()
      : "the end of your current billing period"
    const confirmed = window.confirm(
      `Cancel your subscription?\n\nYou will keep access until ${displayDate}. One month after your last payment, access to Aidly will be disabled.`
    )
    if (!confirmed) return

    try {
      const resp = await fetch("/api/billing/cancel", { method: "POST" })
      if (resp.ok) {
        const data = await resp.json()
        setBillingStatus((prev) => ({
          ...prev,
          willCancelAtPeriodEnd: true,
          currentPeriodEnd: data.currentPeriodEnd ?? prev.currentPeriodEnd,
        }))
      } else {
        alert("Could not schedule cancellation. Please try again.")
      }
    } catch {
      alert("Could not schedule cancellation. Please try again.")
    }
  }

  const handleResumeSubscription = async () => {
    try {
      const resp = await fetch("/api/billing/resume", { method: "POST" })
      if (resp.ok) {
        const data = await resp.json()
        setBillingStatus((prev) => ({
          ...prev,
          willCancelAtPeriodEnd: false,
          currentPeriodEnd: data.currentPeriodEnd ?? prev.currentPeriodEnd,
        }))
      } else {
        alert("Could not resume subscription. Please try again.")
      }
    } catch {
      alert("Could not resume subscription. Please try again.")
    }
  }

  const handleSlackToggle = async (enabled: boolean) => {
    const newSlackIntegration = {
      ...settings.slackIntegration,
      enabled,
      webhookUrl: settings.slackIntegration?.webhookUrl,
    }

    // Update local state
    updateSettings({ slackIntegration: newSlackIntegration })

    // Save directly to API (don't rely on state update timing)
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
      // Save directly to API instead of relying on state update timing
      const newSlackIntegration = {
        enabled: settings.slackIntegration?.enabled ?? false,
        webhookUrl: slackWebhookUrl.trim(),
      }

      // Update local state
      updateSettings({ slackIntegration: newSlackIntegration })

      // Save directly with the webhook URL (don't wait for state to update)
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
      setSlackWebhookUrl("") // Clear the input since it's now saved
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
      // If user is entering a new URL, test that; otherwise test the saved one
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
        title="System"
        description="Email configuration, billing, and account management"
      />

      <div className="space-y-6">
        {/* Email Forwarding */}
        <SettingCard>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">Email Forwarding</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Forward your support email to this address to receive messages in SupportAI.
              </p>

              {mailbox ? (
                <div className="mt-4 flex items-center gap-2">
                  <Input
                    readOnly
                    value={mailbox.forwardToAddress}
                    onFocus={(e) => e.currentTarget.select()}
                    className="font-mono text-sm flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyMailbox}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <div className="mt-4 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {mailboxError ?? "Mailbox alias not available. Ensure INBOUND_DOMAIN is configured."}
                </div>
              )}
            </div>
          </div>
        </SettingCard>

        {/* Slack Notifications */}
        <SettingCard>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Slack Notifications</h3>
                <div className="flex items-center gap-2">
                  {isSavingSlack && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <Switch
                    checked={settings.slackIntegration?.enabled ?? false}
                    onCheckedChange={handleSlackToggle}
                    disabled={isSavingSlack}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
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
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600 font-medium">Webhook configured</span>
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
                            "Send Test Notification"
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
                      className={`text-sm ${
                        slackTestResult.success ? "text-green-600" : "text-destructive"
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

        {/* Subscription */}
        {billingLoaded && (
          <SettingCard>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Subscription</h3>

                {billingStatus.isActive ? (
                  <div className="mt-3 space-y-3">
                    {!billingStatus.willCancelAtPeriodEnd ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200">
                            Active
                          </span>
                          {billingStatus.currentPeriodEnd && (
                            <span className="text-sm text-muted-foreground">
                              Renews{" "}
                              {new Date(billingStatus.currentPeriodEnd).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelSubscription}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Cancel Subscription
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          You&apos;ll keep access until the end of your billing period.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                            Canceling
                          </span>
                          {billingStatus.currentPeriodEnd && (
                            <span className="text-sm text-muted-foreground">
                              Ends{" "}
                              {new Date(billingStatus.currentPeriodEnd).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          One month after your last payment, access to Aidly will be disabled.
                        </p>
                        {billingStatus.canResume && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResumeSubscription}
                          >
                            Resume Subscription
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    No active subscription found for this account.
                  </p>
                )}
              </div>
            </div>
          </SettingCard>
        )}

        {/* Sign Out */}
        <SettingCard>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Account</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sign out of your account on this device.
              </p>
              <Button
                variant="outline"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="mt-4"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </div>
        </SettingCard>
      </div>
    </div>
  )
}
