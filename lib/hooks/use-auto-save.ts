"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

interface UseAutoSaveOptions<T> {
  /** The current data to track */
  data: T
  /** Function to save the data */
  onSave: () => Promise<void>
  /** Debounce delay in ms (default: 1000) */
  debounceMs?: number
  /** How long to show "saved" status before returning to idle (default: 2000) */
  savedDisplayMs?: number
  /** Keys to track for changes (if not provided, tracks entire object) */
  trackKeys?: (keyof T)[]
}

interface UseAutoSaveReturn {
  /** Current save status */
  status: SaveStatus
  /** Whether there are unsaved changes */
  hasChanges: boolean
  /** Manually trigger a save */
  save: () => Promise<void>
  /** Reset the snapshot to current data (useful after external updates) */
  resetSnapshot: () => void
}

export function useAutoSave<T extends Record<string, unknown>>({
  data,
  onSave,
  debounceMs = 1000,
  savedDisplayMs = 2000,
  trackKeys,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<SaveStatus>("idle")
  const [initialSnapshot, setInitialSnapshot] = useState<string>("")
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(false)

  // Create a snapshot of the tracked data
  const createSnapshot = useCallback((d: T): string => {
    if (trackKeys && trackKeys.length > 0) {
      const tracked: Partial<T> = {}
      for (const key of trackKeys) {
        tracked[key] = d[key]
      }
      return JSON.stringify(tracked)
    }
    return JSON.stringify(d)
  }, [trackKeys])

  // Current snapshot for comparison
  const currentSnapshot = useMemo(() => createSnapshot(data), [data, createSnapshot])

  // Initialize snapshot on mount
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true
      setInitialSnapshot(currentSnapshot)
    }
  }, [currentSnapshot])

  // Check if there are changes
  const hasChanges = useMemo(() => {
    if (!initialSnapshot) return false
    return currentSnapshot !== initialSnapshot
  }, [currentSnapshot, initialSnapshot])

  // Save function
  const save = useCallback(async () => {
    if (status === "saving") return

    setStatus("saving")

    try {
      await onSave()
      setInitialSnapshot(currentSnapshot)
      setStatus("saved")

      // Clear any existing saved timer
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current)
      }

      // Return to idle after display time
      savedTimerRef.current = setTimeout(() => {
        setStatus("idle")
      }, savedDisplayMs)
    } catch {
      setStatus("error")
      // Return to idle after showing error
      setTimeout(() => setStatus("idle"), 3000)
    }
  }, [onSave, currentSnapshot, savedDisplayMs, status])

  // Auto-save when changes are detected
  useEffect(() => {
    if (!hasChanges || !isMountedRef.current) return

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      save()
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [hasChanges, save, debounceMs])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current)
      }
    }
  }, [])

  // Reset snapshot function
  const resetSnapshot = useCallback(() => {
    setInitialSnapshot(currentSnapshot)
    setStatus("idle")
  }, [currentSnapshot])

  return {
    status,
    hasChanges,
    save,
    resetSnapshot,
  }
}
