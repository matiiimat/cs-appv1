"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMessageManager } from "@/lib/message-manager"
import { useSettings } from "@/lib/settings-context"
import { useUsage } from "@/lib/usage-context"
import { useUser } from "@/lib/user-context"
import { useToast } from "@/components/ui/toast"
import { formatEmailText, getMessageUrgency, getUrgencyBgClass, formatFriendlyDate, stripQuotedForTooltip } from "@/lib/utils"
import { EmailText } from "@/components/email-text"
import { CategorySelector } from "@/components/ui/category-selector"
import { Tooltip } from "@/components/ui/tooltip"
import { Send, Sparkles, MessageSquare, Loader2, MoreHorizontal, X } from "lucide-react"
import { useAIErrorHandler } from "@/lib/use-ai-error-handler"
import { ShopifyPanel } from "@/components/shopify-panel"

export function DetailedReviewInterface() {
  const { messages, updateMessage, updateMessageCategory, getDraftReply, updateDraftReply, clearDraftReply } = useMessageManager()
  const { settings, aiConfigHasKey, planInfo, shopifyConfigured } = useSettings()
  const { usage, canSendEmail, refreshUsage } = useUsage()
  const { user } = useUser()
  const { addToast } = useToast()
  const { handleAIError } = useAIErrorHandler()

  // Get agent ID from user context
  const agentId = user?.id || ""

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [aiInput, setAiInput] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [showAiInput, setShowAiInput] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const aiInputRef = useRef<HTMLInputElement>(null)

  // Get current draft reply for selected message
  const replyText = selectedMessageId ? getDraftReply(selectedMessageId) : ""

  const setReplyText = (text: string) => {
    if (selectedMessageId) {
      updateDraftReply(selectedMessageId, text)
    }
  }

  const reviewMessages = messages
    .filter((msg) => msg.status === "to_review_queue")
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const selectedMessage = reviewMessages.find((msg) => msg.id === selectedMessageId)

  // Auto-select first message
  useEffect(() => {
    if (reviewMessages.length > 0 && !selectedMessageId) {
      setSelectedMessageId(reviewMessages[0].id)
    }
  }, [reviewMessages, selectedMessageId])

  // Initialize draft from AI suggestion
  useEffect(() => {
    if (selectedMessage?.aiSuggestedResponse && selectedMessageId) {
      const existingDraft = getDraftReply(selectedMessageId)
      if (!existingDraft) {
        updateDraftReply(selectedMessageId, formatEmailText(selectedMessage.aiSuggestedResponse))
      }
    }
  }, [selectedMessage, selectedMessageId, getDraftReply, updateDraftReply])

  // Auto-navigate when message is removed
  useEffect(() => {
    if (selectedMessageId && !reviewMessages.find(msg => msg.id === selectedMessageId)) {
      if (reviewMessages.length > 0) {
        setSelectedMessageId(reviewMessages[0].id)
      } else {
        setSelectedMessageId(null)
      }
    }
  }, [reviewMessages, selectedMessageId])

  // Focus AI input when shown
  useEffect(() => {
    if (showAiInput) {
      aiInputRef.current?.focus()
    }
  }, [showAiInput])

  // Define handlers before effects that use them
  const handleApprove = useCallback(async () => {
    if (!selectedMessage) return

    // Check usage limit before attempting to send
    if (!canSendEmail) {
      addToast({
        type: 'error',
        title: 'Email limit reached',
        message: usage?.isFreePlan
          ? 'Your free trial has ended. Upgrade to Pro to continue sending emails.'
          : 'You\'ve reached your monthly email limit. Your quota resets soon.',
        duration: 8000,
        action: usage?.isFreePlan ? {
          label: 'Upgrade to Pro',
          onClick: () => window.dispatchEvent(new CustomEvent('aidly:navigate:billing')),
        } : undefined,
      })
      return
    }

    // Show warning at 90% usage
    if (usage?.isNearLimit && !usage?.isAtLimit) {
      addToast({
        type: 'info',
        title: 'Approaching limit',
        message: `${usage.remaining} emails remaining this month.`,
        duration: 3000,
      })
    }

    const finalResponse = replyText || selectedMessage.aiSuggestedResponse || ''
    if (!finalResponse.trim()) {
      alert('Draft reply is empty.')
      return
    }
    try {
      await updateMessage(selectedMessage.id, {
        aiSuggestedResponse: finalResponse,
        status: "sent",
        agentId,
        metadata: { ...(selectedMessage.metadata || {}), pending_followup: false }
      })
      clearDraftReply(selectedMessage.id)
      setShowAiInput(false)
      setAiInput("")
      // Refresh usage after successful send
      await refreshUsage()
    } catch (error) {
      console.error('Failed to approve message:', error)
      // Check if it's a usage limit error from API
      if (error instanceof Error && error.message.includes('429')) {
        addToast({
          type: 'error',
          title: 'Email limit reached',
          message: 'Your monthly email limit has been reached.',
          duration: 8000,
          action: {
            label: 'Upgrade to Pro',
            onClick: () => window.dispatchEvent(new CustomEvent('aidly:navigate:billing')),
          },
        })
        await refreshUsage()
      }
    }
  }, [selectedMessage, replyText, updateMessage, clearDraftReply, agentId, canSendEmail, usage, addToast, refreshUsage])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in input field (except for specific shortcuts)
      const target = e.target as HTMLElement
      const isInInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA"

      // Cmd+Enter to send
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        handleApprove()
        return
      }

      // Cmd+I to toggle AI input
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault()
        setShowAiInput(prev => !prev)
        return
      }

      // Escape to close AI input or more menu
      if (e.key === "Escape") {
        if (showAiInput) {
          setShowAiInput(false)
          setAiInput("")
        }
        if (moreMenuOpen) {
          setMoreMenuOpen(false)
        }
        return
      }

      // Don't process other shortcuts if in input
      if (isInInput) return

      // Arrow keys to navigate messages
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        const currentIndex = reviewMessages.findIndex(m => m.id === selectedMessageId)
        if (e.key === "ArrowDown" && currentIndex < reviewMessages.length - 1) {
          setSelectedMessageId(reviewMessages[currentIndex + 1].id)
        } else if (e.key === "ArrowUp" && currentIndex > 0) {
          setSelectedMessageId(reviewMessages[currentIndex - 1].id)
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [selectedMessageId, reviewMessages, showAiInput, moreMenuOpen, handleApprove])

  const handleCloseWithoutReply = useCallback(async () => {
    if (!selectedMessage) return
    if (!window.confirm('Close this case without replying?')) return

    try {
      await updateMessage(selectedMessage.id, {
        status: 'sent',
        agentId,
        metadata: { ...(selectedMessage.metadata || {}), close_without_reply: true, pending_followup: false }
      })
      clearDraftReply(selectedMessage.id)
      setMoreMenuOpen(false)
    } catch (error) {
      console.error('Failed to close case:', error)
    }
  }, [selectedMessage, updateMessage, clearDraftReply, agentId])

  const handleSendKeepOpen = useCallback(async () => {
    if (!selectedMessage) return

    // Check usage limit before attempting to send
    if (!canSendEmail) {
      addToast({
        type: 'error',
        title: 'Email limit reached',
        message: usage?.isFreePlan
          ? 'Your free trial has ended. Upgrade to Pro to continue sending emails.'
          : 'You\'ve reached your monthly email limit. Your quota resets soon.',
        duration: 8000,
        action: usage?.isFreePlan ? {
          label: 'Upgrade to Pro',
          onClick: () => window.dispatchEvent(new CustomEvent('aidly:navigate:billing')),
        } : undefined,
      })
      return
    }

    // Show warning at 90% usage
    if (usage?.isNearLimit && !usage?.isAtLimit) {
      addToast({
        type: 'info',
        title: 'Approaching limit',
        message: `${usage.remaining} emails remaining this month.`,
        duration: 3000,
      })
    }

    const finalResponse = replyText || selectedMessage.aiSuggestedResponse || ''
    if (!finalResponse.trim()) {
      alert('Draft reply is empty.')
      return
    }
    try {
      await updateMessage(selectedMessage.id, {
        aiSuggestedResponse: finalResponse,
        status: 'to_review_queue',
        agentId,
        metadata: { ...(selectedMessage.metadata || {}), pending_followup: true, send_and_keep_open: true }
      })
      clearDraftReply(selectedMessage.id)
      setMoreMenuOpen(false)
      // Refresh usage after successful send
      await refreshUsage()
    } catch (error) {
      console.error('Failed to send message:', error)
      // Check if it's a usage limit error from API
      if (error instanceof Error && error.message.includes('429')) {
        addToast({
          type: 'error',
          title: 'Email limit reached',
          message: 'Your monthly email limit has been reached.',
          duration: 8000,
          action: {
            label: 'Upgrade to Pro',
            onClick: () => window.dispatchEvent(new CustomEvent('aidly:navigate:billing')),
          },
        })
        await refreshUsage()
      }
    }
  }, [selectedMessage, replyText, updateMessage, clearDraftReply, agentId, canSendEmail, usage, addToast, refreshUsage])

  const handleAiRefine = async () => {
    if (!aiInput.trim() || !selectedMessage) return

    // Check AI configuration - managed plans always have AI configured
    const isManagedPlan = planInfo?.isManaged ?? false
    const isLocal = settings.aiConfig.provider === 'local'
    const hasClientKey = Boolean(settings.aiConfig.apiKey)
    const hasServerKey = Boolean(aiConfigHasKey)
    const hasLocalEndpoint = isLocal && Boolean(settings.aiConfig.localEndpoint || settings.aiConfig.apiKey)

    const isAIConfigured = isManagedPlan || hasClientKey || hasServerKey || hasLocalEndpoint
    if (!isAIConfigured) {
      handleAIError("AI provider not configured", "AI Refinement")
      return
    }

    setIsAiLoading(true)
    try {
      const systemPrompt = `You are an expert customer support AI assistant. Refine the draft response based on the user's instruction.

If Shopify customer data is provided above, use it to personalize the response with accurate order details. Never invent order numbers or tracking information - only reference what's in the data.

Customer message: ${selectedMessage.message}
Current draft: ${replyText || selectedMessage.aiSuggestedResponse || ""}
User instruction: ${aiInput}

Return ONLY the refined response text. No explanation, no quotes, no markdown.
End with the signature: "${settings.agentSignature}"`

      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiConfig: settings.aiConfig,
          system: systemPrompt,
          prompt: aiInput,
          customerEmail: selectedMessage.customerEmail,
        })
      })

      if (!resp.ok) {
        // Parse error response for better message
        const errorData = await resp.json().catch(() => ({}))
        const errorMsg = errorData.error || `Request failed (${resp.status})`
        throw new Error(errorMsg)
      }

      const data = await resp.json()
      setReplyText(data.content)
      setAiInput("")
      setShowAiInput(false)
    } catch (error) {
      handleAIError(error, "AI Refinement")
    } finally {
      setIsAiLoading(false)
    }
  }

  // Empty state
  if (reviewMessages.length === 0) {
    return (
      <div className="h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <h3 className="text-lg font-medium mb-1">All caught up</h3>
          <p className="text-sm text-muted-foreground">No cases need review right now</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-140px)] flex">
      {/* Left Panel - Case List */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-border/50">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Inbox
          </span>
          <span className="text-xs text-muted-foreground">
            {reviewMessages.length}
          </span>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-2 pb-2">
            {reviewMessages.map((message) => {
              const isSelected = selectedMessageId === message.id
              const isPending = message.metadata &&
                typeof message.metadata === 'object' &&
                (message.metadata as Record<string, unknown>)['pending_followup'] === true
              const urgency = getMessageUrgency(message.timestamp, settings.messageAgeThresholds)

              return (
                <Tooltip
                  key={message.id}
                  content={stripQuotedForTooltip(message.message)}
                  delay={800}
                >
                  <div
                    className={`group relative px-3 py-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "bg-muted"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedMessageId(message.id)}
                  >
                    {/* Selection indicator */}
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary transition-opacity ${
                      isSelected ? "opacity-100" : "opacity-0"
                    }`} />

                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                        isSelected
                          ? "bg-primary/15 text-primary"
                          : "bg-muted-foreground/10 text-muted-foreground"
                      }`}>
                        {message.customerName.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={`text-sm font-medium truncate ${
                            isSelected ? "text-foreground" : "text-foreground/80"
                          }`}>
                            {message.customerName}
                          </span>
                          {urgency === 'red' && !isPending && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground truncate mb-1.5">
                          {message.subject || stripQuotedForTooltip(message.message).slice(0, 50)}
                        </p>

                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-muted-foreground/60">
                            {message.category}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          {isPending ? (
                            <span className="text-purple-400">Pending</span>
                          ) : (
                            <span className={`px-1.5 py-0.5 rounded ${getUrgencyBgClass(urgency)}`}>
                              {formatFriendlyDate(message.timestamp)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Tooltip>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content - Seamless flow */}
      {selectedMessage && (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {selectedMessage.customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedMessage.customerName}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getUrgencyBgClass(getMessageUrgency(selectedMessage.timestamp, settings.messageAgeThresholds))}`}>
                    {formatFriendlyDate(selectedMessage.timestamp)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{selectedMessage.customerEmail}</span>
              </div>
            </div>
            <CategorySelector
              currentCategory={selectedMessage.category || ""}
              onCategoryChange={(newCategory) => updateMessageCategory(selectedMessage.id, newCategory)}
            />
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-6">
              {/* Subject */}
              {selectedMessage.subject && (
                <h2 className="text-lg font-semibold mb-4">{selectedMessage.subject}</h2>
              )}

              {/* Customer Message */}
              <div className="mb-8">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Customer
                </div>
                <div className="text-sm leading-relaxed text-foreground/90">
                  <EmailText text={selectedMessage.message} />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border/50 my-6" />

              {/* Reply Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Your Reply
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAiInput(!showAiInput)}
                    className={`h-7 text-xs gap-1.5 ${showAiInput ? 'text-accent' : 'text-muted-foreground'}`}
                  >
                    <Sparkles className="h-3 w-3" />
                    AI Refine
                    <kbd className="kbd-sm ml-1">⌘I</kbd>
                  </Button>
                </div>

                {/* AI Refinement Input */}
                {showAiInput && (
                  <div className="mb-4 p-3 rounded-lg bg-accent/5 border border-accent/10">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent flex-shrink-0" />
                      <input
                        ref={aiInputRef}
                        type="text"
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleAiRefine()
                          }
                        }}
                        placeholder="'make shorter', 'add empathy', 'translate to Spanish'..."
                        className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/50"
                        disabled={isAiLoading}
                      />
                      {isAiLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-accent" />
                      ) : (
                        <>
                          {aiInput.trim() && (
                            <Button
                              size="sm"
                              onClick={handleAiRefine}
                              className="h-6 px-2 text-xs bg-accent hover:bg-accent/90"
                            >
                              Refine
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShowAiInput(false)
                              setAiInput("")
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                    {/* Quick Actions */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {settings.quickActions.slice(0, 4).map((action, idx) => (
                        <button
                          key={action.id}
                          onClick={() => {
                            setAiInput(action.action)
                            setTimeout(() => handleAiRefine(), 100)
                          }}
                          className="inline-flex items-center gap-1 h-6 px-2 text-xs rounded-md
                                     bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground
                                     transition-colors"
                          disabled={isAiLoading}
                        >
                          <span className="text-[10px] text-muted-foreground/60">{idx + 1}</span>
                          {action.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Textarea
                  placeholder="Write your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[200px] resize-none border-0 bg-transparent p-0 text-sm leading-relaxed
                             focus-visible:ring-0 focus-visible:ring-offset-0
                             placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
          </div>

          {/* Action Bar - Fixed at bottom */}
          <div className="px-6 py-3 border-t border-border/50 flex items-center justify-between bg-background">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className="text-muted-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {moreMenuOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-52 bg-popover border border-border rounded-lg shadow-xl p-1 z-50">
                  <button
                    onClick={handleSendKeepOpen}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                  >
                    Send & keep open
                  </button>
                  <button
                    onClick={handleCloseWithoutReply}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-destructive"
                  >
                    Close without reply
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden sm:block">
                <kbd className="kbd-sm">⌘↵</kbd> to send
              </span>
              <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-500 h-9">
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Shopify Panel - Right Sidebar */}
      {selectedMessage && shopifyConfigured && settings.shopifyIntegration?.enabled && (
        <ShopifyPanel customerEmail={selectedMessage.customerEmail} />
      )}
    </div>
  )
}
