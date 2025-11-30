"use client"

import { useEffect, useState } from "react"
import { CustomerSupportDashboard } from "@/components/customer-support-dashboard"
import { AgentDashboard } from "@/components/agent-dashboard"
import { DetailedReviewInterface } from "@/components/detailed-review-interface"
import { SettingsPage } from "@/components/settings-page"
import { SearchPage } from "@/components/search-page"
import { MessageManagerProvider } from "@/lib/message-manager"
import { SettingsProvider } from "@/lib/settings-context"
import { ToastProvider } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { BarChart3, Zap, Inbox, Settings, Search, Menu } from "lucide-react"
import Image from "next/image"

type ViewMode = "dashboard" | "swipe" | "detailed-review" | "settings" | "search"

export function MainApp() {
  const [currentView, setCurrentView] = useState<ViewMode>("dashboard")
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const switchToSwipe = () => {
    setCurrentView("swipe")
    setIsMenuOpen(false)
  }
  const switchToDashboard = () => {
    setCurrentView("dashboard")
    setIsMenuOpen(false)
  }
  const switchToDetailedReview = () => {
    setCurrentView("detailed-review")
    setIsMenuOpen(false)
  }
  const switchToSettings = () => {
    setCurrentView("settings")
    setIsMenuOpen(false)
  }
  const switchToSearch = () => {
    setCurrentView("search")
    setIsMenuOpen(false)
  }

  // Listen for cross-component navigation events (e.g., Fix in Settings)
  useEffect(() => {
    const handler = () => switchToSettings()
    if (typeof window !== 'undefined') {
      window.addEventListener('aidly:navigate:settings', handler as EventListener)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('aidly:navigate:settings', handler as EventListener)
      }
    }
  }, [])

  return (
    <SettingsProvider>
      <ToastProvider>
        <MessageManagerProvider>
        <div className="min-h-screen bg-background">
          {/* Navigation Bar */}
          <nav className="border-b border-border bg-card">
            <div className="container mx-auto px-4 py-3">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center md:flex md:items-center md:justify-between">
                {/* Empty left space for balance (desktop only) */}
                <div className="hidden md:block md:flex-1"></div>

                {/* Centered Logo and Company Name */}
                <div className="flex items-center gap-2 col-start-2 justify-self-center md:justify-self-auto">
                  <Image
                    src="/logo-60x.png"
                    alt="aidly Logo"
                    width={20}
                    height={20}
                    className="h-5 w-5"
                  />
                  <span className="text-lg font-bold font-custom">Aidly</span>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-1 flex-1 justify-end">
                  <Button
                    variant={currentView === "dashboard" ? "default" : "ghost"}
                    size="sm"
                    onClick={switchToDashboard}
                    className={`flex items-center gap-2 hover:shadow-sm hover:dark:shadow-md hover:dark:shadow-white/20 transition-shadow ${currentView === "dashboard" ? "dark:bg-black dark:text-white dark:hover:bg-gray-900 shadow-sm dark:shadow-md dark:shadow-white/20" : ""}`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    Dashboard
                  </Button>
                  <Button
                    variant={currentView === "swipe" ? "default" : "ghost"}
                    size="sm"
                    onClick={switchToSwipe}
                    className={`flex items-center gap-2 hover:shadow-sm hover:dark:shadow-md hover:dark:shadow-white/20 transition-shadow ${currentView === "swipe" ? "dark:bg-black dark:text-white dark:hover:bg-gray-900 shadow-sm dark:shadow-md dark:shadow-white/20" : ""}`}
                  >
                    <Zap className="h-4 w-4" />
                    Triage
                  </Button>
                  <Button
                    variant={currentView === "detailed-review" ? "default" : "ghost"}
                    size="sm"
                    onClick={switchToDetailedReview}
                    className={`flex items-center gap-2 hover:shadow-sm hover:dark:shadow-md hover:dark:shadow-white/20 transition-shadow ${currentView === "detailed-review" ? "dark:bg-black dark:text-white dark:hover:bg-gray-900 shadow-sm dark:shadow-md dark:shadow-white/20" : ""}`}
                  >
                    <Inbox className="h-4 w-4" />
                    Inbox
                  </Button>
                  <Button
                    variant={currentView === "search" ? "default" : "ghost"}
                    size="sm"
                    onClick={switchToSearch}
                    className={`flex items-center gap-2 hover:shadow-sm hover:dark:shadow-md hover:dark:shadow-white/20 transition-shadow ${currentView === "search" ? "dark:bg-black dark:text-white dark:hover:bg-gray-900 shadow-sm dark:shadow-md dark:shadow-white/20" : ""}`}
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </Button>
                  <Button
                    variant={currentView === "settings" ? "default" : "ghost"}
                    size="sm"
                    onClick={switchToSettings}
                    className={`flex items-center gap-2 hover:shadow-sm hover:dark:shadow-md hover:dark:shadow-white/20 transition-shadow ${currentView === "settings" ? "dark:bg-black dark:text-white dark:hover:bg-gray-900 shadow-sm dark:shadow-md dark:shadow-white/20" : ""}`}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </div>

                {/* Mobile Navigation - Icon buttons and burger menu */}
                <div className="flex md:hidden items-center gap-1 justify-self-end col-start-3">
                  {/* Quick access icon buttons for main functions */}
                  <Button
                    variant={currentView === "dashboard" ? "default" : "ghost"}
                    size="sm"
                    onClick={switchToDashboard}
                    className="p-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={currentView === "swipe" ? "default" : "ghost"}
                    size="sm"
                    onClick={switchToSwipe}
                    className="p-2"
                  >
                    <Zap className="h-4 w-4" />
                  </Button>

                  {/* Burger menu for additional options */}
                  <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-2">
                        <Menu className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-64">
                      <div className="flex flex-col gap-2 mt-6">
                        <Button
                          variant={currentView === "dashboard" ? "default" : "ghost"}
                          onClick={switchToDashboard}
                          className="justify-start gap-2"
                        >
                          <BarChart3 className="h-4 w-4" />
                          Dashboard
                        </Button>
                        <Button
                          variant={currentView === "swipe" ? "default" : "ghost"}
                          onClick={switchToSwipe}
                          className="justify-start gap-2"
                        >
                          <Zap className="h-4 w-4" />
                          Triage
                        </Button>
                        <Button
                          variant={currentView === "detailed-review" ? "default" : "ghost"}
                          onClick={switchToDetailedReview}
                          className="justify-start gap-2"
                        >
                          <Inbox className="h-4 w-4" />
                          Inbox
                        </Button>
                        <Button
                          variant={currentView === "search" ? "default" : "ghost"}
                          onClick={switchToSearch}
                          className="justify-start gap-2"
                        >
                          <Search className="h-4 w-4" />
                          Search
                        </Button>
                        <Button
                          variant={currentView === "settings" ? "default" : "ghost"}
                          onClick={switchToSettings}
                          className="justify-start gap-2"
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          {currentView === "dashboard" ? (
            <AgentDashboard />
          ) : currentView === "swipe" ? (
            <CustomerSupportDashboard />
          ) : currentView === "detailed-review" ? (
            <DetailedReviewInterface />
          ) : currentView === "search" ? (
            <SearchPage />
          ) : (
            <SettingsPage />
          )}
        </div>
        </MessageManagerProvider>
      </ToastProvider>
    </SettingsProvider>
  )
}
