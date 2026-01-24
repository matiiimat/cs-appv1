"use client"

import { useUsage } from "@/lib/usage-context"
import { Progress } from "@/components/ui/progress"
import { Zap, Calendar, AlertTriangle } from "lucide-react"
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
      <div className="animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
        <div className="h-6 bg-muted rounded w-1/4" />
      </div>
    )
  }

  if (!usage) {
    return null
  }

  // Unlimited plan (enterprise) - minimal display
  if (usage.limit === null) {
    return (
      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Email Usage
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">{usage.used}</span>
          <span className="text-xs text-primary">Unlimited</span>
        </div>
      </div>
    )
  }

  const percentage = Math.min(100, (usage.used / usage.limit) * 100)
  const isLowUsage = percentage < 50
  const isMediumUsage = percentage >= 50 && !usage.isNearLimit && !usage.isAtLimit

  // Low usage - minimal display
  if (isLowUsage && !usage.isFreePlan) {
    return (
      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Email Usage
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-semibold tabular-nums">{usage.used}</span>
          <span className="text-sm text-muted-foreground">/ {usage.limit}</span>
        </div>
        <Progress value={percentage} className="h-1 mb-2" />
        <div className="text-xs text-muted-foreground">
          {usage.resetsAt && `Resets ${formatResetDate(usage.resetsAt)}`}
        </div>
      </div>
    )
  }

  // Medium usage - slightly more visible
  if (isMediumUsage && !usage.isFreePlan) {
    return (
      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Email Usage
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-semibold tabular-nums">{usage.used}</span>
          <span className="text-sm text-muted-foreground">/ {usage.limit}</span>
        </div>
        <Progress value={percentage} className="h-1.5 mb-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{usage.remaining} remaining</span>
          {usage.resetsAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Resets {formatResetDate(usage.resetsAt)}
            </span>
          )}
        </div>
      </div>
    )
  }

  // Near limit - amber accent, more prominent
  if (usage.isNearLimit && !usage.isAtLimit) {
    return (
      <div className="pl-4 border-l-2 border-amber-500">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-amber-500 uppercase tracking-wider">
            Email Usage
          </span>
          <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded font-medium">
            Almost Full
          </span>
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-semibold tabular-nums">{usage.used}</span>
          <span className="text-sm text-muted-foreground">/ {usage.limit}</span>
        </div>
        <Progress value={percentage} className="h-2 mb-2 [&>div]:bg-amber-500" />
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-500 font-medium">{usage.remaining} remaining</span>
          {usage.resetsAt && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Resets {formatResetDate(usage.resetsAt)}
            </span>
          )}
        </div>
      </div>
    )
  }

  // At limit - red accent, upgrade CTA prominent
  if (usage.isAtLimit) {
    return (
      <div className="pl-4 border-l-2 border-red-500 bg-red-500/5 -ml-4 pl-8 -mr-4 pr-4 py-4 rounded-r-lg">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium text-red-500">
            Email limit reached
          </span>
        </div>
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-2xl font-semibold tabular-nums">{usage.used}</span>
          <span className="text-sm text-muted-foreground">/ {usage.limit}</span>
        </div>
        <Progress value={100} className="h-2 mb-3 [&>div]:bg-red-500" />

        <p className="text-xs text-muted-foreground mb-3">
          {usage.isFreePlan
            ? "Upgrade to Plus for 5,000 emails/month with AI included."
            : usage.resetsAt
              ? `Your quota resets ${formatResetDate(usage.resetsAt)}. Need more now?`
              : "Need more emails? Upgrade your plan."}
        </p>
        <Button
          size="sm"
          className="w-full bg-red-600 hover:bg-red-500"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('aidly:navigate:billing'))
          }}
        >
          <Zap className="w-4 h-4 mr-2" />
          {usage.isFreePlan ? "Upgrade to Plus" : "Upgrade Plan"}
        </Button>
      </div>
    )
  }

  // Free plan (not at limit) - show upgrade prompt subtly
  if (usage.isFreePlan) {
    return (
      <div className="pl-4 border-l-2 border-primary/30">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Free Plan Usage
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-semibold tabular-nums">{usage.used}</span>
          <span className="text-sm text-muted-foreground">/ {usage.limit}</span>
        </div>
        <Progress value={percentage} className="h-1.5 mb-2" />
        <p className="text-xs text-muted-foreground mb-3">
          {usage.remaining} emails left (one-time limit, no reset)
        </p>
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('aidly:navigate:billing'))
          }}
        >
          <Zap className="w-3.5 h-3.5 mr-1.5" />
          Upgrade to Plus — $249/mo
        </Button>
      </div>
    )
  }

  // Fallback (shouldn't reach here)
  return null
}
