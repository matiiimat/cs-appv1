"use client"

import { ReactNode } from "react"
import { useSettings } from "@/lib/settings-context"
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
import { OnboardingWizard } from "./onboarding-wizard"

interface OnboardingWrapperProps {
  children: ReactNode
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { isSettingsLoaded, hasCompletedOnboarding, completeOnboarding } = useSettings()

  // Show skeleton while settings are loading
  if (!isSettingsLoaded) {
    return <DashboardSkeleton />
  }

  return (
    <>
      {!hasCompletedOnboarding && (
        <OnboardingWizard onComplete={completeOnboarding} />
      )}
      {children}
    </>
  )
}
