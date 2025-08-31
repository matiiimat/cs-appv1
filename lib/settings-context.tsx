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

export interface Settings {
  theme: "light" | "dark"
  agentName: string
  agentSignature: string
  aiInstructions: string
  categories: Category[]
  quickActions: QuickAction[]
  aiConfig: AIProviderConfig
  companyKnowledge: string
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
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const defaultSettings: Settings = {
  theme: "light",
  agentName: "Support Agent",
  agentSignature: "Best regards,\nSupport Team",
  aiInstructions:
    "You are a helpful customer support AI assistant. Be professional, empathetic, and provide clear solutions.",
  categories: [], // Empty by default, will fall back to N/A
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
    provider: "local",
    model: "mistralai/devstral-small-2505",
    apiKey: "http://192.168.1.24:1234",
    localEndpoint: "http://192.168.1.24:1234",
    temperature: 0.7,
    maxTokens: 1000,
  },
  companyKnowledge: "",
}

const SETTINGS_STORAGE_KEY = 'supportai-settings'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          setSettings({ ...defaultSettings, ...parsed })
          setLastSaved(parsed.lastSaved ? new Date(parsed.lastSaved) : null)
        } catch (error) {
          console.error('Failed to parse saved settings:', error)
        }
      }
    }
  }, [])

  // Apply theme to document whenever settings change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (settings.theme === "dark") {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
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

  const saveSettings = async () => {
    setIsLoading(true)
    try {
      const settingsWithTimestamp = {
        ...settings,
        lastSaved: new Date().toISOString()
      }
      
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsWithTimestamp))
      setLastSaved(new Date())
      
      // Simulate a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
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
