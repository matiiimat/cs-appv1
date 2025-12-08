"use client"

import { useState, useMemo } from "react"
import { useSettings } from "@/lib/settings-context"
import { SectionHeader } from "../section-header"
import { SettingCard } from "../setting-card"
import { CategoryEditor } from "../editors/category-editor"
import { SLAVisualizer } from "../editors/sla-visualizer"
import { QuickActionEditor } from "../editors/quick-action-card"
import { Save, Check, Loader2 } from "lucide-react"

export function CustomizationSection() {
  const { settings, saveSettings } = useSettings()
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [initialSnapshot, setInitialSnapshot] = useState(() =>
    JSON.stringify({
      categories: settings.categories,
      messageAgeThresholds: settings.messageAgeThresholds,
      quickActions: settings.quickActions,
    })
  )

  const hasChanges = useMemo(() => {
    const current = JSON.stringify({
      categories: settings.categories,
      messageAgeThresholds: settings.messageAgeThresholds,
      quickActions: settings.quickActions,
    })
    return current !== initialSnapshot
  }, [settings.categories, settings.messageAgeThresholds, settings.quickActions, initialSnapshot])

  const handleSave = async () => {
    setSaveStatus("saving")
    try {
      await saveSettings()
      setSaveStatus("saved")
      setInitialSnapshot(
        JSON.stringify({
          categories: settings.categories,
          messageAgeThresholds: settings.messageAgeThresholds,
          quickActions: settings.quickActions,
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
        title="Customization"
        description="Configure categories, response time thresholds, and quick actions"
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

      <div className="space-y-8">
        {/* Categories */}
        <SettingCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">Message Categories</h3>
          <CategoryEditor />
        </SettingCard>

        {/* SLA Thresholds */}
        <SettingCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">Response Time SLA</h3>
          <SLAVisualizer />
        </SettingCard>

        {/* Quick Actions */}
        <SettingCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <QuickActionEditor />
        </SettingCard>

        {/* Save Status Feedback */}
        {saveStatus === "error" && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            Failed to save changes. Please try again.
          </div>
        )}
      </div>
    </div>
  )
}
