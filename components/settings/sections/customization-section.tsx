"use client"

import { useSettings } from "@/lib/settings-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { SectionHeader } from "../section-header"
import { CategoryEditor } from "../editors/category-editor"
import { SLAVisualizer } from "../editors/sla-visualizer"
import { QuickActionEditor } from "../editors/quick-action-card"

export function CustomizationSection() {
  const { settings, saveSettings } = useSettings()

  // Auto-save hook
  const { status: saveStatus } = useAutoSave({
    data: {
      categories: settings.categories,
      messageAgeThresholds: settings.messageAgeThresholds,
      quickActions: settings.quickActions,
    },
    onSave: saveSettings,
    debounceMs: 1000,
  })

  return (
    <div className="animate-in fade-in duration-200">
      <SectionHeader
        title="Customization"
        description="Configure categories, response time thresholds, and quick actions"
        saveStatus={saveStatus}
      />

      <div className="space-y-10">
        {/* Categories */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Message Categories</h3>
          <CategoryEditor />
        </div>

        {/* SLA Thresholds */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Response Time SLA</h3>
          <SLAVisualizer />
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Quick Actions</h3>
          <QuickActionEditor />
        </div>

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
