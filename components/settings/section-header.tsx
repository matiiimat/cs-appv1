"use client"

import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface SectionHeaderProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    loading?: boolean
    disabled?: boolean
    variant?: "default" | "outline" | "ghost"
    icon?: ReactNode
  }
}

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h2 className="text-2xl font-bold font-[family-name:var(--font-custom)] text-foreground">
          {title}
        </h2>
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
