"use client"

import { ReactNode } from "react"

interface SettingCardProps {
  children: ReactNode
  className?: string
}

export function SettingCard({ children, className = "" }: SettingCardProps) {
  return (
    <div
      className={`
        bg-card rounded-xl border border-border/50 p-6
        shadow-sm hover:shadow-md transition-shadow duration-200
        ${className}
      `}
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
