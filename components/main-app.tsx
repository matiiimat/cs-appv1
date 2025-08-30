"use client"

import { useState } from "react"
import { CustomerSupportDashboard } from "@/components/customer-support-dashboard"
import { AgentDashboard } from "@/components/agent-dashboard"
import { DetailedReviewInterface } from "@/components/detailed-review-interface"
import { SettingsPage } from "@/components/settings-page"
import { MessageManagerProvider } from "@/lib/message-manager"
import { SettingsProvider } from "@/lib/settings-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { BarChart3, MessageSquare, FileText, Settings, Menu } from "lucide-react"

type ViewMode = "dashboard" | "swipe" | "detailed-review" | "settings"

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

  return (
    <SettingsProvider>
      <MessageManagerProvider>
        <div className="min-h-screen bg-background">
          {/* Navigation Bar */}
          <nav className="border-b border-border bg-card">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-accent" />
                  <span className="text-lg font-bold hidden sm:block">SupportAI</span>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-1">
                  <Button
                    variant={currentView === "dashboard" ? "default" : "ghost"}
                    size="sm"
                    onClick={switchToDashboard}
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Dashboard
                  </Button>
                  <Button
                    variant={currentView === "swipe" ? "default" : "ghost"}
                    size="sm"
                    onClick={switchToSwipe}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Review Messages
                  </Button>
                  <Button
                    variant={currentView === "detailed-review" ? "default" : "ghost"}
                    size="sm"
                    onClick={switchToDetailedReview}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Messages to Review
                  </Button>
                  <Button
                    variant={currentView === "settings" ? "default" : "ghost"}
                    size="sm"
                    onClick={switchToSettings}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </div>

                {/* Mobile Navigation - Icon buttons and burger menu */}
                <div className="flex md:hidden items-center gap-1">
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
                    <MessageSquare className="h-4 w-4" />
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
                          <MessageSquare className="h-4 w-4" />
                          Review Messages
                        </Button>
                        <Button
                          variant={currentView === "detailed-review" ? "default" : "ghost"}
                          onClick={switchToDetailedReview}
                          className="justify-start gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          Messages to Review
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
          ) : (
            <SettingsPage />
          )}
        </div>
      </MessageManagerProvider>
    </SettingsProvider>
  )
}
