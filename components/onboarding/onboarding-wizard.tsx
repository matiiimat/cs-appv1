"use client"

import { useState, useEffect } from "react"
import { useSettings } from "@/lib/settings-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AIService } from "@/lib/ai-providers"
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Zap,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  PartyPopper,
  Mail,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react"

type Provider = "openai" | "anthropic" | "local"

const providerInfo: Record<Provider, { name: string; description: string; icon: string }> = {
  openai: {
    name: "OpenAI",
    description: "GPT-4o, GPT-4o-mini",
    icon: "◯",
  },
  anthropic: {
    name: "Anthropic",
    description: "Claude 3.5 Sonnet, Haiku",
    icon: "◈",
  },
  local: {
    name: "Local AI",
    description: "Self-hosted models",
    icon: "⬡",
  },
}

interface OnboardingWizardProps {
  onComplete: () => void
}

const emailForwardingGuides = [
  { name: "Cloudflare", url: "https://developers.cloudflare.com/email-routing/setup/email-routing-addresses/" },
  { name: "Google Workspace", url: "https://support.google.com/a/answer/4524505" },
  { name: "Microsoft 365", url: "https://learn.microsoft.com/en-us/exchange/recipients/user-mailboxes/email-forwarding" },
]

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { settings, updateSettings, saveSettings } = useSettings()
  const [step, setStep] = useState(1)
  const [showApiKey, setShowApiKey] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean
    error?: string
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [mailbox, setMailbox] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const totalSteps = 3

  // Load mailbox address
  useEffect(() => {
    const loadMailbox = async () => {
      try {
        const resp = await fetch("/api/organization/mailbox")
        if (resp.ok) {
          const data = await resp.json()
          if (data?.forwardToAddress) {
            setMailbox(data.forwardToAddress)
          }
        }
      } catch {
        // ignore
      }
    }
    loadMailbox()
  }, [])

  const handleCopyMailbox = async () => {
    if (!mailbox) return
    try {
      await navigator.clipboard.writeText(mailbox)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement("textarea")
      ta.value = mailbox
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Validation for step 1
  const isStep1Valid = settings.brandName.trim().length > 0 && settings.agentName.trim().length > 0

  // Validation for step 2
  const isStep2Valid = (() => {
    if (settings.aiConfig.provider === "local") {
      return (settings.aiConfig.localEndpoint || settings.aiConfig.apiKey || "").trim().length > 0
    }
    return settings.aiConfig.apiKey.trim().length > 0 || connectionResult?.success
  })()

  const handleProviderChange = (provider: Provider) => {
    const defaultModel =
      provider === "openai"
        ? "gpt-4o-mini"
        : provider === "anthropic"
        ? "claude-3-5-haiku-20241022"
        : settings.aiConfig.model

    updateSettings({
      aiConfig: {
        ...settings.aiConfig,
        provider,
        model: defaultModel || "",
      },
    })
    setConnectionResult(null)
  }

  const handleTestConnection = async () => {
    if (settings.aiConfig.provider === "local") {
      const localEndpoint = settings.aiConfig.localEndpoint || settings.aiConfig.apiKey || ""
      if (!localEndpoint) {
        setConnectionResult({ success: false, error: "Local AI server URL is required" })
        return
      }
    } else if (!settings.aiConfig.apiKey) {
      setConnectionResult({ success: false, error: "API key is required" })
      return
    }

    setTestingConnection(true)
    setConnectionResult(null)

    try {
      if (settings.aiConfig.provider === "openai" || settings.aiConfig.provider === "anthropic") {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 10000)
        try {
          const resp = await fetch("/api/ai/test-connection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: settings.aiConfig.provider,
              apiKey: settings.aiConfig.apiKey,
              model: settings.aiConfig.model,
            }),
            signal: controller.signal,
          })
          clearTimeout(timer)
          const data = await resp.json().catch(() => ({ success: false, error: "Invalid server response" }))
          setConnectionResult(data)
        } catch (e) {
          const msg =
            e instanceof Error
              ? e.name === "AbortError"
                ? "Connection test timed out"
                : e.message
              : "Connection failed"
          setConnectionResult({ success: false, error: msg })
        }
      } else {
        const aiService = new AIService(settings.aiConfig)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Connection test timed out")), 10000)
        })
        const result = await Promise.race([aiService.testConnection(), timeoutPromise])
        setConnectionResult(result)
      }
    } catch (error) {
      setConnectionResult({
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleComplete = async () => {
    setIsSaving(true)
    try {
      await saveSettings()
      onComplete()
    } catch (error) {
      console.error("Failed to save settings:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold font-[family-name:var(--font-custom)]">
                {step === 3 ? "You're all set!" : "Welcome to Aidly"}
              </h1>
            </div>
            <span className="text-sm text-muted-foreground">
              Step {step}/{totalSteps}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {step === 1 && "Let's personalize your support experience."}
            {step === 2 && "Connect your AI provider to power smart responses."}
            {step === 3 && "Your workspace is ready. Let's start helping customers!"}
          </p>

          {/* Progress bar */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {/* Step 1: Brand Identity */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Brand Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={settings.brandName}
                  onChange={(e) => updateSettings({ brandName: e.target.value.slice(0, 80) })}
                  placeholder="e.g., Acme Corp"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Appears in emails as &quot;{settings.brandName || "Your Brand"} Support&quot;
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Agent Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={settings.agentName}
                  onChange={(e) => updateSettings({ agentName: e.target.value.slice(0, 32) })}
                  placeholder="e.g., Sarah"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Signature</label>
                <Textarea
                  value={settings.agentSignature}
                  onChange={(e) => updateSettings({ agentSignature: e.target.value.slice(0, 100) })}
                  placeholder="Best regards,&#10;The Support Team"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 2: AI Configuration */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Provider Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">AI Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(providerInfo) as Provider[]).map((provider) => {
                    const info = providerInfo[provider]
                    const isSelected = settings.aiConfig.provider === provider
                    return (
                      <button
                        key={provider}
                        onClick={() => handleProviderChange(provider)}
                        className={`
                          relative p-3 rounded-xl border-2 text-center transition-all duration-200
                          hover:border-primary/50
                          ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card hover:bg-muted/50"
                          }
                        `}
                      >
                        {isSelected && (
                          <CheckCircle className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-primary" />
                        )}
                        <div className="text-xl mb-1">{info.icon}</div>
                        <div className="text-xs font-medium">{info.name}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Model & API Key */}
              {settings.aiConfig.provider === "local" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Server URL</label>
                    <Input
                      value={settings.aiConfig.localEndpoint || settings.aiConfig.apiKey || ""}
                      onChange={(e) => {
                        updateSettings({
                          aiConfig: {
                            ...settings.aiConfig,
                            localEndpoint: e.target.value,
                            apiKey: e.target.value,
                          },
                        })
                        setConnectionResult(null)
                      }}
                      placeholder="http://192.168.1.24:1234"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Model</label>
                    <Input
                      value={settings.aiConfig.model}
                      onChange={(e) => {
                        updateSettings({
                          aiConfig: { ...settings.aiConfig, model: e.target.value },
                        })
                        setConnectionResult(null)
                      }}
                      placeholder="mistralai/devstral-small-2505"
                      className="font-mono text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Model</label>
                    <Input
                      value={settings.aiConfig.model}
                      onChange={(e) => {
                        updateSettings({
                          aiConfig: { ...settings.aiConfig, model: e.target.value },
                        })
                        setConnectionResult(null)
                      }}
                      placeholder={
                        settings.aiConfig.provider === "openai"
                          ? "gpt-4o-mini"
                          : "claude-3-5-haiku-20241022"
                      }
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API Key</label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={settings.aiConfig.apiKey}
                        onChange={(e) => {
                          updateSettings({
                            aiConfig: { ...settings.aiConfig, apiKey: e.target.value },
                          })
                          setConnectionResult(null)
                        }}
                        placeholder="Enter your API key"
                        className="pr-10 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Test Connection */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !isStep2Valid}
                >
                  {testingConnection ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                {connectionResult && (
                  <div className="flex items-center gap-2">
                    {connectionResult.success ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Connected!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-600 truncate max-w-[200px]">
                          {connectionResult.error}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                  <PartyPopper className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold mb-1">Setup Complete!</h2>
                <p className="text-sm text-muted-foreground">
                  Your workspace is ready. One last step to start receiving emails.
                </p>
              </div>

              {/* Email Forwarding Section */}
              {mailbox && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm mb-1">Set up email forwarding</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        Forward emails from your support address to receive them in Aidly:
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <code className="flex-1 text-xs bg-background px-3 py-2 rounded border font-mono truncate">
                          {mailbox}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyMailbox}
                          className="shrink-0 h-8 px-2"
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {emailForwardingGuides.map((guide) => (
                          <a
                            key={guide.name}
                            href={guide.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {guide.name}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  <span>Brand: <strong>{settings.brandName}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  <span>Agent: <strong>{settings.agentName}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  <span>AI: <strong>{providerInfo[settings.aiConfig.provider as Provider]?.name}</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-muted/30 border-t flex items-center justify-between">
          <div>
            {step === 1 && (
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip for now
              </Button>
            )}
            {step > 1 && step < 3 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {step === 2 && !isStep2Valid && (
              <Button variant="outline" onClick={() => setStep(3)}>
                Set up later
              </Button>
            )}
            {step < 3 && (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleComplete} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
