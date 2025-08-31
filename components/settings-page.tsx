"use client"

import { useState } from "react"
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
  const { settings, updateSettings, updateQuickAction, updateCategory, addCategory, deleteCategory, saveSettings, isLoading, lastSaved } = useSettings()
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
          <div className="bg-card rounded-lg shadow-md">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Agent Information</h3>
                <p className="text-sm text-muted-foreground">Configure your agent profile and signature</p>
              </div>
              <div className="space-y-4">
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
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <div className="bg-card rounded-lg shadow-md">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">AI Provider Configuration</h3>
                <p className="text-sm text-muted-foreground">Configure your AI provider and API settings</p>
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
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Message Categories</h3>
                <p className="text-sm text-muted-foreground">Define custom categories for organizing customer messages</p>
              </div>
              <div className="space-y-4">
              {settings.categories.length === 0 && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  No custom categories defined. AI will use &quot;N/A&quot; as fallback category.
                </div>
              )}
              
              {settings.categories.map((category) => (
                <div key={category.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: category.color || '#64748b' }}
                  />
                  <div className="flex-1">
                    <Input
                      value={category.name}
                      onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                      placeholder="Category name"
                    />
                  </div>
                  <Input
                    type="color"
                    value={category.color || '#64748b'}
                    onChange={(e) => updateCategory(category.id, { color: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCategory(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                variant="outline"
                onClick={() => addCategory({ 
                  name: "New Category", 
                  color: '#3b82f6' 
                })}
                className="w-full"
              >
                Add Category
              </Button>
              
              <div className="text-xs text-muted-foreground">
                Categories help organize and filter customer messages. Historical messages will keep their original categories when you make changes.
              </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">AI Assistant Instructions</h3>
                <p className="text-sm text-muted-foreground">Customize how the AI assistant behaves and responds</p>
              </div>
              <div className="space-y-4">
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
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Quick Actions</h3>
                <p className="text-sm text-muted-foreground">Configure quick action buttons for Messages to Review (title max 12 chars)</p>
              </div>
              <div className="space-y-4">
              {settings.quickActions.map((action, index) => (
                <div key={action.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span className="font-medium">Quick Action {index + 1}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Title (Button Label)</Label>
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
                        {action.title.length}/12 characters (button label)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">AI Instruction</Label>
                      <Textarea
                        value={action.action}
                        onChange={(e) => updateQuickAction(action.id, { action: e.target.value })}
                        placeholder="e.g. Translate the response to Spanish"
                        rows={3}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Instruction sent to AI when button is clicked
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  These quick actions will appear as buttons in the Messages to Review page.
                  Click them to instantly apply AI modifications to responses.
                </p>
              </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
