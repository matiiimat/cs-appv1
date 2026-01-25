"use client"

import { useState, ReactNode } from "react"
import { ChevronDown, CheckCircle } from "lucide-react"

interface CollapsibleSectionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  /** Show a checkmark when complete */
  isComplete?: boolean
  /** Optional badge text */
  badge?: string
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  isComplete,
  badge,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground uppercase tracking-wider">
            {title}
          </h3>
          {isComplete && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`transition-all duration-200 ease-in-out ${
          isOpen ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
        }`}
      >
        <div className="p-4 pt-2">
          {children}
        </div>
      </div>
    </div>
  )
}
