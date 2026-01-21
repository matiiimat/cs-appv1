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
    // Check if this is a new signup (not a returning user)
    const isNewSignup = !localStorage.getItem('aidly_signup_tracked')

    if (!isNewSignup) {
      console.log('[LinkedIn] Signup already tracked previously')
      return
    }

    if (hasTrackedConversion.current) {
      console.log('[LinkedIn] Conversion already fired in this session')
      return
    }

    // Function to attempt tracking
    const attemptTracking = () => {
      if (window.lintrk) {
        console.log('[LinkedIn] Firing conversion event...')

        try {
          window.lintrk('track', { conversion_id: 25541297 })

          // Mark as tracked so we don't fire again
          localStorage.setItem('aidly_signup_tracked', 'true')
          hasTrackedConversion.current = true

          console.log('[LinkedIn] ✓ Signup conversion tracked successfully')
        } catch (error) {
          console.error('[LinkedIn] Error firing conversion:', error)
        }
      } else {
        console.log('[LinkedIn] Script not loaded yet, waiting...')
      }
    }

    // Try immediately
    attemptTracking()

    // If it didn't work, retry every 500ms for up to 5 seconds
    if (!hasTrackedConversion.current) {
      const maxRetries = 10
      let retries = 0

      const interval = setInterval(() => {
        retries++

        if (hasTrackedConversion.current) {
          clearInterval(interval)
          return
        }

        if (retries >= maxRetries) {
          console.warn('[LinkedIn] Gave up waiting for lintrk script after 5 seconds')
          clearInterval(interval)
          return
        }

        attemptTracking()
      }, 500)

      return () => clearInterval(interval)
    }
  }, [])

  return <ToastProvider>{children}</ToastProvider>
}
