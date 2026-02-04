"use client"

import { ReactNode, useEffect, useRef } from "react"
import { useSettings } from "@/lib/settings-context"
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
import { OnboardingWizard } from "./onboarding-wizard"
import { TourProvider, useTour } from "@/lib/tour-context"

interface OnboardingWrapperProps {
  children: ReactNode
}

function OnboardingContent({ children }: OnboardingWrapperProps) {
  const { isSettingsLoaded, hasCompletedOnboarding, completeOnboarding } = useSettings()
  const { startTour, hasCompletedTour } = useTour()
  const tourStartedRef = useRef(false)

  // Auto-start tour after onboarding wizard completes
  useEffect(() => {
    if (
      isSettingsLoaded &&
      hasCompletedOnboarding &&
      !hasCompletedTour &&
      !tourStartedRef.current
    ) {
      tourStartedRef.current = true
      // Small delay to ensure the app is fully rendered
      const timer = setTimeout(() => {
        startTour()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [isSettingsLoaded, hasCompletedOnboarding, hasCompletedTour, startTour])

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

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  return (
    <TourProvider>
      <OnboardingContent>{children}</OnboardingContent>
    </TourProvider>
  )
}
