"use client"

import { useEffect, useState } from "react"
import { useSettings } from "@/lib/settings-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Moon, Sun, CheckCircle, XCircle, Loader2, Save } from "lucide-react"
import { AI_PROVIDERS, AIService } from "@/lib/ai-providers"

export function SettingsPage() {
  const { settings, updateSettings, updateMacro, addMacro, deleteMacro, saveSettings, isLoading, lastSaved } = useSettings()
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [saveResult, setSaveResult] = useState<{ success: boolean; error?: string } | null>(null)


  const handleThemeChange = (theme: "light" | "dark") => {
    updateSettings({ theme })
  }

  const handleProviderChange = (provider: string) => {
    const providerModels = AI_PROVIDERS[provider]?.models || []
    const defaultModel = providerModels[0] || ""
    
    updateSettings({
      aiConfig: {
        ...settings.aiConfig,
        provider: provider as "openai" | "anthropic" | "local",
        model: defaultModel,
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
      if (!settings.aiConfig.apiKey && !settings.aiConfig.localEndpoint) {
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
      const aiService = new AIService(settings.aiConfig)
      const result = await aiService.testConnection()
      setConnectionResult(result)
    } catch (error) {
      setConnectionResult({
        success: false,
        error: error instanceof Error ? error.message : "Connection failed"
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const getAvailableModels = () => {
    return AI_PROVIDERS[settings.aiConfig.provider]?.models || []
  }

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

  useEffect(() => {
    if (settings.macros.length === 0) {
      const predefinedMacros = [
        {
          id: "translate-spanish",
          name: "Translate to Spanish",
          description: "Translate AI response to Spanish and send to conversation",
          action: "translate_to_spanish",
        },
        {
          id: "use-last-response",
          name: "Use AI Response",
          description: "Send the last AI response to conversation field",
          action: "use_last_ai_response",
        },
        {
          id: "custom-macro",
          name: "Custom Macro",
          description: "Set up your own custom behavior",
          action: "custom_action",
        },
      ]

      predefinedMacros.forEach((macro) => addMacro(macro))
    }
  }, [settings.macros.length, addMacro])


  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
            <p className="text-muted-foreground">Configure your agent profile and AI assistant preferences</p>
          </div>
          <div className="flex items-center gap-4">
            {lastSaved && (
              <p className="text-sm text-muted-foreground">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
            <Button 
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
        {saveResult && (
          <div className={`mt-4 text-sm p-3 rounded ${
            saveResult.success 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
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
          <Card>
            <CardHeader>
              <CardTitle>Agent Information</CardTitle>
              <CardDescription>Configure your agent profile and signature</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Agent Name</Label>
                <Input
                  id="agentName"
                  value={settings.agentName}
                  onChange={(e) => updateSettings({ agentName: e.target.value })}
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agentSignature">Email Signature</Label>
                <Textarea
                  id="agentSignature"
                  value={settings.agentSignature}
                  onChange={(e) => updateSettings({ agentSignature: e.target.value })}
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
                    className="flex items-center gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Provider Configuration</CardTitle>
              <CardDescription>Configure your AI provider and API settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                        onChange={(e) => updateSettings({
                          aiConfig: {
                            ...settings.aiConfig,
                            localEndpoint: e.target.value,
                            apiKey: e.target.value,
                          }
                        })}
                        placeholder="http://192.168.1.24:1234"
                      />
                      <p className="text-xs text-muted-foreground">
                        URL of your local AI server
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="local-model-identifier">Model Identifier</Label>
                      <Input
                        id="local-model-identifier"
                        value={settings.aiConfig.model}
                        onChange={(e) => updateSettings({
                          aiConfig: {
                            ...settings.aiConfig,
                            model: e.target.value,
                          }
                        })}
                        placeholder="mistralai/devstral-small-2505"
                      />
                      <p className="text-xs text-muted-foreground">
                        Exact model identifier as shown in your local AI server
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="ai-model">Model</Label>
                    <Select
                      value={settings.aiConfig.model}
                      onValueChange={handleModelChange}
                      disabled={getAvailableModels().length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableModels().map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {settings.aiConfig.provider !== 'local' && (
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key"
                      type="password"
                      value={settings.aiConfig.apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      placeholder="Enter your API key"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleTestConnection}
                      disabled={testingConnection || !settings.aiConfig.apiKey}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {testingConnection ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : connectionResult?.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : connectionResult?.success === false ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                      ) : null}
                      Test
                    </Button>
                  </div>
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

              {settings.aiConfig.provider === 'local' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={handleTestConnection}
                      disabled={testingConnection || (!settings.aiConfig.apiKey && !settings.aiConfig.localEndpoint)}
                      variant="outline"
                      className="flex items-center gap-2"
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
                  {connectionResult && (
                    <div className={`text-sm p-2 rounded ${
                      connectionResult.success 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {connectionResult.success 
                        ? connectionResult.error || 'Connection successful!' 
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
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle>AI Assistant Instructions</CardTitle>
              <CardDescription>Customize how the AI assistant behaves and responds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aiInstructions">Custom Instructions</Label>
                <Textarea
                  id="aiInstructions"
                  value={settings.aiInstructions}
                  onChange={(e) => updateSettings({ aiInstructions: e.target.value })}
                  placeholder="Enter custom instructions for the AI assistant"
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Action Macros</CardTitle>
              <CardDescription>Predefined actions for common support tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {settings.macros.map((macro) => (
                  <div key={macro.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{macro.name}</h4>
                        <p className="text-sm text-muted-foreground">{macro.description}</p>
                      </div>
                      {macro.id === "custom-macro" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMacro(macro.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {macro.id === "custom-macro" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Custom Action Text</Label>
                        <Textarea
                          value={macro.action}
                          onChange={(e) => updateMacro(macro.id, { action: e.target.value })}
                          rows={2}
                          className="text-sm"
                          placeholder="Define your custom macro behavior..."
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Use the predefined macros above for common support actions
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
