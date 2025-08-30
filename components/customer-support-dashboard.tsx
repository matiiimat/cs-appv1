"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SwipeableCard } from "@/components/swipeable-card"
import { useMessageManager } from "@/lib/message-manager"
import { useSettings } from "@/lib/settings-context"
import { formatEmailText } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Clock, User, Loader2, RotateCcw } from "lucide-react"

export function CustomerSupportDashboard() {
  const {
    messages,
    currentMessageIndex,
    approveMessage,
    sendToReview,
    moveToPreviousMessage,
  } = useMessageManager()
  
  const { settings } = useSettings()

  // Filter to only show messages that are AI-reviewed and pending human review
  const pendingMessages = messages.filter(message => message.status === 'pending' && message.autoReviewed)
  const currentMessage = pendingMessages[currentMessageIndex]
  const nextMessage = pendingMessages[currentMessageIndex + 1]

  // No loading screen needed - agents start working immediately

  // State for keyboard action feedback
  const [keyboardFeedback, setKeyboardFeedback] = useState<'approve' | 'review' | null>(null)



  const showKeyboardFeedback = useCallback((type: 'approve' | 'review') => {
    setKeyboardFeedback(type)
    setTimeout(() => {
      setKeyboardFeedback(null)
    }, 300) // Same duration as swipe animation
  }, [setKeyboardFeedback])

  const handleApprove = useCallback(() => {
    if (!currentMessage) return
    approveMessage(currentMessage.id, "agent-1")
  }, [currentMessage, approveMessage])

  const handleSendToReview = useCallback(() => {
    if (!currentMessage) return
    sendToReview(currentMessage.id, "agent-1", "Needs manual review")
  }, [currentMessage, sendToReview])

  const handleKeyboardApprove = useCallback(() => {
    if (!currentMessage) return
    showKeyboardFeedback('approve')
    setTimeout(() => {
      handleApprove()
    }, 300) // Show feedback for same duration as swipe
  }, [currentMessage, showKeyboardFeedback, handleApprove])

  const handleKeyboardReview = useCallback(() => {
    if (!currentMessage) return
    showKeyboardFeedback('review')
    setTimeout(() => {
      handleSendToReview()
    }, 300) // Show feedback for same duration as swipe
  }, [currentMessage, showKeyboardFeedback, handleSendToReview])

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts when not in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (event.key.toLowerCase()) {
        case 'a':
          event.preventDefault()
          handleKeyboardApprove()
          break
        case 'r':
          event.preventDefault()
          handleKeyboardReview()
          break
        case 'u':
          event.preventDefault()
          if (currentMessageIndex > 0) {
            moveToPreviousMessage()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentMessage, currentMessageIndex, moveToPreviousMessage, handleKeyboardApprove, handleKeyboardReview])

  // No loading screen - start working immediately

  if (!currentMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Queue Empty!</h3>
              <p className="text-muted-foreground">All messages have been reviewed. Great work!</p>
              {currentMessageIndex > 0 && (
                <Button variant="outline" onClick={moveToPreviousMessage} className="mt-4 bg-transparent">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Review Previous
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span><kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded">A</kbd> Approve</span>
              <span><kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded">R</kbd> Review</span>
              <span><kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded">U</kbd> Undo</span>
            </div>
          </div>
          {currentMessageIndex > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={moveToPreviousMessage}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Undo</span>
            </Button>
          )}
        </div>
      </div>

      <div className="relative mb-6 sm:mb-8" style={{ height: "500px" }}>
        {/* Next message card (background) */}
        {nextMessage && (
          <div className="absolute inset-0 transform scale-95 opacity-50">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{nextMessage.customerName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{nextMessage.customerEmail}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Subject: {nextMessage.subject}</h4>
                  <p className="text-foreground leading-relaxed line-clamp-3">{nextMessage.message}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Current message card (foreground, swipeable) */}
        <SwipeableCard
          onSwipeLeft={handleSendToReview}
          onSwipeRight={handleApprove}
          disabled={currentMessage.isGenerating}
          className="absolute inset-0"
        >
          <Card 
            className="h-full overflow-hidden transition-all duration-300"
            style={{
              backgroundColor: keyboardFeedback === 'approve' ? 'rgba(34, 197, 94, 0.2)' : keyboardFeedback === 'review' ? 'rgba(251, 146, 60, 0.2)' : undefined,
              border: keyboardFeedback === 'approve' ? '2px solid rgb(34, 197, 94)' : keyboardFeedback === 'review' ? '2px solid rgb(251, 146, 60)' : undefined,
            }}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{currentMessage.customerName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{currentMessage.customerEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentMessage.category && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: settings.categories.find(c => c.name === currentMessage.category)?.color || '#6b7280' }}
                      />
                      <span>{currentMessage.category}</span>
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Clock className="h-4 w-4" />
                {currentMessage.timestamp}
              </div>
            </CardHeader>
            <CardContent className="h-full overflow-y-auto">
              <div className="mb-6">
                <h4 className="font-semibold mb-2">Subject: {currentMessage.subject}</h4>
                <p className="text-foreground leading-relaxed">{currentMessage.message}</p>
              </div>

              {/* AI Response Section */}
              <div className="border-t pt-6">
                <div className="mb-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-accent/10 flex items-center justify-center">
                      <MessageSquare className="h-3 w-3 text-accent" />
                    </div>
                    AI Suggested Response
                  </h4>
                </div>
                <div className="bg-accent/5 p-4 rounded-lg border border-accent/20">
                  {currentMessage.isGenerating ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>AI is generating response...</span>
                    </div>
                  ) : (
                    <p className="text-foreground leading-relaxed whitespace-pre-line">
                      {formatEmailText(currentMessage.aiSuggestedResponse || "")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
            
            {/* Keyboard feedback badges */}
            {keyboardFeedback && (
              <>
                <div
                  className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-semibold transition-opacity ${
                    keyboardFeedback === 'approve' ? "bg-green-500 text-white opacity-100" : "opacity-0"
                  }`}
                >
                  APPROVE
                </div>
                <div
                  className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-semibold transition-opacity ${
                    keyboardFeedback === 'review' ? "bg-orange-500 text-white opacity-100" : "opacity-0"
                  }`}
                >
                  TO REVIEW
                </div>
              </>
            )}
          </Card>
        </SwipeableCard>
      </div>

      {/* Progress indicator */}
      <div className="mt-8">
        
      </div>
      
      {/* Messages remaining counter at bottom center */}
      {/* {pendingMessages.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-background/95 backdrop-blur-sm border rounded-full px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span>{pendingMessages.length - currentMessageIndex - 1} remaining</span>
            </div>
          </div>
        </div>
      )} */}
    </div>
  )
}
