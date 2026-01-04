"use client"

import { useEffect, useState, useCallback } from "react"
import { QueueView } from "@/components/queue-view"
import { DetailedReviewInterface } from "@/components/detailed-review-interface"
import { SettingsPage } from "@/components/settings-page"
import { KnowledgePage } from "@/components/knowledge-page"
import { CommandPalette } from "@/components/command-palette"
import { MessageManagerProvider, useMessageManager } from "@/lib/message-manager"
import { SettingsProvider } from "@/lib/settings-context"
import { UsageProvider } from "@/lib/usage-context"
import { UserProvider } from "@/lib/user-context"
import { ToastProvider } from "@/components/ui/toast"
import { OnboardingWrapper } from "@/components/onboarding/onboarding-wrapper"
import { useKeyboardNavigation } from "@/lib/use-keyboard-navigation"
import { LayoutGrid, Inbox, BookOpen, Settings } from "lucide-react"
import Image from "next/image"

type ViewMode = "queue" | "inbox" | "knowledge" | "settings"

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewMode>("queue")
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const { messages, processBatch } = useMessageManager()

  // Calculate queue states for command palette
  const unprocessedMessages = messages.filter(m => !m.aiReviewed && m.status === 'new')
  const readyForTriage = messages.filter(m => m.aiReviewed && m.status === 'new')

  const navigateTo = useCallback((view: ViewMode) => {
    setCurrentView(view)
  }, [])

  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true)
  }, [])

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false)
  }, [])

  // Keyboard navigation
  useKeyboardNavigation({
    onNavigate: navigateTo,
    onOpenCommandPalette: openCommandPalette,
    currentView,
  })

  // Listen for cross-component navigation events
  useEffect(() => {
    const settingsHandler = () => setCurrentView("settings")
    const triageHandler = () => setCurrentView("queue")
    const inboxHandler = () => setCurrentView("inbox")
    // Navigate to billing section in settings
    const billingHandler = () => {
      setCurrentView("settings")
      // Dispatch event to tell settings to switch to billing section
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('aidly:settings:section', { detail: 'billing' }))
      }, 50)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('aidly:navigate:settings', settingsHandler as EventListener)
      window.addEventListener('aidly:navigate:triage', triageHandler as EventListener)
      window.addEventListener('aidly:navigate:inbox', inboxHandler as EventListener)
      window.addEventListener('aidly:navigate:billing', billingHandler as EventListener)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('aidly:navigate:settings', settingsHandler as EventListener)
        window.removeEventListener('aidly:navigate:triage', triageHandler as EventListener)
        window.removeEventListener('aidly:navigate:inbox', inboxHandler as EventListener)
        window.removeEventListener('aidly:navigate:billing', billingHandler as EventListener)
      }
    }
  }, [])

  const navItems = [
    { id: "queue" as ViewMode, label: "Queue", icon: LayoutGrid, shortcut: "G Q" },
    { id: "inbox" as ViewMode, label: "Inbox", icon: Inbox, shortcut: "G I" },
    { id: "knowledge" as ViewMode, label: "Knowledge", icon: BookOpen, shortcut: "G K" },
    { id: "settings" as ViewMode, label: "Settings", icon: Settings, shortcut: "G S" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Image
                src="/logo-60x.png"
                alt="Aidly Logo"
                width={24}
                height={24}
                className="h-6 w-6"
              />
              <span className="text-lg font-bold font-custom">Aidly</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon
                const isActive = currentView === item.id

                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className={`nav-item ${isActive ? "nav-item-active" : ""}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Command Palette Trigger */}
            <button
              onClick={openCommandPalette}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground
                         bg-muted/50 hover:bg-muted rounded-md border border-border transition-colors"
            >
              <span>Search</span>
              <div className="flex items-center gap-0.5">
                <kbd className="kbd-sm">⌘</kbd>
                <kbd className="kbd-sm">K</kbd>
              </div>
            </button>

            {/* Mobile Navigation */}
            <div className="flex md:hidden items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon
                const isActive = currentView === item.id

                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className={`p-2 rounded-md transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {currentView === "queue" && <QueueView />}
        {currentView === "inbox" && <DetailedReviewInterface />}
        {currentView === "knowledge" && <KnowledgePage />}
        {currentView === "settings" && <SettingsPage />}
      </main>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        onNavigate={navigateTo}
        currentView={currentView}
        hasMessagesToProcess={unprocessedMessages.length > 0}
        hasMessagesToTriage={readyForTriage.length > 0}
        onProcessQueue={() => {
          processBatch(100)
          closeCommandPalette()
        }}
        onStartTriage={() => {
          // Queue view handles triage mode internally
          navigateTo("queue")
          closeCommandPalette()
        }}
      />
    </div>
  )
}

export function MainApp() {
  return (
    <UserProvider>
      <SettingsProvider>
        <ToastProvider>
          <MessageManagerProvider>
            <UsageProvider>
              <OnboardingWrapper>
                <AppContent />
              </OnboardingWrapper>
            </UsageProvider>
          </MessageManagerProvider>
        </ToastProvider>
      </SettingsProvider>
    </UserProvider>
  )
}
