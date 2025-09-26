"use client"

import { useState, useEffect, useMemo } from "react"
import { useSettings } from "@/lib/settings-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Moon, Sun, CheckCircle, XCircle, Loader2, Save } from "lucide-react"
import { AI_PROVIDERS, AIService } from "@/lib/ai-providers"

export function SettingsPage() {
  const { settings, updateSettings, updateQuickAction, updateCategory, addCategory, deleteCategory, saveSettings, isLoading } = useSettings()
  const [mailbox, setMailbox] = useState<{ forwardToAddress: string } | null>(null)
  useEffect(() => {
    const loadMailbox = async () => {
      try {
        const resp = await fetch('/api/organization/mailbox')
        if (resp.ok) {
          const data = await resp.json()
          setMailbox({ forwardToAddress: data.forwardToAddress })
        }
      } catch {
        // ignore in MVP
      }
    }
    loadMailbox()
  }, [])
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [saveResult, setSaveResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [savedSettings, setSavedSettings] = useState(settings)

  // Detect if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings)
  }, [settings, savedSettings])


  // Update saved settings reference when settings are actually saved
  useEffect(() => {
    if (saveResult?.success) {
      setSavedSettings(settings)
    }
  }, [saveResult?.success, settings])

  const handleThemeChange = (theme: "light" | "dark") => {
    updateSettings({ theme })
  }

  const handleProviderChange = (provider: string) => {
    // Simple defaults per provider; user can override in text field
    const defaultModel = provider === 'openai'
      ? 'gpt-4o-mini'
      : provider === 'anthropic'
      ? 'claude-3-5-haiku-20241022'
      : settings.aiConfig.model

    updateSettings({
      aiConfig: {
        ...settings.aiConfig,
        provider: provider as "openai" | "anthropic" | "local",
        model: defaultModel || '',
      }
    })
    setConnectionResult(null)
  }

  const handleModelChange = (model: string) => {
    updateSettings({
      aiConfig: {
        ...settings.aiConfig,
        model,
      }
    })
    setConnectionResult(null)
  }

  const handleApiKeyChange = (apiKey: string) => {
    updateSettings({
      aiConfig: {
        ...settings.aiConfig,
        apiKey,
      }
    })
    setConnectionResult(null)
  }

  const handleTestConnection = async () => {
    // For local AI, check if endpoint is provided instead of API key
    if (settings.aiConfig.provider === 'local') {
      const localEndpoint = settings.aiConfig.localEndpoint || settings.aiConfig.apiKey || ''
      const model = settings.aiConfig.model || ''
      
      if (!localEndpoint) {
        setConnectionResult({ success: false, error: "Local AI server URL is required" })
        return
      }
      
      // Save the local AI settings before testing
      updateSettings({
        aiConfig: {
          ...settings.aiConfig,
          apiKey: localEndpoint,
          localEndpoint: localEndpoint,
          model: model,
        }
      })
    } else if (!settings.aiConfig.apiKey) {
      setConnectionResult({ success: false, error: "API key is required" })
      return
    }

    setTestingConnection(true)
    setConnectionResult(null)

    try {
      // Use server route for OpenAI/Anthropic to avoid browser CORS and secret exposure
      if (settings.aiConfig.provider === 'openai' || settings.aiConfig.provider === 'anthropic') {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 10000)
        try {
          const resp = await fetch('/api/ai/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: settings.aiConfig.provider,
              apiKey: settings.aiConfig.apiKey,
              model: settings.aiConfig.model,
            }),
            signal: controller.signal,
          })
          clearTimeout(timer)
          const data = await resp.json().catch(() => ({ success: false, error: 'Invalid server response' }))
          setConnectionResult(data)
        } catch (e) {
          const msg = e instanceof Error ? (e.name === 'AbortError' ? 'Connection test timed out after 10 seconds' : e.message) : 'Connection failed'
          setConnectionResult({ success: false, error: msg })
        }
      } else {
        // Keep local provider path unchanged
        const aiService = new AIService(settings.aiConfig)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Connection test timed out after 10 seconds')), 10000)
        })
        const result = await Promise.race([
          aiService.testConnection(),
          timeoutPromise
        ])
        setConnectionResult(result)
      }
    } catch (error) {
      setConnectionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      })
    } finally {
      setTestingConnection(false)
    }
  }

  // No remote model listing; we use simple defaults and a text field

  const handleSaveSettings = async () => {
    setSaveResult(null)
    try {
      await saveSettings()
      setSaveResult({ success: true })
      setTimeout(() => setSaveResult(null), 3000) // Clear success message after 3 seconds
    } catch (error) {
      setSaveResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save settings' 
      })
    }
  }



  return (
    <>
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          </div>
        </div>

        {mailbox && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="text-sm font-semibold mb-2">Mailbox (MVP)</h3>
            <p className="text-sm text-muted-foreground mb-2">Forward your support address to this alias to receive emails:</p>
            <code className="text-sm px-2 py-1 bg-background border rounded inline-block">{mailbox.forwardToAddress}</code>
          </div>
        )}


        {saveResult && (
          <div className={`mt-4 text-sm p-3 rounded ${
            saveResult.success 
              ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-800 dark:text-white dark:border-green-700' 
              : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-800 dark:text-white dark:border-red-700'
          }`}>
            {saveResult.success 
              ? 'Settings saved successfully!' 
              : saveResult.error || 'Failed to save settings'}
          </div>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="bg-card rounded-lg shadow-md">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Agent Information</h3>
              </div>
              <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Agent Name</Label>
                <Input
                  id="agentName"
                  value={settings.agentName}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value.length <= 32) {
                      updateSettings({ agentName: value })
                    }
                  }}
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agentSignature">Email Signature</Label>
                <Textarea
                  id="agentSignature"
                  value={settings.agentSignature}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value.length <= 100) {
                      updateSettings({ agentSignature: value })
                    }
                  }}
                  placeholder="Enter your email signature"
                  rows={4}
                />
              </div>
              <div className="space-y-3">
                <Label>Theme</Label>
                <div className="flex gap-4">
                  <Button
                    variant={settings.theme === "light" ? "default" : "outline"}
                    onClick={() => handleThemeChange("light")}
                    className="flex items-center gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={settings.theme === "dark" ? "default" : "outline"}
                    onClick={() => handleThemeChange("dark")}
                    className="flex items-center gap-2 shadow-sm dark:shadow-md dark:shadow-white/20 dark:bg-black dark:text-white dark:hover:bg-gray-900"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                </div>
              </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <div className="bg-card rounded-lg shadow-md">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold">AI Provider Configuration</h3>
                <Button
                  onClick={handleTestConnection}
                  disabled={testingConnection || (!settings.aiConfig.apiKey && settings.aiConfig.provider !== 'local')}
                  variant="outline"
                  className="flex items-center gap-2 shadow-sm dark:shadow-md dark:shadow-white/20"
                >
                  {testingConnection ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : connectionResult?.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : connectionResult?.success === false ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : null}
                  Test Connection
                </Button>
              </div>
              <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-provider">AI Provider</Label>
                  <Select
                    value={settings.aiConfig.provider}
                    onValueChange={handleProviderChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                        <SelectItem key={key} value={key}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {settings.aiConfig.provider === 'local' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="local-endpoint">Local AI Server URL</Label>
                      <Input
                        id="local-endpoint"
                        value={settings.aiConfig.localEndpoint || settings.aiConfig.apiKey || ''}
                        onChange={(e) => {
                          updateSettings({
                            aiConfig: {
                              ...settings.aiConfig,
                              localEndpoint: e.target.value,
                              apiKey: e.target.value,
                            }
                          })
                          setConnectionResult(null)
                        }}
                        placeholder="http://192.168.1.24:1234"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="local-model-identifier">Model Identifier</Label>
                      <Input
                        id="local-model-identifier"
                        value={settings.aiConfig.model}
                        onChange={(e) => {
                          updateSettings({
                            aiConfig: {
                              ...settings.aiConfig,
                              model: e.target.value,
                            }
                          })
                          setConnectionResult(null)
                        }}
                        placeholder="mistralai/devstral-small-2505"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="ai-model">Model</Label>
                    <Input
                      id="ai-model"
                      value={settings.aiConfig.model}
                      onChange={(e) => handleModelChange(e.target.value)}
                      placeholder={
                        settings.aiConfig.provider === 'openai'
                          ? 'gpt-4o-mini'
                          : settings.aiConfig.provider === 'anthropic'
                          ? 'claude-3-5-haiku-20241022'
                          : 'model'
                      }
                    />
                  </div>
                )}
              </div>

              {settings.aiConfig.provider !== 'local' && (
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={settings.aiConfig.apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="Enter your API key"
                  />
                  {connectionResult && (
                    <div className={`text-sm p-2 rounded ${
                      connectionResult.success 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {connectionResult.success 
                        ? 'Connection successful!' 
                        : connectionResult.error || 'Connection failed'}
                    </div>
                  )}
                </div>
              )}




              {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.aiConfig.temperature}
                    onChange={(e) => updateSettings({
                      aiConfig: {
                        ...settings.aiConfig,
                        temperature: parseFloat(e.target.value) || 0.7,
                      }
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Controls randomness (0-2). Lower values = more focused, higher = more creative.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-tokens">Max Tokens</Label>
                  <Input
                    id="max-tokens"
                    type="number"
                    min="1"
                    max="4000"
                    value={settings.aiConfig.maxTokens}
                    onChange={(e) => updateSettings({
                      aiConfig: {
                        ...settings.aiConfig,
                        maxTokens: parseInt(e.target.value) || 1000,
                      }
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of tokens to generate in the response.
                  </p>
                </div>
              </div> */}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Message Categories</h3>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (settings.categories.length >= 10) {
                      alert("Maximum of 10 categories allowed. Please remove some categories before adding new ones.")
                      return
                    }
                    addCategory({ 
                      name: "New Category", 
                      color: '#3b82f6' 
                    })
                  }}
                  disabled={settings.categories.length >= 10}
                  className="text-sm shadow-sm dark:shadow-md dark:shadow-white/20"
                >
                  Add Category
                </Button>
              </div>
              <div className="space-y-4">
              {settings.categories.length === 0 && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  No categories configured. Default categories will be used for AI categorization.
                </div>
              )}
              
              {settings.categories.map((category) => (
                <div key={category.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="relative">
                    <div 
                      className="w-4 h-4 rounded-full cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-400" 
                      style={{ backgroundColor: category.color || '#64748b' }}
                      onClick={() => {
                        const colorInput = document.createElement('input');
                        colorInput.type = 'color';
                        colorInput.value = category.color || '#64748b';
                        colorInput.onchange = (e) => updateCategory(category.id, { color: (e.target as HTMLInputElement).value });
                        colorInput.click();
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      value={category.name}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 20) // Limit to 20 chars
                        updateCategory(category.id, { name: value })
                      }}
                      placeholder="Category name"
                      maxLength={20}
                    />
                  </div>
                  {settings.categories.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCategory(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md">
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Company Knowledge Base</h3>
                </div>
              </div>
              <div className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  id="companyKnowledge"
                  value={settings.companyKnowledge}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 50000) // Hard limit at 50k chars
                    updateSettings({ companyKnowledge: value })
                  }}
                  placeholder="Paste your company's support documentation, FAQs, policies, troubleshooting guides, product information, etc. The AI will use this information to provide accurate, company-specific responses to customer inquiries."
                  rows={12}
                  className="font-mono text-sm h-[300px] resize-y overflow-y-auto"
                  maxLength={50000}
                />
                <p className={`text-xs ${
                  settings.companyKnowledge.length > 50000 
                    ? 'text-red-500' 
                    : settings.companyKnowledge.length > 40000 
                    ? 'text-yellow-500' 
                    : 'text-muted-foreground'
                }`}>
                  {settings.companyKnowledge.length.toLocaleString()}/50,000 characters
                </p>
              </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Custom Instructions</h3>
              </div>
              <div className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  id="aiInstructions"
                  value={settings.aiInstructions}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 500) // Limit to 500 chars
                    updateSettings({ aiInstructions: value })
                  }}
                  placeholder="Enter custom instructions for the AI assistant"
                  rows={6}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {settings.aiInstructions.length}/500 characters
                </p>
              </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">SLA</h3>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="greenHours" className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                      Green (Fresh)
                    </Label>
                    <Input
                      id="greenHours"
                      type="number"
                      min="1"
                      max="168"
                      value={settings.messageAgeThresholds.greenHours}
                      onChange={(e) => {
                        const value = Math.max(1, Math.min(168, parseInt(e.target.value) || 1))
                        const newThresholds = { ...settings.messageAgeThresholds, greenHours: value }
                        // Ensure green <= yellow <= red
                        if (value > newThresholds.yellowHours) {
                          newThresholds.yellowHours = value
                        }
                        if (newThresholds.yellowHours > newThresholds.redHours) {
                          newThresholds.redHours = newThresholds.yellowHours
                        }
                        updateSettings({ messageAgeThresholds: newThresholds })
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Up to {settings.messageAgeThresholds.greenHours} hours</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="yellowHours" className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div>
                      Yellow (Aging)
                    </Label>
                    <Input
                      id="yellowHours"
                      type="number"
                      min={settings.messageAgeThresholds.greenHours}
                      max="168"
                      value={settings.messageAgeThresholds.yellowHours}
                      onChange={(e) => {
                        const value = Math.max(settings.messageAgeThresholds.greenHours, Math.min(168, parseInt(e.target.value) || settings.messageAgeThresholds.greenHours))
                        const newThresholds = { ...settings.messageAgeThresholds, yellowHours: value }
                        // Ensure yellow <= red
                        if (value > newThresholds.redHours) {
                          newThresholds.redHours = value
                        }
                        updateSettings({ messageAgeThresholds: newThresholds })
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Up to {settings.messageAgeThresholds.yellowHours} hours</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="redHours" className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
                      Red (Overdue)
                    </Label>
                    <Input
                      id="redHours"
                      type="number"
                      min={settings.messageAgeThresholds.yellowHours}
                      max="168"
                      value={settings.messageAgeThresholds.redHours}
                      onChange={(e) => {
                        const value = Math.max(settings.messageAgeThresholds.yellowHours, Math.min(168, parseInt(e.target.value) || settings.messageAgeThresholds.yellowHours))
                        updateSettings({ messageAgeThresholds: { ...settings.messageAgeThresholds, redHours: value } })
                      }}
                    />
                    <p className="text-xs text-muted-foreground">{settings.messageAgeThresholds.redHours}+ hours</p>
                  </div>
                </div>
                
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md">
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Quick Actions</h3>
                </div>
              </div>
              <div className="space-y-4">
              {settings.quickActions.map((action, index) => (
                <div key={action.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span className="font-medium">Quick Action {index + 1}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Title</Label>
                      <Input
                        value={action.title}
                        onChange={(e) => {
                          const value = e.target.value.slice(0, 12) // Limit to 12 chars
                          updateQuickAction(action.id, { title: value })
                        }}
                        placeholder="e.g. Translate ES"
                        maxLength={12}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        {action.title.length}/12 characters
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">AI Instruction</Label>
                      <Textarea
                        value={action.action}
                        onChange={(e) => {
                          const value = e.target.value.slice(0, 500) // Limit to 500 chars
                          updateQuickAction(action.id, { action: value })
                        }}
                        placeholder="e.g. Translate the response to Spanish"
                        rows={3}
                        className="text-sm"
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground">
                        {action.action.length}/500 characters
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>

    {/* Sticky Save Banner */}
    {hasUnsavedChanges && (
      <div className="fixed bottom-0 left-0 right-0 bg-amber-50 text-amber-800 dark:bg-amber-800 dark:text-white z-50">
        <div className="container mx-auto px-6 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">You have unsaved changes.</span>
            </div>
            <Button 
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700 dark:hover:bg-amber-600"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
