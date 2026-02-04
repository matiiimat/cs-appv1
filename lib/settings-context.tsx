"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface QuickAction {
  id: string
  title: string // Max 12 characters for UI display
  action: string // Instruction for AI
}

export interface Category {
  id: string
  name: string
  color?: string
  isDefault?: boolean
}

export interface AIProviderConfig {
  provider: "openai" | "anthropic" | "local"
  model: string
  apiKey: string
  customEndpoint?: string
  localEndpoint?: string
  temperature: number
  maxTokens: number
}

export interface SlackIntegration {
  enabled: boolean
  webhookUrl?: string
}

export interface ShopifyIntegration {
  enabled: boolean
  shopDomain?: string
  accessToken?: string
  scope?: string
  installedAt?: string
}

export interface TokenUsageInfo {
  used: number
  limit: number | null
  remaining: number | null
  isAtLimit: boolean
  isNearLimit: boolean
  resetsAt: string | null
}

export interface PlanInfo {
  planType: string
  planStatus: string
  isManaged: boolean
  tokenUsage: TokenUsageInfo | null
}

export interface Settings {
  theme: "light" | "dark"
  brandName: string
  agentName: string
  agentSignature: string
  aiInstructions: string
  categories: Category[]
  quickActions: QuickAction[]
  aiConfig: AIProviderConfig
  companyKnowledge: string
  messageAgeThresholds: {
    greenHours: number
    yellowHours: number
    redHours: number
  }
  slackIntegration?: SlackIntegration
  shopifyIntegration?: ShopifyIntegration
  hasCompletedTour?: boolean
}

interface SettingsContextType {
  settings: Settings
  updateSettings: (newSettings: Partial<Settings>) => void
  updateQuickAction: (actionId: string, action: Partial<QuickAction>) => void
  updateCategory: (categoryId: string, category: Partial<Category>) => void
  addCategory: (category: Omit<Category, "id">) => void
  deleteCategory: (categoryId: string) => void
  saveSettings: () => Promise<void>
  isLoading: boolean
  lastSaved: Date | null
  aiConfigHasKey: boolean
  setAiConfigHasKey: (hasKey: boolean) => void
  slackWebhookConfigured: boolean
  setSlackWebhookConfigured: (configured: boolean) => void
  shopifyConfigured: boolean
  setShopifyConfigured: (configured: boolean) => void
  hasSavedSettings?: boolean
  hasCompletedOnboarding: boolean
  completeOnboarding: () => void
  isSettingsLoaded: boolean
  planInfo: PlanInfo | null
  refreshPlanInfo: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const defaultSettings: Settings = {
  theme: "light",
  brandName: "",
  agentName: "Support Agent",
  agentSignature: "Best regards,\nSupport Team",
  aiInstructions:
    "You are a helpful customer support AI assistant. Be professional, empathetic, and provide clear solutions.",
  categories: [
    { id: "1", name: "Technical Support", color: "#ef4444" }, // Red
    { id: "2", name: "Billing", color: "#22c55e" }, // Green  
    { id: "3", name: "General Inquiry", color: "#3b82f6" }, // Blue
  ],
  quickActions: [
    {
      id: "1",
      title: "Translate ES", // 12 chars max
      action: "Translate the response to Spanish",
    },
    {
      id: "2", 
      title: "Make Formal",
      action: "Rewrite the response in a more formal tone",
    },
    {
      id: "3",
      title: "Simplify",
      action: "Simplify the response for easier understanding",
    },
  ],
  aiConfig: {
    provider: "openai",
    model: "gpt-4o-mini",
    apiKey: "",
    localEndpoint: "",
    temperature: 0.7,
    maxTokens: 1000,
  },
  companyKnowledge: "",
  messageAgeThresholds: {
    greenHours: 20,
    yellowHours: 24,
    redHours: 48,
  },
  slackIntegration: {
    enabled: false,
  },
  shopifyIntegration: {
    enabled: false,
  },
  hasCompletedTour: false,
}

const SETTINGS_STORAGE_KEY = 'supportai-settings'
const THEME_STORAGE_KEY = 'aidly-theme'

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Keep SSR output stable: initialize with defaults; sync theme after mount
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [aiConfigHasKey, setAiConfigHasKey] = useState<boolean>(false)
  const [slackWebhookConfigured, setSlackWebhookConfigured] = useState<boolean>(false)
  const [shopifyConfigured, setShopifyConfigured] = useState<boolean>(false)
  const [hasSavedSettings, setHasSavedSettings] = useState<boolean | undefined>(undefined)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(true) // Default true to avoid flash
  const [isSettingsLoaded, setIsSettingsLoaded] = useState<boolean>(false)
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)

  // Load settings from database on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/organization/settings')
        if (response.ok) {
          const data = await response.json()
          // Prefer theme from localStorage; do not trust API theme
          let storedTheme: 'light' | 'dark' | null = null
          try {
            const t = localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark' | null
            if (t === 'light' || t === 'dark') storedTheme = t
          } catch {}

          const merged = { ...defaultSettings, ...data }
          setSettings({ ...merged, theme: storedTheme ?? defaultSettings.theme })
          setLastSaved(data.lastSaved ? new Date(data.lastSaved) : null)
          if (typeof data.aiConfigHasKey === 'boolean') {
            setAiConfigHasKey(data.aiConfigHasKey)
          } else {
            setAiConfigHasKey(false)
          }
          if (typeof data.slackWebhookConfigured === 'boolean') {
            setSlackWebhookConfigured(data.slackWebhookConfigured)
          } else {
            setSlackWebhookConfigured(false)
          }
          if (typeof data.shopifyConfigured === 'boolean') {
            setShopifyConfigured(data.shopifyConfigured)
          } else {
            setShopifyConfigured(false)
          }
          if (typeof data.hasSavedSettings === 'boolean') {
            setHasSavedSettings(data.hasSavedSettings)
            // Use database settings as single source of truth for onboarding status
            setHasCompletedOnboarding(data.hasSavedSettings)
          }
        } else {
          console.error('Failed to load settings from database')
          // Fallback to localStorage if API fails
          const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
          if (savedSettings) {
            try {
              const parsed = JSON.parse(savedSettings)
              let storedTheme: 'light' | 'dark' | null = null
              try {
                const t = localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark' | null
                if (t === 'light' || t === 'dark') storedTheme = t
              } catch {}
              const merged = { ...defaultSettings, ...parsed }
              setSettings({ ...merged, theme: storedTheme ?? defaultSettings.theme })
              setLastSaved(parsed.lastSaved ? new Date(parsed.lastSaved) : null)
              // No secure key status from localStorage fallback
              setAiConfigHasKey(false)
              setHasSavedSettings(undefined)
            } catch (error) {
              console.error('Failed to parse saved settings:', error)
            }
          }
        }

        setIsSettingsLoaded(true)

        // Load plan info
        refreshPlanInfo()
      } catch (error) {
        console.error('Error loading settings:', error)
        // Fallback to localStorage if API fails
        const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings)
            let storedTheme: 'light' | 'dark' | null = null
            try {
              const t = localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark' | null
              if (t === 'light' || t === 'dark') storedTheme = t
            } catch {}
            const merged = { ...defaultSettings, ...parsed }
            setSettings({ ...merged, theme: storedTheme ?? defaultSettings.theme })
            setLastSaved(parsed.lastSaved ? new Date(parsed.lastSaved) : null)
            setAiConfigHasKey(false)
            setHasSavedSettings(undefined)
          } catch (error) {
            console.error('Failed to parse saved settings:', error)
          }
        }

        setIsSettingsLoaded(true)
      }
    }

    loadSettings()
  }, [])

  // After mount, sync theme from localStorage to avoid hydration mismatch
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark' | null
      if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark') && storedTheme !== settings.theme) {
        setSettings(prev => ({ ...prev, theme: storedTheme }))
      }
    } catch {}
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply theme to document whenever settings change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (settings.theme === "dark") {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
      try {
        localStorage.setItem(THEME_STORAGE_KEY, settings.theme)
      } catch {}
    }
  }, [settings.theme])

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }


  const updateQuickAction = (actionId: string, action: Partial<QuickAction>) => {
    setSettings((prev) => ({
      ...prev,
      quickActions: prev.quickActions.map((qa) => (qa.id === actionId ? { ...qa, ...action } : qa)),
    }))
  }

  const updateCategory = (categoryId: string, category: Partial<Category>) => {
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, ...category } : c)),
    }))
  }

  const addCategory = (category: Omit<Category, "id">) => {
    const newCategory = { ...category, id: Date.now().toString() }
    setSettings((prev) => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }))
  }

  const deleteCategory = (categoryId: string) => {
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== categoryId),
    }))
  }

  const completeOnboarding = async () => {
    // Save settings to database to mark onboarding as complete
    // This ensures hasSavedSettings becomes true
    setHasCompletedOnboarding(true)
    try {
      await saveSettings()
    } catch (error) {
      console.error('Failed to save settings during onboarding completion:', error)
    }
  }

  const refreshPlanInfo = async () => {
    try {
      const response = await fetch('/api/organization/plan')
      if (response.ok) {
        const data = await response.json()
        setPlanInfo({
          planType: data.planType,
          planStatus: data.planStatus,
          isManaged: data.isManaged,
          tokenUsage: data.tokenUsage,
        })
      }
    } catch (error) {
      console.error('Failed to load plan info:', error)
    }
  }

  const saveSettings = async () => {
    setIsLoading(true)
    try {
      const settingsWithTimestamp = {
        ...settings,
        lastSaved: new Date().toISOString()
      }

      // Save to database
      type SettingsWithTimestamp = Settings & { lastSaved: string }
      const swtForApi = settingsWithTimestamp as SettingsWithTimestamp
      const { theme: _ignoredThemeApi, ...payloadNoTheme } = swtForApi
      void _ignoredThemeApi

      const response = await fetch('/api/organization/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadNoTheme),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings to database')
      }

      const result = await response.json()

      // Also save to localStorage as a backup (omit secrets and theme to avoid hydration mismatches)
      const swt = settingsWithTimestamp as SettingsWithTimestamp
      const { theme: _ignoredTheme, ...restNoTheme } = swt
      void _ignoredTheme
      const safeSettings = { ...restNoTheme, aiConfig: { ...restNoTheme.aiConfig, apiKey: '' } }
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(safeSettings))
      setLastSaved(new Date())

      console.log('Settings saved successfully', result)
    } catch (error) {
      console.error('Failed to save settings:', error)

      // Fallback to localStorage only if database save fails
      try {
        const settingsWithTimestamp = { ...settings, lastSaved: new Date().toISOString() }
        const swt2 = settingsWithTimestamp as Settings & { lastSaved: string }
        const { theme: _ignoredTheme2, ...restNoTheme2 } = swt2
        void _ignoredTheme2
        const safeSettings = { ...restNoTheme2, aiConfig: { ...restNoTheme2.aiConfig, apiKey: '' } }
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(safeSettings))
        setLastSaved(new Date())
        console.warn('Settings saved to localStorage as fallback')
      } catch (localError) {
        console.error('Failed to save to localStorage as well:', localError)
        throw error
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateQuickAction,
        updateCategory,
        addCategory,
        deleteCategory,
        saveSettings,
        isLoading,
        lastSaved,
        aiConfigHasKey,
        setAiConfigHasKey,
        slackWebhookConfigured,
        setSlackWebhookConfigured,
        shopifyConfigured,
        setShopifyConfigured,
        hasSavedSettings,
        hasCompletedOnboarding,
        completeOnboarding,
        isSettingsLoaded,
        planInfo,
        refreshPlanInfo,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
