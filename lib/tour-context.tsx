"use client"

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react"
import { driver, type Driver, type DriveStep } from "driver.js"
import "driver.js/dist/driver.css"
import { useSettings } from "./settings-context"

interface TourContextType {
  isTourActive: boolean
  hasCompletedTour: boolean
  startTour: () => Promise<void>
  endTour: () => Promise<void>
  skipTour: () => Promise<void>
}

const TourContext = createContext<TourContextType | undefined>(undefined)

export function useTour() {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error("useTour must be used within a TourProvider")
  }
  return context
}

// Tour step configuration
function createTourSteps(mailbox: string | null): DriveStep[] {
  return [
    {
      popover: {
        title: "Welcome to Aidly! 👋",
        description: "Let's take a quick tour to help you get started. You'll learn how to process customer emails with AI and manage your support queue.",
        side: "over" as const,
        align: "center" as const,
      },
    },
    {
      element: "[data-tour='email-address']",
      popover: {
        title: "Your Support Email",
        description: mailbox
          ? `Forward emails from your support address to: <code>${mailbox}</code>. Any email sent here will appear in your queue.`
          : "Set up email forwarding in Settings to start receiving customer messages.",
        side: "bottom" as const,
        align: "start" as const,
      },
    },
    {
      element: "[data-tour='process-stage']",
      popover: {
        title: "Step 1: Process with AI",
        description: "New messages arrive here first. Click 'Process' to have AI generate draft responses for a batch of messages.",
        side: "bottom" as const,
        align: "center" as const,
      },
    },
    {
      element: "[data-tour='triage-stage']",
      popover: {
        title: "Step 2: Review & Send",
        description: "Once AI has generated responses, they appear here ready for your review. Click 'Start Triage' to review them one by one.",
        side: "bottom" as const,
        align: "center" as const,
      },
    },
    {
      element: "[data-tour='nav-inbox']",
      popover: {
        title: "Inbox for Complex Cases",
        description: "Messages that need more attention can be sent to the Inbox. Here you can edit responses, refine them with AI, and view full conversation history.",
        side: "bottom" as const,
        align: "center" as const,
      },
    },
    {
      element: "[data-tour='nav-settings']",
      popover: {
        title: "Customize Your Workflow",
        description: "Configure your AI settings, brand name, response templates, and integrations in Settings.",
        side: "bottom" as const,
        align: "center" as const,
      },
    },
    {
      popover: {
        title: "You're all set! 🎉",
        description: "You now know the basics of Aidly. Start by forwarding an email to your support address to see it in action!",
        side: "over" as const,
        align: "center" as const,
      },
    },
  ]
}

interface TourProviderProps {
  children: ReactNode
}

export function TourProvider({ children }: TourProviderProps) {
  const { settings, updateSettings } = useSettings()
  const [isTourActive, setIsTourActive] = useState(false)
  const [hasCompletedTour, setHasCompletedTour] = useState(settings.hasCompletedTour ?? false)
  const driverRef = useRef<Driver | null>(null)
  const mailboxRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Load mailbox address
  const loadMailbox = useCallback(async () => {
    if (mailboxRef.current) return mailboxRef.current
    try {
      const resp = await fetch("/api/organization/mailbox")
      if (resp.ok) {
        const data = await resp.json()
        if (data?.forwardToAddress) {
          mailboxRef.current = data.forwardToAddress
          return data.forwardToAddress
        }
      }
    } catch {
      // ignore
    }
    return null
  }, [])

  // Mark tour as completed - uses dedicated endpoint to avoid race conditions
  const markTourCompleted = useCallback(async () => {
    setHasCompletedTour(true)
    updateSettings({ hasCompletedTour: true })

    // Save to database via dedicated endpoint (fire and forget, errors logged server-side)
    fetch("/api/organization/tour-completed", { method: "POST" }).catch(() => {
      // Silently ignore - tour completion is also tracked in local state
    })
  }, [updateSettings])

  // Start the product tour
  const startTour = useCallback(async () => {
    if (isTourActive) return

    setIsTourActive(true)

    // Load mailbox address
    const mailbox = await loadMailbox()

    // Check if component is still mounted
    if (!mountedRef.current) {
      return
    }

    // Initialize driver.js
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      stagePadding: 10,
      stageRadius: 8,
      popoverClass: "aidly-tour-popover",
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Done",
      onHighlightStarted: (_element, step) => {
        // Skip steps where the target element doesn't exist (e.g., user on different page)
        const selector = step?.element as string | undefined
        if (selector && !document.querySelector(selector)) {
          driverObj.moveNext()
        }
      },
      onDestroyStarted: async () => {
        await markTourCompleted()
        setIsTourActive(false)
        driverRef.current = null
        driverObj.destroy()
      },
      steps: createTourSteps(mailbox),
    })

    driverRef.current = driverObj
    driverObj.drive()
  }, [isTourActive, loadMailbox, markTourCompleted])

  // End the tour (called when user clicks Done)
  const endTour = useCallback(async () => {
    if (driverRef.current) {
      driverRef.current.destroy()
    }
  }, [])

  // Skip the tour without completing it
  const skipTour = useCallback(async () => {
    await markTourCompleted()
    setIsTourActive(false)
    if (driverRef.current) {
      driverRef.current.destroy()
      driverRef.current = null
    }
  }, [markTourCompleted])

  // Sync hasCompletedTour from settings when settings change
  // This handles the initial load from database
  useEffect(() => {
    const settingsCompletedTour = settings.hasCompletedTour ?? false
    if (settingsCompletedTour && !hasCompletedTour) {
      setHasCompletedTour(true)
    }
  }, [settings.hasCompletedTour, hasCompletedTour])

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        hasCompletedTour,
        startTour,
        endTour,
        skipTour,
      }}
    >
      {children}
    </TourContext.Provider>
  )
}
