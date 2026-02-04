"use client"

import { ReactNode, HTMLAttributes } from "react"

interface SettingCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  /** Use bordered style for highlighted sections (e.g., managed AI banner) */
  bordered?: boolean
}

export function SettingCard({ children, className = "", bordered = false, ...props }: SettingCardProps) {
  return (
    <div
      className={`
        py-5 transition-colors duration-200
        ${bordered ? "px-5 rounded-lg border border-border/50 bg-muted/30" : "border-b border-border/30 last:border-b-0"}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

interface SettingFieldProps {
  label: string
  description?: string
  children: ReactNode
  error?: string
  characterCount?: { current: number; max: number }
}

export function SettingField({
  label,
  description,
  children,
  error,
  characterCount,
}: SettingFieldProps) {
  const isNearLimit = characterCount && characterCount.current > characterCount.max * 0.8
  const isOverLimit = characterCount && characterCount.current > characterCount.max

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      <div className="flex items-center justify-between">
        {description && !error && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {characterCount && (
          <p
            className={`text-xs ml-auto ${
              isOverLimit
                ? "text-destructive"
                : isNearLimit
                ? "text-amber-500"
                : "text-muted-foreground"
            }`}
          >
            {characterCount.current.toLocaleString()}/{characterCount.max.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}
