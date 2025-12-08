"use client"

import { useCallback } from "react"
import { useToast } from "@/components/ui/toast"

interface AIErrorOptions {
  onNavigateToSettings?: () => void
}

export function useAIErrorHandler(options: AIErrorOptions = {}) {
  const { addToast } = useToast()

  const navigateToSettings = useCallback(() => {
    if (options.onNavigateToSettings) {
      options.onNavigateToSettings()
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aidly:navigate:settings"))
    }
  }, [options])

  const handleAIError = useCallback(
    (error: unknown, context?: string) => {
      // Parse error message
      let errorMessage = "An error occurred"
      let isAuthError = false

      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      } else if (error && typeof error === "object") {
        const errObj = error as Record<string, unknown>
        if (errObj.message) errorMessage = String(errObj.message)
        if (errObj.error) errorMessage = String(errObj.error)
      }

      // Check for auth/API key errors
      const lowerMessage = errorMessage.toLowerCase()
      if (
        lowerMessage.includes("401") ||
        lowerMessage.includes("unauthorized") ||
        lowerMessage.includes("invalid") && lowerMessage.includes("key") ||
        lowerMessage.includes("api key") ||
        lowerMessage.includes("authentication")
      ) {
        isAuthError = true
      }

      // Show appropriate toast
      if (isAuthError) {
        addToast({
          type: "error",
          title: "Invalid API Key",
          message: "Please check your AI provider configuration",
          duration: 8000,
          action: {
            label: "Go to Settings",
            onClick: navigateToSettings,
          },
        })
      } else if (lowerMessage.includes("rate limit")) {
        addToast({
          type: "error",
          title: "Rate Limited",
          message: "Too many requests. Please wait a moment and try again.",
          duration: 6000,
        })
      } else if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
        addToast({
          type: "error",
          title: "Connection Error",
          message: "Failed to connect to AI provider. Check your internet connection.",
          duration: 6000,
        })
      } else {
        addToast({
          type: "error",
          title: context ? `${context} Failed` : "AI Error",
          message: errorMessage.length > 100 ? errorMessage.slice(0, 100) + "..." : errorMessage,
          duration: 6000,
        })
      }

      // Log for debugging
      console.error(`[AI Error${context ? ` - ${context}` : ""}]:`, error)
    },
    [addToast, navigateToSettings]
  )

  // Helper to wrap async AI calls
  const withErrorHandling = useCallback(
    async <T>(
      fn: () => Promise<T>,
      context?: string
    ): Promise<T | null> => {
      try {
        return await fn()
      } catch (error) {
        handleAIError(error, context)
        return null
      }
    },
    [handleAIError]
  )

  return {
    handleAIError,
    withErrorHandling,
    navigateToSettings,
  }
}

// Helper to parse API response errors
export async function parseAPIError(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (data.error) return data.error
    if (data.message) return data.message
    if (data.reasons && Array.isArray(data.reasons)) return data.reasons.join(", ")
  } catch {
    // Ignore JSON parse errors
  }

  // Fallback to status text
  if (response.status === 401) return "Invalid API key"
  if (response.status === 403) return "Access denied"
  if (response.status === 429) return "Rate limit exceeded"
  if (response.status >= 500) return "Server error"

  return `Request failed (${response.status})`
}
