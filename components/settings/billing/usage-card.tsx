"use client"

import { Progress } from "@/components/ui/progress"
import { Calendar } from "lucide-react"

function formatResetDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 7) return `in ${diffDays} days`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(0)}K`
  }
  return num.toLocaleString()
}

interface UsageCardProps {
  title: string
  icon: React.ReactNode
  used: number
  limit: number | null
  resetsAt: string | null
  isAtLimit: boolean
  isNearLimit: boolean
  isFreePlan?: boolean
}

export function UsageCard({
  title,
  icon,
  used,
  limit,
  resetsAt,
  isAtLimit,
  isNearLimit,
  isFreePlan,
}: UsageCardProps) {
  // Unlimited
  if (limit === null) {
    return (
      <div className="p-4 rounded-lg border border-border/30 bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium">{title}</span>
          </div>
          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
            Unlimited
          </span>
        </div>
        <div className="text-2xl font-bold">{formatNumber(used)}</div>
        <p className="text-xs text-muted-foreground mt-1">used this period</p>
      </div>
    )
  }

  const percentage = Math.min(100, (used / limit) * 100)
  const remaining = Math.max(0, limit - used)

  return (
    <div className="p-4 rounded-lg border border-border/30 bg-muted/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {isAtLimit && (
          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full font-medium">
            Limit Reached
          </span>
        )}
        {!isAtLimit && isNearLimit && (
          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full font-medium">
            Almost Full
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold">{formatNumber(used)}</span>
        <span className="text-sm text-muted-foreground">/ {formatNumber(limit)}</span>
      </div>

      <Progress
        value={percentage}
        className={`h-2 mb-3 ${
          isAtLimit
            ? '[&>div]:bg-red-500'
            : isNearLimit
            ? '[&>div]:bg-yellow-500'
            : ''
        }`}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatNumber(remaining)} remaining</span>
        {resetsAt ? (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Resets {formatResetDate(resetsAt)}
          </span>
        ) : isFreePlan ? (
          <span className="text-yellow-600 dark:text-yellow-400">One-time limit</span>
        ) : null}
      </div>
    </div>
  )
}
