'use client'

import { ToastProvider } from '@/components/ui/toast'
import { useEffect, useRef } from 'react'

// Declare LinkedIn tracking function
declare global {
  interface Window {
    lintrk?: (event: string, data: { conversion_id: string | number }) => void
  }
}

export function ProtectedLayoutClient({ children }: { children: React.ReactNode }) {
  const hasTrackedConversion = useRef(false)

  useEffect(() => {
    // Track signup conversion once when user first lands in protected area
    if (!hasTrackedConversion.current && window.lintrk) {
      // Check if this is a new signup (not a returning user)
      const isNewSignup = !localStorage.getItem('aidly_signup_tracked')

      if (isNewSignup) {
        // Fire LinkedIn conversion event
        window.lintrk('track', { conversion_id: 9242769 })

        // Mark as tracked so we don't fire again
        localStorage.setItem('aidly_signup_tracked', 'true')
        hasTrackedConversion.current = true

        console.log('[LinkedIn] Signup conversion tracked')
      }
    }
  }, [])

  return <ToastProvider>{children}</ToastProvider>
}
