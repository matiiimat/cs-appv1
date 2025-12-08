"use client"

import { useState } from "react"
import { useSettings } from "@/lib/settings-context"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, ChevronUp, Zap } from "lucide-react"

export function QuickActionEditor() {
  const { settings, updateQuickAction } = useSettings()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Quick actions let you apply common transformations to AI-generated responses with one click.
      </p>

      <div className="space-y-3">
        {settings.quickActions.map((action, index) => {
          const isExpanded = expandedId === action.id

          return (
            <div
              key={action.id}
              className={`
                border rounded-lg transition-all duration-200
                ${isExpanded ? "bg-muted/30 border-border" : "bg-card border-border/50 hover:border-border"}
              `}
            >
              {/* Header - always visible */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : action.id)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-foreground">
                      {action.title || `Quick Action ${index + 1}`}
                    </div>
                    {!isExpanded && action.action && (
                      <div className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                        {action.action}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-muted-foreground">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Button Label</label>
                    <Input
                      value={action.title}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 12)
                        updateQuickAction(action.id, { title: value })
                      }}
                      placeholder="e.g., Translate ES"
                      maxLength={12}
                      className="max-w-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      {action.title.length}/12 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">AI Instruction</label>
                    <Textarea
                      value={action.action}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 500)
                        updateQuickAction(action.id, { action: value })
                      }}
                      placeholder="e.g., Translate the response to Spanish while maintaining a professional tone"
                      rows={3}
                      maxLength={500}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      {action.action.length}/500 characters
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {settings.quickActions.length === 0 && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg text-center">
          No quick actions configured.
        </div>
      )}
    </div>
  )
}
