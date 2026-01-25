"use client"

import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Check, AlertCircle, Cloud } from "lucide-react"
import type { SaveStatus } from "@/lib/hooks/use-auto-save"

interface SectionHeaderProps {
  title: string
  description?: string
  /** Save status for auto-save indicator */
  saveStatus?: SaveStatus
  /** Legacy action button (prefer saveStatus for new implementations) */
  action?: {
    label: string
    onClick: () => void
    loading?: boolean
    disabled?: boolean
    variant?: "default" | "outline" | "ghost"
    icon?: ReactNode
  }
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Cloud className="h-3.5 w-3.5" />
        <span>All changes saved</span>
      </div>
    )
  }

  if (status === "saving") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Saving...</span>
      </div>
    )
  }

  if (status === "saved") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <Check className="h-3.5 w-3.5" />
        <span>Saved</span>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>Failed to save</span>
      </div>
    )
  }

  return null
}

export function SectionHeader({ title, description, saveStatus, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold font-[family-name:var(--font-custom)] text-foreground">
            {title}
          </h2>
          {saveStatus && <SaveStatusIndicator status={saveStatus} />}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button
          variant={action.variant || "default"}
          onClick={action.onClick}
          disabled={action.disabled || action.loading}
          className="shrink-0"
        >
          {action.loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : action.icon ? (
            <span className="mr-2">{action.icon}</span>
          ) : null}
          {action.label}
        </Button>
      )}
    </div>
  )
}
