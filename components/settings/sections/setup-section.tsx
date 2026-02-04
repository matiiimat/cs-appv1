"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { useSettings } from "@/lib/settings-context"
import { useToast } from "@/components/ui/toast"
import { useTour } from "@/lib/tour-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { SectionHeader } from "../section-header"
import { SettingCard, SettingField } from "../setting-card"
import { CollapsibleSection } from "../collapsible-section"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { AIService } from "@/lib/ai-providers"
import {
  Save,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Zap,
  Sparkles,
  Pencil,
  PlayCircle,
} from "lucide-react"

type Provider = "openai" | "anthropic" | "local"

const providerInfo: Record<Provider, { name: string; description: string; iconLight: string; iconDark: string; comingSoon?: boolean }> = {
  openai: {
    name: "OpenAI",
    description: "GPT-4o, GPT-4o-mini",
    iconLight: "/ai_providers/openai-light.png",
    iconDark: "/ai_providers/openai-dark.png",
  },
  anthropic: {
    name: "Anthropic",
    description: "Claude 3.5 Sonnet, Haiku",
    iconLight: "/ai_providers/claude-icon.png",
    iconDark: "/ai_providers/claude-icon.png",
  },
  local: {
    name: "Local AI",
    description: "Coming Soon",
    iconLight: "/ai_providers/lm_studio_icon.png",
    iconDark: "/ai_providers/lm_studio_icon.png",
    comingSoon: true,
  },
}

export function SetupSection() {
  const { settings, updateSettings, saveSettings, aiConfigHasKey, setAiConfigHasKey, planInfo } = useSettings()
  const isManaged = planInfo?.isManaged ?? false
  const { addToast } = useToast()
  const { startTour, isTourActive } = useTour()
  const [showApiKey, setShowApiKey] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean
    error?: string
  } | null>(null)
  // API key editing state
  const [isEditingApiKey, setIsEditingApiKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [savingApiKey, setSavingApiKey] = useState(false)

  // Auto-save hook for brand identity and AI config
  const { resetSnapshot } = useAutoSave({
    data: {
      brandName: settings.brandName,
      agentName: settings.agentName,
      agentSignature: settings.agentSignature,
      aiConfigProvider: settings.aiConfig.provider,
      aiConfigModel: settings.aiConfig.model,
      aiConfigLocalEndpoint: settings.aiConfig.localEndpoint,
    },
    onSave: saveSettings,
    debounceMs: 1500,
    addToast,
  })

  // Reset snapshot when settings are loaded from server
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      resetSnapshot()
    }
  }, [resetSnapshot])

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
    } else if (!settings.aiConfig.apiKey && !aiConfigHasKey) {
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
                ? "Connection test timed out after 10 seconds"
                : e.message
              : "Connection failed"
          setConnectionResult({ success: false, error: msg })
        }
      } else {
        const aiService = new AIService(settings.aiConfig)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Connection test timed out after 10 seconds")), 10000)
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

  // Save API key explicitly (manual save for security)
  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return

    setSavingApiKey(true)
    try {
      // Update settings with new API key
      updateSettings({
        aiConfig: { ...settings.aiConfig, apiKey: apiKeyInput.trim() },
      })

      // Save to database
      await saveSettings()

      // Update state
      setAiConfigHasKey(true)
      setIsEditingApiKey(false)
      setApiKeyInput("")
      setConnectionResult(null)

      addToast({
        type: "success",
        title: "API key saved",
        message: "Your API key has been securely stored",
        duration: 3000,
      })
    } catch {
      addToast({
        type: "error",
        title: "Failed to save API key",
        message: "Please try again",
        duration: 4000,
      })
    } finally {
      setSavingApiKey(false)
    }
  }

  // Cancel API key editing
  const handleCancelApiKeyEdit = () => {
    setIsEditingApiKey(false)
    setApiKeyInput("")
    setShowApiKey(false)
  }

  // Calculate setup completion
  const setupSteps = [
    { label: "Brand name", complete: !!settings.brandName.trim() },
    { label: "Agent name", complete: !!settings.agentName.trim() },
    // Only show AI steps for non-managed plans (BYOK)
    ...(!isManaged ? [
      { label: "AI provider", complete: !!settings.aiConfig.provider },
      { label: "AI connected", complete: connectionResult?.success || aiConfigHasKey },
    ] : []),
  ]
  const completedSteps = setupSteps.filter((s) => s.complete).length
  const allComplete = completedSteps === setupSteps.length

  return (
    <div className="animate-in fade-in duration-200">
      <SectionHeader
        title="Setup"
        description="Configure your brand identity and AI provider to get started"
      />

      {/* Setup Progress */}
      {!allComplete && (
        <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-medium text-foreground">
              Setup Progress: {completedSteps}/{setupSteps.length}
            </span>
          </div>
          <div className="flex gap-2">
            {setupSteps.map((step, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  step.complete ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {setupSteps
              .filter((s) => !s.complete)
              .map((step, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                >
                  {step.label}
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="space-y-10">
        {/* Brand Identity */}
        <CollapsibleSection
          title="Brand Identity"
          isComplete={!!(settings.brandName.trim() && settings.agentName.trim())}
        >
          <div className="space-y-1">
            <SettingCard>
              <SettingField
                label="Brand Name"
                description={`Appears in emails as "${settings.brandName || "Your Brand"} Support"`}
              >
                <Input
                  value={settings.brandName}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 80)
                    updateSettings({ brandName: value })
                  }}
                  placeholder="e.g., Acme Corp"
                  className="max-w-md"
                />
              </SettingField>
            </SettingCard>

            <SettingCard>
              <SettingField label="Agent Name" description="Your display name in conversations">
                <Input
                  value={settings.agentName}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 32)
                    updateSettings({ agentName: value })
                  }}
                  placeholder="e.g., Sarah Johnson"
                  className="max-w-md"
                />
              </SettingField>
            </SettingCard>

            <SettingCard>
              <SettingField
                label="Email Signature"
                characterCount={{
                  current: settings.agentSignature.length,
                  max: 100,
                }}
              >
                <Textarea
                  value={settings.agentSignature}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 100)
                    updateSettings({ agentSignature: value })
                  }}
                  placeholder="Best regards,&#10;The Support Team"
                  rows={3}
                  className="max-w-md resize-none"
                />
              </SettingField>
            </SettingCard>
          </div>
        </CollapsibleSection>

        {/* AI Configuration - Show managed banner for managed plans, full config for BYOK */}
        {isManaged ? (
          <CollapsibleSection
            title="AI Configuration"
            isComplete={true}
            badge="Managed"
          >
            <SettingCard bordered className="bg-primary/5 border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-foreground">Managed AI Included</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your {planInfo?.planType === 'plus' ? 'Plus' : 'Free'} plan includes managed AI powered by Claude. No API key configuration needed.
                  </p>
                  {planInfo?.tokenUsage && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Token Usage</span>
                        <span className="font-medium">
                          {(planInfo.tokenUsage.used / 1000).toFixed(0)}K / {((planInfo.tokenUsage.limit || 0) / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            planInfo.tokenUsage.isNearLimit
                              ? 'bg-amber-500'
                              : 'bg-primary'
                          }`}
                          style={{
                            width: `${Math.min(100, (planInfo.tokenUsage.used / (planInfo.tokenUsage.limit || 1)) * 100)}%`
                          }}
                        />
                      </div>
                      {planInfo.tokenUsage.resetsAt && (
                        <p className="text-xs text-muted-foreground">
                          Resets {new Date(planInfo.tokenUsage.resetsAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </SettingCard>
          </CollapsibleSection>
        ) : (
        <CollapsibleSection
          title="AI Configuration"
          isComplete={connectionResult?.success || aiConfigHasKey}
        >
          <div className="space-y-1">
            {/* Provider Selection */}
            <SettingCard>
            <div className="space-y-4">
              <label className="text-sm font-medium text-foreground">AI Provider</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.keys(providerInfo) as Provider[]).map((provider) => {
                  const info = providerInfo[provider]
                  const isSelected = settings.aiConfig.provider === provider
                  const isDisabled = info.comingSoon
                  return (
                    <button
                      key={provider}
                      onClick={() => !isDisabled && handleProviderChange(provider)}
                      disabled={isDisabled}
                      className={`
                        relative p-4 rounded-xl border-2 text-left transition-all duration-200
                        ${
                          isDisabled
                            ? "border-border bg-muted/50 cursor-not-allowed opacity-60"
                            : "hover:border-primary/50 hover:bg-primary/5"
                        }
                        ${
                          isSelected && !isDisabled
                            ? "border-primary bg-primary/10 shadow-sm"
                            : !isDisabled ? "border-border bg-card" : ""
                        }
                      `}
                    >
                      {isSelected && !isDisabled && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      {isDisabled && (
                        <div className="absolute top-2 right-2">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            Coming Soon
                          </span>
                        </div>
                      )}
                      <div className={`w-full flex justify-center mb-2 ${isDisabled ? "opacity-50" : ""}`}>
                        <Image
                          src={info.iconLight}
                          alt={info.name}
                          width={16}
                          height={16}
                          className="object-contain dark:hidden"
                        />
                        <Image
                          src={info.iconDark}
                          alt={info.name}
                          width={16}
                          height={16}
                          className="object-contain hidden dark:block"
                        />
                      </div>
                      <div className={`font-medium ${isDisabled ? "text-muted-foreground" : "text-foreground"}`}>{info.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{info.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </SettingCard>

          {/* Model & API Key */}
          <SettingCard>
            <div className="space-y-6">
              {settings.aiConfig.provider === "local" ? (
                <>
                  <SettingField
                    label="Local AI Server URL"
                    description="The base URL of your local AI server (OpenAI-compatible API)"
                  >
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
                      className="max-w-md font-mono text-sm"
                    />
                  </SettingField>

                  <SettingField
                    label="Model Identifier"
                    description="The model name as configured on your local server"
                  >
                    <Input
                      value={settings.aiConfig.model}
                      onChange={(e) => {
                        updateSettings({
                          aiConfig: { ...settings.aiConfig, model: e.target.value },
                        })
                        setConnectionResult(null)
                      }}
                      placeholder="mistralai/devstral-small-2505"
                      className="max-w-md font-mono text-sm"
                    />
                  </SettingField>
                </>
              ) : (
                <>
                  <SettingField
                    label="Model"
                    description={`Enter the ${settings.aiConfig.provider === "openai" ? "OpenAI" : "Anthropic"} model identifier`}
                  >
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
                      className="max-w-md font-mono text-sm"
                    />
                  </SettingField>

                  <SettingField
                    label="API Key"
                    description={
                      aiConfigHasKey && !isEditingApiKey
                        ? "Your API key is securely stored"
                        : `Your ${settings.aiConfig.provider === "openai" ? "OpenAI" : "Anthropic"} API key`
                    }
                  >
                    {/* State: Key saved, not editing */}
                    {aiConfigHasKey && !isEditingApiKey && (
                      <div className="flex items-center gap-3 max-w-md">
                        <div className="flex-1 px-3 py-2 rounded-md bg-muted/50 border border-border font-mono text-sm text-muted-foreground">
                          ••••••••••••••••••••••••
                        </div>
                        <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-800 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Saved
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingApiKey(true)}
                          className="shrink-0"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          Change
                        </Button>
                      </div>
                    )}

                    {/* State: No key saved OR editing existing key */}
                    {(!aiConfigHasKey || isEditingApiKey) && (
                      <div className="space-y-3 max-w-md">
                        <div className="relative">
                          <Input
                            type={showApiKey ? "text" : "password"}
                            value={apiKeyInput}
                            onChange={(e) => {
                              setApiKeyInput(e.target.value)
                              setConnectionResult(null)
                            }}
                            placeholder={
                              settings.aiConfig.provider === "openai"
                                ? "sk-..."
                                : "sk-ant-..."
                            }
                            className="pr-10 font-mono text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={handleSaveApiKey}
                            disabled={!apiKeyInput.trim() || savingApiKey}
                            size="sm"
                          >
                            {savingApiKey ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                            ) : (
                              <Save className="h-4 w-4 mr-1.5" />
                            )}
                            {savingApiKey ? "Saving..." : "Save Key"}
                          </Button>
                          {isEditingApiKey && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelApiKeyEdit}
                              disabled={savingApiKey}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </SettingField>
                </>
              )}
            </div>
          </SettingCard>

          {/* Connection Test */}
          <SettingCard bordered className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground">Test Connection</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Verify your AI configuration is working correctly
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={
                  testingConnection ||
                  (settings.aiConfig.provider !== "local" &&
                    !settings.aiConfig.apiKey &&
                    !aiConfigHasKey)
                }
                className="shrink-0"
              >
                {testingConnection ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {testingConnection ? "Testing..." : "Test"}
              </Button>
            </div>

            {connectionResult && (
              <div
                className={`
                  mt-4 p-3 rounded-lg flex items-start gap-3
                  ${
                    connectionResult.success
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  }
                `}
              >
                {connectionResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      connectionResult.success
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {connectionResult.success ? "Connection successful!" : "Connection failed"}
                  </p>
                  {connectionResult.error && !connectionResult.success && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {connectionResult.error}
                    </p>
                  )}
                </div>
              </div>
            )}
            </SettingCard>
          </div>
        </CollapsibleSection>
        )}

        {/* Take a Tour */}
        <SettingCard bordered className="mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <PlayCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Take a Tour</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  New to Aidly? Take a guided tour to learn how to process messages, triage responses, and get the most out of the app.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                // Navigate to queue view first, then start tour
                window.dispatchEvent(new CustomEvent('aidly:navigate:queue'))
                setTimeout(() => startTour(), 300)
              }}
              disabled={isTourActive}
              className="shrink-0"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {isTourActive ? "Tour in progress..." : "Start Tour"}
            </Button>
          </div>
        </SettingCard>
      </div>
    </div>
  )
}
