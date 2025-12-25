"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export interface UsageInfo {
  planType: string
  limit: number | null
  used: number
  remaining: number | null
  isAtLimit: boolean
  isNearLimit: boolean
  resetsAt: string | null
  isFreePlan: boolean
}

interface UsageContextType {
  usage: UsageInfo | null
  isLoading: boolean
  error: string | null
  refreshUsage: () => Promise<void>
  canSendEmail: boolean
}

const UsageContext = createContext<UsageContextType | undefined>(undefined)

export function UsageProvider({ children }: { children: ReactNode }) {
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshUsage = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/usage')

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated yet, that's ok
          setUsage(null)
          return
        }
        throw new Error('Failed to fetch usage')
      }

      const data = await response.json()
      setUsage(data.usage)
    } catch (err) {
      console.error('Error fetching usage:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    refreshUsage()
  }, [refreshUsage])

  // Refresh periodically (every 60 seconds) to keep UI in sync
  useEffect(() => {
    const interval = setInterval(refreshUsage, 60000)
    return () => clearInterval(interval)
  }, [refreshUsage])

  // Derive canSendEmail from usage state
  // Default to true if no usage data (fail open for UX, API will still enforce)
  const canSendEmail = usage ? !usage.isAtLimit : true

  return (
    <UsageContext.Provider
      value={{
        usage,
        isLoading,
        error,
        refreshUsage,
        canSendEmail,
      }}
    >
      {children}
    </UsageContext.Provider>
  )
}

export function useUsage() {
  const context = useContext(UsageContext)
  if (context === undefined) {
    throw new Error("useUsage must be used within a UsageProvider")
  }
  return context
}
