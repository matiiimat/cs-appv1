"use client"

import { ReactNode } from "react"
import { useSettings } from "@/lib/settings-context"
import { OnboardingWizard } from "./onboarding-wizard"

interface OnboardingWrapperProps {
  children: ReactNode
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { hasCompletedOnboarding, completeOnboarding, isSettingsLoaded } = useSettings()

  // Don't render anything until settings are loaded to avoid flash
  if (!isSettingsLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // TODO: Remove this override after testing onboarding
  const FORCE_SHOW_ONBOARDING = true

  return (
    <>
      {(FORCE_SHOW_ONBOARDING || !hasCompletedOnboarding) && (
        <OnboardingWizard onComplete={completeOnboarding} />
      )}
      {children}
    </>
  )
}
