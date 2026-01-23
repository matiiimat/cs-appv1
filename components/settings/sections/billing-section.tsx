"use client"

import { useState, useEffect } from "react"
import { SectionHeader } from "../section-header"
import { SettingCard } from "../setting-card"
import { UsageCard } from "../billing/usage-card"
import { InvoiceList } from "../billing/invoice-list"
import { PlanComparison } from "../billing/plan-card"
import { Button } from "@/components/ui/button"
import {
  Mail,
  Zap,
  CreditCard,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  Crown,
} from "lucide-react"

interface PlanData {
  planType: string
  planStatus: string
  isManaged: boolean
  tokenUsage: {
    used: number
    limit: number | null
    remaining: number | null
    isAtLimit: boolean
    isNearLimit: boolean
    resetsAt: string | null
  } | null
  emailUsage: {
    used: number
    limit: number | null
    remaining: number | null
    isAtLimit: boolean
    isNearLimit: boolean
    resetsAt: string | null
    isFreePlan: boolean
  }
}

interface BillingStatus {
  isActive: boolean
  willCancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  canResume: boolean
}

interface Invoice {
  id: string
  date: string
  amount: number
  status: string
  invoice_pdf: string | null
  description: string | null
}

function getPlanDisplayName(planType: string): string {
  switch (planType) {
    case 'free':
      return 'Free'
    case 'plus':
      return 'Plus'
    case 'pro':
      return 'Pro'
    case 'enterprise':
      return 'Enterprise'
    default:
      return planType.charAt(0).toUpperCase() + planType.slice(1)
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function BillingSection() {
  const [planData, setPlanData] = useState<PlanData | null>(null)
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action states
  const [isCancelling, setIsCancelling] = useState(false)
  const [isResuming, setIsResuming] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [upgradingPlan, setUpgradingPlan] = useState<'plus' | 'pro' | null>(null)
  const [isOpeningPortal, setIsOpeningPortal] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch plan and billing status in parallel
        const [planRes, billingRes] = await Promise.all([
          fetch('/api/organization/plan'),
          fetch('/api/billing/status'),
        ])

        if (planRes.ok) {
          const data = await planRes.json()
          setPlanData(data)
        } else {
          throw new Error('Failed to fetch plan data')
        }

        if (billingRes.ok) {
          const data = await billingRes.json()
          setBillingStatus(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load billing data')
      } finally {
        setIsLoading(false)
      }
    }

    const fetchInvoices = async () => {
      setInvoicesLoading(true)
      try {
        const res = await fetch('/api/billing/invoices')
        if (res.ok) {
          const data = await res.json()
          setInvoices(data.invoices || [])
        }
      } catch {
        // Silently fail - invoices are not critical
      } finally {
        setInvoicesLoading(false)
      }
    }

    fetchData()
    fetchInvoices()
  }, [])

  const handleUpgrade = async (plan: 'plus' | 'pro') => {
    setIsUpgrading(true)
    setUpgradingPlan(plan)
    setActionError(null)

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, annual: false }),
      })

      if (!res.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await res.json()
      if (data.url) {
        // Reset state before navigation (in case user clicks back)
        setIsUpgrading(false)
        setUpgradingPlan(null)
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start upgrade')
      setIsUpgrading(false)
      setUpgradingPlan(null)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return
    }

    setIsCancelling(true)
    setActionError(null)

    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })

      if (!res.ok) {
        throw new Error('Failed to cancel subscription')
      }

      const data = await res.json()
      setBillingStatus(data)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel subscription')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleResume = async () => {
    setIsResuming(true)
    setActionError(null)

    try {
      const res = await fetch('/api/billing/resume', { method: 'POST' })

      if (!res.ok) {
        throw new Error('Failed to resume subscription')
      }

      const data = await res.json()
      setBillingStatus(data)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to resume subscription')
    } finally {
      setIsResuming(false)
    }
  }

  const handleOpenPortal = async () => {
    setIsOpeningPortal(true)
    setActionError(null)

    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      })

      if (!res.ok) {
        throw new Error('Failed to open billing portal')
      }

      const data = await res.json()
      if (data.url) {
        // Reset state before navigation (in case user clicks back)
        setIsOpeningPortal(false)
        window.location.href = data.url
      } else {
        throw new Error('No portal URL received')
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to open billing portal')
      setIsOpeningPortal(false)
    }
  }

  if (isLoading) {
    return (
      <div>
        <SectionHeader
          title="Billing"
          description="Manage your subscription and view usage"
        />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="py-5 border-b border-border/30 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-muted rounded-lg" />
                <div className="flex-1">
                  <div className="h-5 w-1/3 bg-muted rounded mb-2" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !planData) {
    return (
      <div>
        <SectionHeader
          title="Billing"
          description="Manage your subscription and view usage"
        />
        <SettingCard bordered>
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <span>{error || 'Failed to load billing data'}</span>
          </div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </SettingCard>
      </div>
    )
  }

  const isFreePlan = planData.planType === 'free'
  const isPaidPlan = ['plus', 'pro', 'enterprise'].includes(planData.planType)
  const showCancelButton = isPaidPlan && billingStatus?.isActive && !billingStatus?.willCancelAtPeriodEnd
  const showResumeButton = billingStatus?.canResume

  return (
    <div>
      <SectionHeader
        title="Billing"
        description="Manage your subscription and view usage"
      />

      <div className="space-y-6">
        {/* Current Plan Card */}
        <SettingCard bordered>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">
                    {getPlanDisplayName(planData.planType)} Plan
                  </h3>
                  {billingStatus?.isActive && (
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
                      Active
                    </span>
                  )}
                  {billingStatus?.willCancelAtPeriodEnd && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                      Cancels Soon
                    </span>
                  )}
                </div>
                {billingStatus?.currentPeriodEnd && isPaidPlan && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {billingStatus.willCancelAtPeriodEnd
                      ? `Access until ${formatDate(billingStatus.currentPeriodEnd)}`
                      : `Renews ${formatDate(billingStatus.currentPeriodEnd)}`}
                  </p>
                )}
                {isFreePlan && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Limited to {planData.emailUsage.limit} emails (one-time)
                  </p>
                )}
              </div>
            </div>
            {isPaidPlan && billingStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPortal}
                disabled={isOpeningPortal}
              >
                {isOpeningPortal ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Manage Payment
              </Button>
            )}
          </div>
        </SettingCard>

        {/* Usage Stats */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Usage This Period</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <UsageCard
              title="Emails"
              icon={<Mail className="w-4 h-4 text-muted-foreground" />}
              used={planData.emailUsage.used}
              limit={planData.emailUsage.limit}
              resetsAt={planData.emailUsage.resetsAt}
              isAtLimit={planData.emailUsage.isAtLimit}
              isNearLimit={planData.emailUsage.isNearLimit}
              isFreePlan={planData.emailUsage.isFreePlan}
            />
            {planData.isManaged && planData.tokenUsage && (
              <UsageCard
                title="AI Tokens"
                icon={<Zap className="w-4 h-4 text-muted-foreground" />}
                used={planData.tokenUsage.used}
                limit={planData.tokenUsage.limit}
                resetsAt={planData.tokenUsage.resetsAt}
                isAtLimit={planData.tokenUsage.isAtLimit}
                isNearLimit={planData.tokenUsage.isNearLimit}
              />
            )}
          </div>
        </div>

        {/* Upgrade Section (for Free and Plus users) */}
        {(isFreePlan || planData.planType === 'plus') && (
          <SettingCard bordered>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#3872B9] via-[#B33275] to-[#F38135] rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {isFreePlan ? 'Upgrade Your Plan' : 'Need More Power?'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isFreePlan
                    ? 'Get more emails and AI-powered support'
                    : 'Switch to Pro for unlimited AI with your own keys'}
                </p>
              </div>
            </div>
            <PlanComparison
              currentPlan={planData.planType}
              onUpgrade={handleUpgrade}
              isLoading={isUpgrading}
              loadingPlan={upgradingPlan}
            />
          </SettingCard>
        )}

        {/* Subscription Management */}
        {isPaidPlan && (showCancelButton || showResumeButton) && (
          <SettingCard bordered>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-muted/50 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Subscription</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your subscription status
                </p>
              </div>
            </div>

            {showResumeButton && (
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                  <span className="text-sm">
                    Your subscription is set to cancel on {formatDate(billingStatus?.currentPeriodEnd || null)}
                  </span>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleResume}
                  disabled={isResuming}
                >
                  {isResuming ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Resume Subscription
                </Button>
              </div>
            )}

            {showCancelButton && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Cancel Subscription
              </Button>
            )}
          </SettingCard>
        )}

        {/* Invoice History */}
        {isPaidPlan && (
          <SettingCard bordered>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-muted/50 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Invoice History</h3>
                <p className="text-sm text-muted-foreground">
                  Download past invoices
                </p>
              </div>
            </div>
            <InvoiceList invoices={invoices} isLoading={invoicesLoading} />
          </SettingCard>
        )}

        {/* Action Error */}
        {actionError && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{actionError}</span>
          </div>
        )}
      </div>
    </div>
  )
}
