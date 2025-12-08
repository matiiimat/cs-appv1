"use client"

import { useState, useMemo } from "react"
import { useSettings } from "@/lib/settings-context"
import { SectionHeader } from "../section-header"
import { SettingCard, SettingField } from "../setting-card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KnowledgeBaseManager } from "@/components/knowledge-base-manager"
import { Save, Check, Loader2, FileText, Database } from "lucide-react"

export function KnowledgeSection() {
  const { settings, updateSettings, saveSettings } = useSettings()
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [initialSnapshot, setInitialSnapshot] = useState(() =>
    JSON.stringify({
      companyKnowledge: settings.companyKnowledge,
      aiInstructions: settings.aiInstructions,
    })
  )

  const hasChanges = useMemo(() => {
    const current = JSON.stringify({
      companyKnowledge: settings.companyKnowledge,
      aiInstructions: settings.aiInstructions,
    })
    return current !== initialSnapshot
  }, [settings.companyKnowledge, settings.aiInstructions, initialSnapshot])

  const handleSave = async () => {
    setSaveStatus("saving")
    try {
      await saveSettings()
      setSaveStatus("saved")
      setInitialSnapshot(
        JSON.stringify({
          companyKnowledge: settings.companyKnowledge,
          aiInstructions: settings.aiInstructions,
        })
      )
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch {
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 3000)
    }
  }

  return (
    <div className="animate-in fade-in duration-200">
      <SectionHeader
        title="Knowledge"
        description="Documentation and saved cases the AI uses to generate responses. More detailed knowledge leads to more accurate replies, but will consume additional AI tokens per response."
        action={
          hasChanges
            ? {
                label:
                  saveStatus === "saved"
                    ? "Saved"
                    : saveStatus === "saving"
                    ? "Saving..."
                    : "Save Changes",
                onClick: handleSave,
                loading: saveStatus === "saving",
                disabled: saveStatus === "saving" || saveStatus === "saved",
                icon:
                  saveStatus === "saved" ? (
                    <Check className="h-4 w-4" />
                  ) : saveStatus === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  ),
              }
            : undefined
        }
      />

      <Tabs defaultValue="documentation" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="documentation" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentation
          </TabsTrigger>
          <TabsTrigger value="resolution-library" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Resolution Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documentation" className="space-y-6">
          {/* Company Knowledge Base */}
          <SettingCard>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Company Knowledge Base</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Paste your company&apos;s support documentation, FAQs, policies, and product information.
                  The AI will use this to provide accurate, company-specific responses.
                </p>
              </div>

              <SettingField
                label=""
                characterCount={{
                  current: settings.companyKnowledge.length,
                  max: 50000,
                }}
              >
                <Textarea
                  value={settings.companyKnowledge}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 50000)
                    updateSettings({ companyKnowledge: value })
                  }}
                  placeholder={`# Return Policy
Customers can return items within 30 days of purchase...

# Shipping Information
We ship to all 50 states. Standard shipping takes 5-7 business days...

# Product FAQs
Q: How do I reset my password?
A: Click "Forgot Password" on the login page...`}
                  rows={14}
                  className="font-mono text-sm resize-y min-h-[280px]"
                  maxLength={50000}
                />
              </SettingField>

              {/* Progress bar for character usage */}
              <div className="space-y-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      settings.companyKnowledge.length > 45000
                        ? "bg-red-500"
                        : settings.companyKnowledge.length > 35000
                        ? "bg-amber-500"
                        : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min(100, (settings.companyKnowledge.length / 50000) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </SettingCard>

          {/* Custom AI Instructions */}
          <SettingCard>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Custom AI Instructions</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Additional behavior guidelines for the AI assistant. These instructions shape how
                  responses are generated.
                </p>
              </div>

              <SettingField
                label=""
                characterCount={{
                  current: settings.aiInstructions.length,
                  max: 500,
                }}
              >
                <Textarea
                  value={settings.aiInstructions}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 500)
                    updateSettings({ aiInstructions: value })
                  }}
                  placeholder="Always be polite and professional. Never provide refunds for digital products. Escalate billing disputes to the finance team..."
                  rows={5}
                  className="resize-none"
                  maxLength={500}
                />
              </SettingField>
            </div>
          </SettingCard>

          {/* Save Status Feedback */}
          {saveStatus === "error" && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              Failed to save changes. Please try again.
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolution-library">
          <KnowledgeBaseManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
