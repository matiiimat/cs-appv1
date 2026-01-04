"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export interface UserInfo {
  id: string
  email: string
  name: string
  role: string
  organizationId: string
}

interface UserContextType {
  user: UserInfo | null
  isLoading: boolean
  error: string | null
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshUser = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/me')

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated yet, that's ok
          setUser(null)
          return
        }
        throw new Error('Failed to fetch user')
      }

      const data = await response.json()
      setUser(data.user)
    } catch (err) {
      console.error('Error fetching user:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        error,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
