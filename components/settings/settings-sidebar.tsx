"use client"

import { useSettings } from "@/lib/settings-context"
import { Button } from "@/components/ui/button"
import {
  Rocket,
  Sliders,
  BookOpen,
  User,
  Sun,
  Moon,
  CreditCard,
  Plug,
} from "lucide-react"

export type SettingsSection =
  | "setup"
  | "knowledge"
  | "customization"
  | "integrations"
  | "billing"
  | "account"

interface SettingsSidebarProps {
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

interface NavItem {
  id: SettingsSection
  label: string
  icon: React.ElementType
}

const configNavItems: NavItem[] = [
  { id: "setup", label: "Setup", icon: Rocket },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "customization", label: "Customization", icon: Sliders },
  { id: "integrations", label: "Integrations", icon: Plug },
]

const accountNavItems: NavItem[] = [
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "account", label: "Account", icon: User },
]

function NavSection({
  label,
  items,
  activeSection,
  onSectionChange
}: {
  label: string
  items: NavItem[]
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}) {
  return (
    <div>
      <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
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
    </div>
  )
}

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
      <nav className="flex-1 px-3 space-y-6">
        <NavSection
          label="Configuration"
          items={configNavItems}
          activeSection={activeSection}
          onSectionChange={onSectionChange}
        />

        <NavSection
          label="Account"
          items={accountNavItems}
          activeSection={activeSection}
          onSectionChange={onSectionChange}
        />

        {/* Separator */}
        <div className="border-t border-border" />

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
