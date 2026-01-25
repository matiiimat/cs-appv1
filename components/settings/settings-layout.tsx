"use client"

import { useState, useEffect } from "react"
import { SettingsSidebar, type SettingsSection } from "./settings-sidebar"
import { SetupSection } from "./sections/setup-section"
import { CustomizationSection } from "./sections/customization-section"
import { KnowledgeSection } from "./sections/knowledge-section"
import { IntegrationsSection } from "./sections/integrations-section"
import { BillingSection } from "./sections/billing-section"
import { AccountSection } from "./sections/account-section"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SettingsLayout() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("setup")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Listen for section navigation events from other components
  useEffect(() => {
    const handleSectionChange = (event: CustomEvent<SettingsSection>) => {
      if (event.detail) {
        setActiveSection(event.detail)
      }
    }

    window.addEventListener('aidly:settings:section', handleSectionChange as EventListener)
    return () => {
      window.removeEventListener('aidly:settings:section', handleSectionChange as EventListener)
    }
  }, [])

  const renderSection = () => {
    switch (activeSection) {
      case "setup":
        return <SetupSection />
      case "knowledge":
        return <KnowledgeSection />
      case "customization":
        return <CustomizationSection />
      case "integrations":
        return <IntegrationsSection />
      case "billing":
        return <BillingSection />
      case "account":
        return <AccountSection />
      default:
        return <SetupSection />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold font-[family-name:var(--font-custom)]">Settings</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Desktop always visible, Mobile slide-in */}
        <aside
          className={`
            fixed lg:sticky top-0 lg:top-0 left-0 z-30 h-screen
            w-64 bg-background border-r
            transform transition-transform duration-300 ease-in-out
            lg:transform-none
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={(section) => {
              setActiveSection(section)
              setSidebarOpen(false)
            }}
          />
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:pl-0">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 pb-24">
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  )
}
