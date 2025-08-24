"use client"

import { useState, useEffect } from "react"
import { useSettings } from "@/lib/settings-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2, ExternalLink, Moon, Sun } from "lucide-react"

export function SettingsPage() {
  const { settings, updateSettings, updateMacro, addMacro, deleteMacro } = useSettings()
  const [newMacro, setNewMacro] = useState({ name: "", description: "", action: "" })

  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [settings.theme])

  const handleThemeChange = (theme: "light" | "dark") => {
    updateSettings({ theme })
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

  const handleAddMacro = () => {
    if (newMacro.name && newMacro.description && newMacro.action) {
      addMacro(newMacro)
      setNewMacro({ name: "", description: "", action: "" })
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure your agent profile and AI assistant preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="ai">AI Assistant</TabsTrigger>
          <TabsTrigger value="macros">Macros</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Assistant Configuration</CardTitle>
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
              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Release Notes</p>
                  <p className="text-xs text-muted-foreground">Stay updated with the latest AI improvements</p>
                </div>
                <Button variant="outline" size="sm">
                  View Updates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="macros" className="space-y-6">
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

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme & Appearance</CardTitle>
              <CardDescription>Customize the look and feel of your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
      </Tabs>
    </div>
  )
}
