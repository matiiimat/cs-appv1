"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMessageManager } from "@/lib/message-manager"
import { useSettings } from "@/lib/settings-context"
import { formatEmailText, getMessageUrgency, getUrgencyBgClass, formatFriendlyDate, stripQuotedForTooltip } from "@/lib/utils"
import { EmailText } from "@/components/email-text"
import { CategorySelector } from "@/components/ui/category-selector"
import { Tooltip } from "@/components/ui/tooltip"
import { Clock, User, Send, Sparkles, MessageSquare, Loader2, MoreHorizontal, X } from "lucide-react"
import { useAIErrorHandler } from "@/lib/use-ai-error-handler"

export function DetailedReviewInterface() {
  const { messages, updateMessage, updateMessageCategory, getDraftReply, updateDraftReply, clearDraftReply } = useMessageManager()
  const { settings, aiConfigHasKey } = useSettings()
  const { handleAIError } = useAIErrorHandler()

  // Get agent ID
  const DEMO_AGENT_ID = process.env.NEXT_PUBLIC_DEMO_AGENT_ID
  const getAgentId = () => {
    if (DEMO_AGENT_ID) return DEMO_AGENT_ID
    throw new Error('No agent context available.')
  }
  const agentId = getAgentId()

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
    } catch (error) {
      console.error('Failed to approve message:', error)
    }
  }, [selectedMessage, replyText, updateMessage, clearDraftReply, agentId])

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
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }, [selectedMessage, replyText, updateMessage, clearDraftReply, agentId])

  const handleAiRefine = async () => {
    if (!aiInput.trim() || !selectedMessage) return

    // Check AI configuration
    const isLocal = settings.aiConfig.provider === 'local'
    const hasClientKey = Boolean(settings.aiConfig.apiKey)
    const hasServerKey = Boolean(aiConfigHasKey)
    const hasLocalEndpoint = isLocal && Boolean(settings.aiConfig.localEndpoint || settings.aiConfig.apiKey)

    if ((!isLocal && !(hasClientKey || hasServerKey)) || (isLocal && !hasLocalEndpoint)) {
      handleAIError("AI provider not configured", "AI Refinement")
      return
    }

    setIsAiLoading(true)
    try {
      const systemPrompt = `You are an expert customer support AI assistant. Refine the draft response based on the user's instruction.

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
      <div className="container mx-auto px-6 py-8">
        <div className="surface rounded-xl p-12">
          <div className="empty-state">
            <MessageSquare className="empty-state-icon" />
            <h3 className="empty-state-title">Inbox Empty</h3>
            <p className="empty-state-description">No cases need review right now</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-6">
      <div className="flex gap-6 h-[calc(100vh-140px)]">
        {/* Left Panel - Case List */}
        <div className="w-64 flex-shrink-0">
          <div className="surface h-full rounded-lg flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold">Cases ({reviewMessages.length})</h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {reviewMessages.map((message) => {
                  const isSelected = selectedMessageId === message.id
                  const isPending = message.metadata &&
                    typeof message.metadata === 'object' &&
                    (message.metadata as Record<string, unknown>)['pending_followup'] === true

                  return (
                    <Tooltip
                      key={message.id}
                      content={stripQuotedForTooltip(message.message)}
                      delay={800}
                    >
                      <div
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedMessageId(message.id)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">{message.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {message.category}
                          </Badge>
                          {isPending ? (
                            <span className="status-badge status-pending text-[10px]">PENDING</span>
                          ) : (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getUrgencyBgClass(getMessageUrgency(message.timestamp, settings.messageAgeThresholds))}`}>
                              {formatFriendlyDate(message.timestamp)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Tooltip>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Content */}
        {selectedMessage && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Customer Question */}
            <div className="surface rounded-lg flex flex-col h-[45%] min-h-0">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold">Customer Question</h3>
                <CategorySelector
                  currentCategory={selectedMessage.category || ""}
                  onCategoryChange={(newCategory) => updateMessageCategory(selectedMessage.id, newCategory)}
                />
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {selectedMessage.customerName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span className={`px-2 py-0.5 rounded text-xs ${getUrgencyBgClass(getMessageUrgency(selectedMessage.timestamp, settings.messageAgeThresholds))}`}>
                      {formatFriendlyDate(selectedMessage.timestamp)}
                    </span>
                  </span>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <EmailText text={selectedMessage.message} />
                </div>
              </div>
            </div>

            {/* Draft Reply */}
            <div className="surface rounded-lg flex flex-col h-[55%] min-h-0">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold">Draft Reply</h3>
                <Button
                  variant={showAiInput ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowAiInput(!showAiInput)}
                  className="h-7 text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI
                  <kbd className="kbd-sm ml-2">⌘I</kbd>
                </Button>
              </div>

              {/* AI Refinement Input */}
              {showAiInput && (
                <div className="px-4 py-3 border-b border-border bg-accent/5">
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
                      placeholder="Refine response: 'make shorter', 'add empathy', 'translate to Spanish'..."
                      className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                      disabled={isAiLoading}
                    />
                    {isAiLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowAiInput(false)
                            setAiInput("")
                          }}
                          className="h-6 px-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        {aiInput.trim() && (
                          <Button
                            size="sm"
                            onClick={handleAiRefine}
                            className="h-6 px-2 text-xs bg-accent hover:bg-accent/90"
                          >
                            Refine
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 mt-2">
                    {settings.quickActions.slice(0, 4).map((action, idx) => (
                      <Button
                        key={action.id}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAiInput(action.action)
                          setTimeout(() => handleAiRefine(), 100)
                        }}
                        className="h-6 text-xs px-2"
                        disabled={isAiLoading}
                      >
                        <span className="w-4 h-4 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] mr-1">
                          {idx + 1}
                        </span>
                        {action.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 flex-1 flex flex-col min-h-0">
                <Textarea
                  placeholder="Edit the AI-generated response or write your own..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 min-h-0 resize-none"
                />
              </div>

              <div className="p-4 border-t border-border flex items-center justify-between">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    className="h-9 w-9"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  {moreMenuOpen && (
                    <div className="absolute left-0 bottom-full mb-2 w-56 bg-popover border border-border rounded-lg shadow-lg p-1 z-50">
                      <button
                        onClick={handleSendKeepOpen}
                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                      >
                        Send & keep case open
                      </button>
                      <button
                        onClick={handleCloseWithoutReply}
                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-destructive"
                      >
                        Close without replying
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    <kbd className="kbd-sm">⌘</kbd>
                    <kbd className="kbd-sm ml-0.5">↵</kbd>
                    <span className="ml-1">to send</span>
                  </div>
                  <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-500">
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
