"use client"

import { useSettings } from "@/lib/settings-context"
import { Button } from "@/components/ui/button"
import {
  Rocket,
  Sliders,
  BookOpen,
  Settings2,
  Sun,
  Moon,
  Shield,
  CreditCard,
  Plug,
} from "lucide-react"

export type SettingsSection =
  | "setup"
  | "customization"
  | "knowledge"
  | "integrations"
  | "system"
  | "billing"
  | "privacy"

interface SettingsSidebarProps {
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

const mainNavItems: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: "setup", label: "Setup", icon: Rocket },
  { id: "customization", label: "Customization", icon: Sliders },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "system", label: "System", icon: Settings2 },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "privacy", label: "Privacy & Data", icon: Shield },
]

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  const { settings, updateSettings } = useSettings()

  return (
    <div className="flex flex-col h-full py-6">
      {/* Header */}
      <div className="px-6 mb-8 hidden lg:block">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-custom)] text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => onSectionChange(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-150
                    ${
                      isActive
                        ? "bg-primary/10 text-primary border-l-2 border-primary ml-[-2px]"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>

        {/* Separator */}
        <div className="my-6 border-t border-border" />

        {/* Theme Toggle */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Theme</span>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateSettings({ theme: "light" })}
                className={`
                  h-7 px-2 rounded-md transition-all
                  ${settings.theme === "light" ? "bg-background shadow-sm" : "hover:bg-transparent"}
                `}
              >
                <Sun className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateSettings({ theme: "dark" })}
                className={`
                  h-7 px-2 rounded-md transition-all
                  ${settings.theme === "dark" ? "bg-background shadow-sm" : "hover:bg-transparent"}
                `}
              >
                <Moon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-6 pt-6 border-t border-border mt-auto">
        <p className="text-xs text-muted-foreground">
          Aidly v1.0
        </p>
      </div>
    </div>
  )
}
