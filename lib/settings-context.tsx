"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface Macro {
  id: string
  name: string
  description: string
  action: string
}

export interface AIProviderConfig {
  provider: "openai" | "anthropic" | "google" | "azure" | "custom" | "local"
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
  companyKnowledgeUrl: string
  macros: Macro[]
  aiConfig: AIProviderConfig
}

interface SettingsContextType {
  settings: Settings
  updateSettings: (newSettings: Partial<Settings>) => void
  updateMacro: (macroId: string, macro: Partial<Macro>) => void
  addMacro: (macro: Omit<Macro, "id">) => void
  deleteMacro: (macroId: string) => void
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
  companyKnowledgeUrl: "",
  macros: [
    {
      id: "1",
      name: "Escalate to Manager",
      description: "Escalate this case to a manager for review",
      action: "Please escalate this case to a manager for further review and assistance.",
    },
    {
      id: "2",
      name: "Request More Info",
      description: "Ask customer for additional information",
      action: "Could you please provide more details about your issue so we can better assist you?",
    },
    {
      id: "3",
      name: "Close with Solution",
      description: "Mark case as resolved with solution provided",
      action:
        "Thank you for contacting us. Your issue has been resolved. Please let us know if you need any further assistance.",
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

  const updateMacro = (macroId: string, macro: Partial<Macro>) => {
    setSettings((prev) => ({
      ...prev,
      macros: prev.macros.map((m) => (m.id === macroId ? { ...m, ...macro } : m)),
    }))
  }

  const addMacro = (macro: Omit<Macro, "id">) => {
    const newMacro = { ...macro, id: Date.now().toString() }
    setSettings((prev) => ({
      ...prev,
      macros: [...prev.macros, newMacro],
    }))
  }

  const deleteMacro = (macroId: string) => {
    setSettings((prev) => ({
      ...prev,
      macros: prev.macros.filter((m) => m.id !== macroId),
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
        updateMacro,
        addMacro,
        deleteMacro,
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
