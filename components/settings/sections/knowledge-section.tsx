"use client"

import { useSettings } from "@/lib/settings-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { useToast } from "@/components/ui/toast"
import { SectionHeader } from "../section-header"
import { SettingField } from "../setting-card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KnowledgeBaseManager } from "@/components/knowledge-base-manager"
import { FileText, BookMarked, Lightbulb } from "lucide-react"

export function KnowledgeSection() {
  const { settings, updateSettings, saveSettings } = useSettings()
  const { addToast } = useToast()

  // Auto-save hook
  useAutoSave({
    data: {
      companyKnowledge: settings.companyKnowledge,
      aiInstructions: settings.aiInstructions,
    },
    onSave: saveSettings,
    debounceMs: 2000, // Longer debounce for large text areas
    addToast,
  })

  return (
    <div className="animate-in fade-in duration-200">
      <SectionHeader
        title="Knowledge"
        description="Documentation and saved cases the AI uses to generate responses"
      />

      <Tabs defaultValue="documentation" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="documentation" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Company Docs
          </TabsTrigger>
          <TabsTrigger value="resolution-library" className="flex items-center gap-2">
            <BookMarked className="h-4 w-4" />
            Saved Replies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documentation" className="space-y-10">
          {/* Company Knowledge Base */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Company Knowledge Base
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Paste your company&apos;s support documentation, FAQs, policies, and product information.
              The AI will use this to provide accurate, company-specific responses.
            </p>

            {/* Empty state hint */}
            {!settings.companyKnowledge.trim() && (
              <div className="mb-4 p-4 rounded-lg border border-dashed border-border bg-muted/30">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Get started with your knowledge base</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add your FAQs, return policies, shipping info, and product details.
                      The AI references this information to give accurate, on-brand responses.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                rows={settings.companyKnowledge.trim() ? 14 : 8}
                className="font-mono text-sm resize-y min-h-[200px]"
                maxLength={50000}
              />
            </SettingField>

            {/* Progress bar for character usage - only show when there's content */}
            {settings.companyKnowledge.length > 0 && (
              <div className="mt-3 space-y-1">
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
                <p className="text-xs text-muted-foreground">
                  More content = more accurate responses, but uses more AI tokens per request
                </p>
              </div>
            )}
          </div>

          {/* Custom AI Instructions */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Custom AI Instructions
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Additional behavior guidelines for the AI assistant. These instructions shape how
              responses are generated.
            </p>

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
        </TabsContent>

        <TabsContent value="resolution-library">
          <KnowledgeBaseManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
