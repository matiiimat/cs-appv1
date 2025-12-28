"use client"

import { useUsage } from "@/lib/usage-context"
import { Progress } from "@/components/ui/progress"
import { Mail, Zap, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

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

export function UsageWidget() {
  const { usage, isLoading } = useUsage()

  if (isLoading) {
    return (
      <div className="surface p-4 rounded-lg animate-pulse">
        <div className="h-4 bg-muted rounded w-1/2 mb-4" />
        <div className="h-8 bg-muted rounded w-1/3 mb-2" />
        <div className="h-2 bg-muted rounded" />
      </div>
    )
  }

  if (!usage) {
    return null
  }

  // Unlimited plan (enterprise)
  if (usage.limit === null) {
    return (
      <div className="surface p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Email Usage</span>
          </div>
          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
            Unlimited
          </span>
        </div>
        <div className="text-2xl font-bold mb-2">{usage.used}</div>
        <p className="text-xs text-muted-foreground">emails sent this period</p>
      </div>
    )
  }

  const percentage = Math.min(100, (usage.used / usage.limit) * 100)

  return (
    <div className="surface p-4 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Email Usage</span>
        </div>
        {usage.isAtLimit && (
          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full font-medium">
            Limit Reached
          </span>
        )}
        {!usage.isAtLimit && usage.isNearLimit && (
          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full font-medium">
            Almost Full
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-2xl font-bold">{usage.used}</span>
        <span className="text-sm text-muted-foreground">/ {usage.limit}</span>
      </div>

      <Progress
        value={percentage}
        className={`h-2 mb-2 ${
          usage.isAtLimit
            ? '[&>div]:bg-red-500'
            : usage.isNearLimit
            ? '[&>div]:bg-yellow-500'
            : ''
        }`}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{usage.remaining} remaining</span>
        {usage.resetsAt ? (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Resets {formatResetDate(usage.resetsAt)}
          </span>
        ) : (
          <span className="text-yellow-600 dark:text-yellow-400">No reset (Free plan)</span>
        )}
      </div>

      {usage.isAtLimit && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">
            {usage.isFreePlan
              ? "Upgrade to Plus for 5,000 emails/month with AI included."
              : "Need more emails? Upgrade your plan."}
          </p>
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('aidly:navigate:billing'))
            }}
          >
            <Zap className="w-4 h-4 mr-2" />
            {usage.isFreePlan ? "Upgrade to Plus" : "Upgrade Plan"}
          </Button>
        </div>
      )}

      {usage.isFreePlan && !usage.isAtLimit && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">
            Free plan: {usage.remaining} emails left (one-time limit)
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('aidly:navigate:billing'))
            }}
          >
            <Zap className="w-4 h-4 mr-2" />
            Upgrade to Plus — $249/mo
          </Button>
        </div>
      )}
    </div>
  )
}
