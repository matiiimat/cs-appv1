"use client"

import { useEffect, useCallback, useRef, useState } from "react"

type ViewMode = "queue" | "inbox" | "settings"

interface KeyboardNavigationOptions {
  onNavigate: (view: ViewMode) => void
  onOpenCommandPalette: () => void
  currentView?: ViewMode
  // Triage-specific actions
  onTriageApprove?: () => void
  onTriageReview?: () => void
  onTriageQuickEdit?: () => void
  isInTriageMode?: boolean
}

export function useKeyboardNavigation({
  onNavigate,
  onOpenCommandPalette,
  onTriageApprove,
  onTriageReview,
  onTriageQuickEdit,
  isInTriageMode = false,
}: KeyboardNavigationOptions) {
  // Track 'g' key press for two-key navigation (g then q/i/k/s)
  const pendingGotoRef = useRef(false)
  const gotoTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null)

  const clearPendingGoto = useCallback(() => {
    pendingGotoRef.current = false
    if (gotoTimeoutRef.current) {
      clearTimeout(gotoTimeoutRef.current)
      gotoTimeoutRef.current = null
    }
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle if in input field
    const target = e.target as HTMLElement
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return
    }

    // Command palette: Cmd+K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault()
      onOpenCommandPalette()
      clearPendingGoto()
      return
    }

    const key = e.key.toLowerCase()

    // Two-key navigation: g then q/i/k/s
    if (pendingGotoRef.current) {
      clearPendingGoto()
      switch (key) {
        case "q":
          e.preventDefault()
          onNavigate("queue")
          return
        case "i":
          e.preventDefault()
          onNavigate("inbox")
          return
        case "s":
          e.preventDefault()
          onNavigate("settings")
          return
      }
    }

    // Start goto sequence
    if (key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      pendingGotoRef.current = true
      setLastKeyPressed("g")
      // Clear after 1.5 seconds if no follow-up key
      gotoTimeoutRef.current = setTimeout(() => {
        clearPendingGoto()
        setLastKeyPressed(null)
      }, 1500)
      return
    }

    // Triage mode keyboard shortcuts
    if (isInTriageMode) {
      switch (key) {
        case " ": // Space
        case "arrowright":
          if (onTriageApprove) {
            e.preventDefault()
            onTriageApprove()
          }
          return
        case "arrowleft":
        case "r":
          if (onTriageReview) {
            e.preventDefault()
            onTriageReview()
          }
          return
        case "e":
          if (onTriageQuickEdit) {
            e.preventDefault()
            onTriageQuickEdit()
          }
          return
      }
    }

    // Clear last key after a delay
    setLastKeyPressed(key)
    setTimeout(() => setLastKeyPressed(null), 500)
  }, [
    onNavigate,
    onOpenCommandPalette,
    clearPendingGoto,
    isInTriageMode,
    onTriageApprove,
    onTriageReview,
    onTriageQuickEdit,
  ])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      clearPendingGoto()
    }
  }, [handleKeyDown, clearPendingGoto])

  return {
    lastKeyPressed,
    isPendingGoto: pendingGotoRef.current,
  }
}
