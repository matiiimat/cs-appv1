"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

const COOKIE_CONSENT_KEY = "aidly-cookie-consent"

export type CookieConsent = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  timestamp: number
}

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!stored) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1000)
    }
  }, [])

  const saveConsent = (consent: Omit<CookieConsent, "timestamp">) => {
    const consentData: CookieConsent = {
      ...consent,
      timestamp: Date.now(),
    }
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData))

    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent("cookieConsentChanged", { detail: consentData }))

    setShowBanner(false)
  }

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
    })
  }

  const rejectAll = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
    })
  }

  const saveCustom = () => {
    const analytics = (document.getElementById("analytics-consent") as HTMLInputElement)?.checked || false
    const marketing = (document.getElementById("marketing-consent") as HTMLInputElement)?.checked || false

    saveConsent({
      necessary: true,
      analytics,
      marketing,
    })
  }

  if (!showBanner) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0A0A0B] shadow-2xl">
        <div className="p-6">
          {!showDetails ? (
            // Simple view
            <>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  🍪 We use cookies
                </h2>
                <p className="text-sm text-slate-600 dark:text-white/60 leading-relaxed">
                  We use cookies to improve your experience, analyze site traffic, and measure the effectiveness of our ads.
                  You can customize your preferences or accept all cookies.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={acceptAll}
                  className="flex-1 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-[#0A0A0B]"
                >
                  Accept All
                </Button>
                <Button
                  onClick={rejectAll}
                  variant="outline"
                  className="flex-1"
                >
                  Reject Non-Essential
                </Button>
                <Button
                  onClick={() => setShowDetails(true)}
                  variant="ghost"
                  className="flex-1"
                >
                  Customize
                </Button>
              </div>

              <p className="mt-4 text-xs text-center text-slate-500 dark:text-white/40">
                By clicking &quot;Accept All&quot;, you agree to our use of cookies. See our{" "}
                <a href="/cookies" target="_blank" className="underline hover:text-slate-700 dark:hover:text-white/60">
                  Cookie Policy
                </a>{" "}
                and{" "}
                <a href="/privacy" target="_blank" className="underline hover:text-slate-700 dark:hover:text-white/60">
                  Privacy Policy
                </a>
                .
              </p>
            </>
          ) : (
            // Detailed view
            <>
              <div className="mb-4">
                <button
                  onClick={() => setShowDetails(false)}
                  className="mb-3 flex items-center gap-1 text-sm text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Customize Cookie Preferences
                </h2>
              </div>

              <div className="space-y-4 mb-6">
                {/* Necessary cookies - always on */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02]">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm text-slate-900 dark:text-white">Necessary Cookies</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/[0.1] text-slate-600 dark:text-white/60">
                        Always Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-white/60">
                      Essential for authentication, security, and basic site functionality.
                    </p>
                  </div>
                </div>

                {/* Analytics cookies */}
                <label className="flex items-start justify-between gap-4 p-4 rounded-lg border border-slate-200 dark:border-white/[0.08] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm text-slate-900 dark:text-white mb-1">Analytics Cookies</h3>
                    <p className="text-xs text-slate-600 dark:text-white/60">
                      Help us understand how visitors interact with our website (Vercel Analytics).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="analytics-consent"
                    defaultChecked
                    className="mt-0.5 h-5 w-5 rounded border-slate-300 dark:border-white/[0.2] text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </label>

                {/* Marketing cookies */}
                <label className="flex items-start justify-between gap-4 p-4 rounded-lg border border-slate-200 dark:border-white/[0.08] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm text-slate-900 dark:text-white mb-1">Marketing Cookies</h3>
                    <p className="text-xs text-slate-600 dark:text-white/60">
                      Track ad effectiveness and conversions (LinkedIn Insight Tag).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="marketing-consent"
                    defaultChecked
                    className="mt-0.5 h-5 w-5 rounded border-slate-300 dark:border-white/[0.2] text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={saveCustom}
                  className="flex-1 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-[#0A0A0B]"
                >
                  Save Preferences
                </Button>
                <Button
                  onClick={acceptAll}
                  variant="outline"
                  className="flex-1"
                >
                  Accept All
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper function to get current consent
export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null

  const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

// Helper function to check if specific consent is granted
export function hasConsent(type: keyof Omit<CookieConsent, "timestamp">): boolean {
  const consent = getCookieConsent()
  if (!consent) return false
  return consent[type] === true
}
