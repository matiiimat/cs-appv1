"use client"

import { ReactNode } from "react"
import { useSettings } from "@/lib/settings-context"
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
// import { OnboardingWizard } from "./onboarding-wizard"

interface OnboardingWrapperProps {
  children: ReactNode
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { isSettingsLoaded } = useSettings()

  // Show skeleton while settings are loading
  if (!isSettingsLoaded) {
    return <DashboardSkeleton />
  }

// For testing: shows onboarding unless already completed. Clear localStorage to test again.
//   const FORCE_SHOW_ONBOARDING = typeof window !== 'undefined' && localStorage.getItem('aidly-onboarding-completed') !== 'true'

//   return (
//     <>
//       {(FORCE_SHOW_ONBOARDING || !hasCompletedOnboarding) && (
//         <OnboardingWizard onComplete={completeOnboarding} />
//       )}
//       {children}
//     </>
//   )
// }

// NO FORCED ONBOARDING 
return (
    <>
      {children}
    </>
  )
}
