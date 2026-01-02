"use client"

import { Check, Zap, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PlanCardProps {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  isCurrent: boolean
  isPopular?: boolean
  onUpgrade?: () => void
  isLoading?: boolean
  disabled?: boolean
}

export function PlanCard({
  name,
  price,
  period,
  description,
  features,
  isCurrent,
  isPopular,
  onUpgrade,
  isLoading,
  disabled,
}: PlanCardProps) {
  return (
    <div
      className={`
        relative bg-card rounded-xl border p-5
        ${isPopular ? 'border-primary shadow-lg' : 'border-border/50'}
        ${isCurrent ? 'ring-2 ring-primary/20' : ''}
      `}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-[#3872B9] via-[#B33275] to-[#F38135] text-white text-xs font-medium px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
            Current Plan
          </span>
        </div>
      )}

      <div className="mb-4 pt-2">
        <h3 className="text-lg font-bold">{name}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold">{price}</span>
        <span className="text-sm text-muted-foreground">/{period}</span>
      </div>

      <ul className="space-y-2 mb-5">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {!isCurrent && onUpgrade && (
        <Button
          className="w-full"
          onClick={onUpgrade}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Upgrade to {name}
            </>
          )}
        </Button>
      )}

      {isCurrent && (
        <div className="text-center text-sm text-muted-foreground py-2">
          You&apos;re on this plan
        </div>
      )}
    </div>
  )
}

interface PlanComparisonProps {
  currentPlan: string
  onUpgrade: (plan: 'plus' | 'pro') => void
  isLoading?: boolean
  loadingPlan?: 'plus' | 'pro' | null
}

export function PlanComparison({ currentPlan, onUpgrade, isLoading, loadingPlan }: PlanComparisonProps) {
  const plans = [
    {
      id: 'plus' as const,
      name: 'Plus',
      price: '$249',
      period: 'month',
      description: 'All-inclusive AI support',
      features: [
        '5,000 emails per month',
        'AI included (Claude)',
        '10M tokens per month',
        'Priority support',
        'Custom branding',
      ],
      isPopular: true,
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: '$199',
      period: 'month',
      description: 'Bring your own AI keys',
      features: [
        '1,000 emails per month',
        'Use your own API keys',
        'Unlimited AI tokens',
        'All integrations',
        'Advanced analytics',
      ],
      isPopular: false,
    },
  ]

  // Filter out current plan and plans below current
  const upgradePlans = plans.filter((plan) => {
    if (currentPlan === 'plus') return plan.id === 'pro'
    if (currentPlan === 'pro') return false
    return true // Free users see both
  })

  if (upgradePlans.length === 0) {
    return null
  }

  return (
    <div className={`grid gap-4 ${upgradePlans.length === 2 ? 'md:grid-cols-2' : 'max-w-md'}`}>
      {upgradePlans.map((plan) => (
        <PlanCard
          key={plan.id}
          name={plan.name}
          price={plan.price}
          period={plan.period}
          description={plan.description}
          features={plan.features}
          isCurrent={currentPlan === plan.id}
          isPopular={plan.isPopular && currentPlan === 'free'}
          onUpgrade={() => onUpgrade(plan.id)}
          isLoading={isLoading && loadingPlan === plan.id}
          disabled={isLoading}
        />
      ))}
    </div>
  )
}
