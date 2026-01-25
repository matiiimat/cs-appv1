"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { SwipeableCard } from "@/components/swipeable-card"
import { QuickEditModal } from "@/components/quick-edit-modal"
import { useMessageManager } from "@/lib/message-manager"
import { useSettings } from "@/lib/settings-context"
import { useUsage } from "@/lib/usage-context"
import { useUser } from "@/lib/user-context"
import { useAIErrorHandler, parseAPIError } from "@/lib/use-ai-error-handler"
import { formatEmailText, getMessageUrgency, getUrgencyBgClass, formatFriendlyDate } from "@/lib/utils"
import { EmailText } from "@/components/email-text"
import { PieChart } from "@/components/ui/pie-chart"
import { Tooltip } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/toast"
import { UsageWidget } from "@/components/usage-widget"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StarRating, getRatingLabel } from "@/components/ui/star-rating"
import {
  Zap,
  Loader2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Star,
  MessageSquare,
} from "lucide-react"

export function QueueView() {
  const {
    stats,
    messages,
    currentMessageIndex,
    approveMessage,
    sendToReview,
    isProcessingBatch,
    processedCount,
    totalToProcess,
    isTriageActive,
    enterTriage,
    exitTriage,
    processBatch,
    cancelBatchProcessing,
    refreshData,
  } = useMessageManager()

  const { settings, aiConfigHasKey, planInfo } = useSettings()
  const { usage, canSendEmail, refreshUsage } = useUsage()
  const { user } = useUser()
  const { handleAIError } = useAIErrorHandler()
  const { addToast } = useToast()
  const [selectedBatchSize, setSelectedBatchSize] = useState(100)
  const [preflightChecking, setPreflightChecking] = useState(false)
  const [keyboardFeedback, setKeyboardFeedback] = useState<'approve' | 'review' | null>(null)
  const [isActing, setIsActing] = useState(false)
  const [quickEditOpen, setQuickEditOpen] = useState(false)
  const [timelineFilter, setTimelineFilter] = useState<'7d' | '30d' | 'all'>('all')
  const [csatModalOpen, setCsatModalOpen] = useState(false)

  // Get agent ID from user context
  const agentId = user?.id || ""

  // Refresh on mount and when timeline filter changes
  useEffect(() => {
    refreshData({ dateRange: timelineFilter })
  }, [refreshData, timelineFilter])

  // Calculate queue states
  const unprocessedMessages = messages.filter(m => !m.aiReviewed && m.status === 'new')
  const readyForReview = messages.filter(m => m.aiReviewed && m.status === 'new')
  const pendingMessages = readyForReview
  const currentMessage = pendingMessages[currentMessageIndex]

  // Determine mode: triage is active when user explicitly enters it
  const isInTriageMode = isTriageActive && currentMessage

  // AI configuration check
  // Managed plans (free/plus) don't need user configuration - AI is included
  const isManagedPlan = planInfo?.isManaged ?? false
  const provider = settings.aiConfig.provider
  const hasModel = Boolean(settings.aiConfig.model && settings.aiConfig.model.trim() !== '')
  const isLocalConfigured = provider === 'local' && Boolean((settings.aiConfig.localEndpoint || settings.aiConfig.apiKey))
  const isRemoteConfigured = (provider === 'openai' || provider === 'anthropic') && aiConfigHasKey && hasModel
  const isAIConfigured = isManagedPlan || isLocalConfigured || isRemoteConfigured

  // Handlers
  const goToSettings = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aidly:navigate:settings'))
    }
  }

  const startTriage = () => {
    enterTriage()
  }

  const handleProcessQueue = async () => {
    // Check if user has any remaining quota before starting
    if (!canSendEmail) {
      handleAIError(
        { code: 'USAGE_LIMIT_REACHED', message: usage?.isFreePlan
          ? 'Free trial limit reached. Upgrade to Pro for more emails.'
          : 'Monthly email limit reached. Your quota resets soon.'
        },
        "AI Processing"
      )
      return
    }

    try {
      setPreflightChecking(true)
      const resp = await fetch('/api/ai/status?checkConnectivity=true', { method: 'GET' })
      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        const errorMsg = await parseAPIError(resp)
        handleAIError(errorMsg, "AI Status Check")
        return
      }

      if (!data.configured) {
        const reasons = data.reasons?.join('; ') || 'AI is not configured'
        handleAIError(reasons, "AI Configuration")
        return
      }

      if (data.connectivityOk === false) {
        const reasons = data.reasons?.join('; ') || 'Connection failed'
        handleAIError(reasons, "AI Connectivity")
        return
      }
    } catch (error) {
      handleAIError(error, "Preflight Check")
      return
    } finally {
      setPreflightChecking(false)
    }

    // Cap batch size to BOTH remaining quota AND actual unprocessed messages
    const remaining = usage?.remaining ?? selectedBatchSize
    const actualToProcess = Math.min(selectedBatchSize, remaining, unprocessedMessages.length)

    // Only show quota warning if quota is the limiting factor (not message count)
    if (remaining < selectedBatchSize && remaining < unprocessedMessages.length && remaining > 0) {
      addToast({
        type: 'info',
        title: 'Limited by quota',
        message: `Processing ${actualToProcess} of ${unprocessedMessages.length} messages (${remaining} remaining in your plan).`,
        duration: 5000,
      })
    }

    const result = await processBatch(actualToProcess)

    // Show error toast if usage limit was hit during processing
    if (result.usageLimitHit) {
      handleAIError(
        { code: 'USAGE_LIMIT_REACHED', message: usage?.isFreePlan
          ? 'Free trial limit reached. Upgrade to Pro for more emails.'
          : 'Monthly email limit reached. Your quota resets soon.'
        },
        "AI Processing"
      )
      await refreshUsage()
    }
  }

  // Triage handlers
  const showKeyboardFeedback = useCallback((type: 'approve' | 'review') => {
    setKeyboardFeedback(type)
    setTimeout(() => setKeyboardFeedback(null), 300)
  }, [])

  const handleApprove = useCallback(async () => {
    if (!currentMessage || isActing) return

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

    setIsActing(true)
    try {
      await approveMessage(currentMessage.id, agentId)
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
          duration: 5000,
        })
        await refreshUsage()
      }
    } finally {
      setIsActing(false)
    }
  }, [currentMessage, approveMessage, agentId, isActing, canSendEmail, usage, addToast, refreshUsage])

  const handleSendToReview = useCallback(async () => {
    if (!currentMessage || isActing) return
    setIsActing(true)
    try {
      await sendToReview(currentMessage.id, agentId, "Needs manual review")
    } catch (error) {
      console.error('Failed to send to review:', error)
    } finally {
      setIsActing(false)
    }
  }, [currentMessage, sendToReview, agentId, isActing])

  const handleKeyboardApprove = useCallback(() => {
    if (!currentMessage) return
    showKeyboardFeedback('approve')
    setTimeout(() => handleApprove(), 300)
  }, [currentMessage, showKeyboardFeedback, handleApprove])

  const handleKeyboardReview = useCallback(() => {
    if (!currentMessage) return
    showKeyboardFeedback('review')
    setTimeout(() => handleSendToReview(), 300)
  }, [currentMessage, showKeyboardFeedback, handleSendToReview])

  // Keyboard shortcuts for triage
  useEffect(() => {
    if (!isInTriageMode) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (event.key.toLowerCase()) {
        case 'escape':
          event.preventDefault()
          exitTriage()
          break
        case ' ':
        case 'arrowright':
          event.preventDefault()
          handleKeyboardApprove()
          break
        case 'arrowleft':
        case 'r':
          event.preventDefault()
          handleKeyboardReview()
          break
        case 'e':
          event.preventDefault()
          setQuickEditOpen(true)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isInTriageMode, handleKeyboardApprove, handleKeyboardReview, exitTriage])

  // Auto-exit triage when queue is empty
  useEffect(() => {
    if (isTriageActive && readyForReview.length === 0) {
      addToast({
        type: 'success',
        title: 'All caught up!',
        message: 'No more messages to triage',
        duration: 2000,
      })
      exitTriage()
    }
  }, [isTriageActive, readyForReview.length, addToast, exitTriage])

  // Filter messages by timeline for client-side calculations
  const getTimelineFilteredMessages = () => {
    if (timelineFilter === 'all') return messages
    const now = Date.now()
    const cutoff = timelineFilter === '7d'
      ? now - 7 * 24 * 60 * 60 * 1000
      : now - 30 * 24 * 60 * 60 * 1000
    return messages.filter(m => new Date(m.timestamp).getTime() >= cutoff)
  }
  const filteredMessages = getTimelineFilteredMessages()

  // Category pie chart data (uses filtered messages)
  const categoryCounts = filteredMessages.reduce<Record<string, number>>((acc, m) => {
    const key = (m.category && m.category.trim()) || 'Uncategorized'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const palette = ['#3b82f6','#22c55e','#ef4444','#f59e0b','#a855f7','#06b6d4','#84cc16','#f97316']
  const categoryColorMap: Record<string, string> = {}
  settings.categories.forEach((c, idx) => {
    categoryColorMap[c.name] = c.color || palette[idx % palette.length]
  })
  if (!categoryColorMap['Uncategorized']) categoryColorMap['Uncategorized'] = '#6b7280'
  const pieData = Object.entries(categoryCounts).map(([label, value], idx) => ({
    label,
    value,
    color: categoryColorMap[label] || palette[idx % palette.length],
  }))

  // SLA calculation (uses filtered messages)
  const sentEligible = filteredMessages.filter(m => m.status === 'sent')
  const slaHours = settings.messageAgeThresholds.yellowHours
  const inSLA = sentEligible.filter(m => {
    const created = new Date(m.timestamp).getTime()
    const sentAt = m.processedAt
      ? new Date(m.processedAt).getTime()
      : (m.updatedAt ? new Date(m.updatedAt).getTime() : Date.now())
    const elapsedHours = Math.max(0, (sentAt - created) / (1000 * 60 * 60))
    return elapsedHours <= slaHours
  }).length
  const totalSent = sentEligible.length
  const pctIn = totalSent > 0 ? Math.round((inSLA / totalSent) * 100) : 0

  // CSAT calculation (uses filtered messages)
  interface CSATData {
    rating: number
    feedback?: string
    submittedAt?: string
  }
  const ratedMessages = filteredMessages
    .filter(m => {
      const meta = m.metadata as { csat?: CSATData } | undefined
      return meta?.csat?.rating !== undefined
    })
    .map(m => {
      const meta = m.metadata as { csat: CSATData }
      return {
        id: m.id,
        ticketId: m.ticketId,
        subject: m.subject,
        rating: meta.csat.rating,
        feedback: meta.csat.feedback,
        submittedAt: meta.csat.submittedAt,
      }
    })
    .sort((a, b) => {
      // Sort by submittedAt descending (most recent first)
      if (!a.submittedAt && !b.submittedAt) return 0
      if (!a.submittedAt) return 1
      if (!b.submittedAt) return -1
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    })
  const totalRatings = ratedMessages.length
  const avgCSAT = totalRatings > 0
    ? ratedMessages.reduce((sum, m) => sum + m.rating, 0) / totalRatings
    : 0

  // ============================================================================
  // RENDER: TRIAGE MODE
  // ============================================================================
  if (isInTriageMode && currentMessage) {
    return (
      <div className="h-[calc(100vh-140px)] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={exitTriage}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm">
              <span className="font-medium">{pendingMessages.length - currentMessageIndex}</span>
              <span className="text-muted-foreground ml-1">remaining</span>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
            <span><kbd className="kbd-sm">←</kbd> Inbox</span>
            <span><kbd className="kbd-sm">→</kbd> Send</span>
            <span><kbd className="kbd-sm">E</kbd> Edit</span>
          </div>
        </div>

        {/* Swipeable Content */}
        <SwipeableCard
          onSwipeLeft={handleSendToReview}
          onSwipeRight={handleApprove}
          disabled={currentMessage.isGenerating || isActing}
          className={`flex-1 ${isActing ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <div
            className="h-full flex flex-col transition-colors duration-200"
            style={{
              backgroundColor: keyboardFeedback === 'approve' ? 'rgba(34, 197, 94, 0.08)' : keyboardFeedback === 'review' ? 'rgba(251, 146, 60, 0.08)' : undefined,
            }}
          >
            {/* Feedback indicators */}
            {keyboardFeedback && (
              <div className="absolute inset-x-0 top-0 flex justify-between px-6 py-3 pointer-events-none z-10">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold transition-opacity ${
                  keyboardFeedback === 'review' ? "bg-amber-500 text-white opacity-100" : "opacity-0"
                }`}>
                  → INBOX
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold transition-opacity ${
                  keyboardFeedback === 'approve' ? "bg-emerald-500 text-white opacity-100" : "opacity-0"
                }`}>
                  SEND →
                </div>
              </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-6">
                {/* Customer Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {currentMessage.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{currentMessage.customerName}</div>
                      <div className="text-xs text-muted-foreground">{currentMessage.customerEmail}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${getUrgencyBgClass(getMessageUrgency(currentMessage.timestamp, settings.messageAgeThresholds))}`}>
                      {formatFriendlyDate(currentMessage.timestamp)}
                    </span>
                    {currentMessage.category && (
                      <span className="text-xs text-muted-foreground">{currentMessage.category}</span>
                    )}
                  </div>
                </div>

                {/* Subject */}
                {currentMessage.subject && (
                  <h2 className="text-lg font-semibold mb-4">{currentMessage.subject}</h2>
                )}

                {/* Customer Message */}
                <div className="mb-8">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Customer
                  </div>
                  <div className="text-sm leading-relaxed">
                    <EmailText text={currentMessage.message} />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border/50 my-6" />

                {/* AI Response */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-3.5 w-3.5 text-accent" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      AI Response
                    </span>
                  </div>
                  {currentMessage.isGenerating ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed whitespace-pre-line">
                      {formatEmailText(currentMessage.aiSuggestedResponse || "")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SwipeableCard>

        {/* Action Bar */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-border/50 flex items-center justify-between bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSendToReview}
            disabled={isActing}
            className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            To Inbox
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuickEditOpen(true)}
              disabled={isActing}
              className="text-muted-foreground"
            >
              Edit
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isActing}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Send
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* Quick Edit Modal */}
        <QuickEditModal
          isOpen={quickEditOpen}
          onClose={() => setQuickEditOpen(false)}
          message={currentMessage}
          onSend={handleApprove}
        />
      </div>
    )
  }

  // ============================================================================
  // RENDER: PROCESSING MODE (Empty triage state or processing queue)
  // ============================================================================
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Top Section - Pipeline */}
      <div className="flex-shrink-0 border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* AI config warning */}
          {planInfo && !isAIConfigured && (
            <div className="mb-6 flex items-center justify-between gap-4 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">AI not configured</span>
              </div>
              <Button onClick={goToSettings} variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                Fix in Settings
              </Button>
            </div>
          )}

          {/* Pipeline Flow */}
          <div className="flex items-center gap-4">
            {/* Stage 1: Process */}
            <div className={`flex-1 p-4 rounded-lg border transition-colors ${
              unprocessedMessages.length > 0
                ? 'border-border bg-muted/30'
                : 'border-border/30 bg-transparent'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    unprocessedMessages.length > 0
                      ? 'bg-secondary/10 text-secondary'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    1
                  </div>
                  <div>
                    <div className="text-sm font-medium">Process with AI</div>
                    <div className="text-xs text-muted-foreground">
                      {unprocessedMessages.length > 0
                        ? `${unprocessedMessages.length} messages waiting`
                        : 'No messages to process'
                      }
                    </div>
                  </div>
                </div>

                {unprocessedMessages.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-border/50 rounded-md overflow-hidden">
                      {[50, 100, 200].map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedBatchSize(size)}
                          disabled={isProcessingBatch}
                          className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                            selectedBatchSize === size
                              ? 'bg-muted text-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          } ${isProcessingBatch ? 'opacity-50' : ''}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>

                    <Tooltip content={!isAIConfigured ? "Configure AI first" : "Process messages"} side="bottom">
                      <div>
                        <Button
                          onClick={handleProcessQueue}
                          disabled={isProcessingBatch || !isAIConfigured || preflightChecking}
                          size="sm"
                          className="gap-1.5 bg-secondary hover:bg-secondary/90"
                        >
                          {isProcessingBatch || preflightChecking ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {preflightChecking ? 'Checking...' : `${processedCount}/${totalToProcess}`}
                            </>
                          ) : (
                            <>
                              <Zap className="h-3.5 w-3.5" />
                              Process
                            </>
                          )}
                        </Button>
                      </div>
                    </Tooltip>

                    {isProcessingBatch && (
                      <Button onClick={cancelBatchProcessing} variant="ghost" size="sm" className="text-muted-foreground h-8 px-2">
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {isProcessingBatch && (
                <div className="mt-3">
                  <Progress value={(processedCount / Math.max(1, totalToProcess)) * 100} className="h-1" />
                </div>
              )}
            </div>

            {/* Arrow connector */}
            <div className="flex-shrink-0 text-muted-foreground/40">
              <ArrowRight className="h-5 w-5" />
            </div>

            {/* Stage 2: Triage */}
            <div className={`flex-1 p-4 rounded-lg border transition-colors ${
              readyForReview.length > 0
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-border/30 bg-transparent'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    readyForReview.length > 0
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    2
                  </div>
                  <div>
                    <div className="text-sm font-medium">Review & Send</div>
                    <div className="text-xs text-muted-foreground">
                      {readyForReview.length > 0
                        ? `${readyForReview.length} ready for triage`
                        : 'Nothing to review yet'
                      }
                    </div>
                  </div>
                </div>

                {readyForReview.length > 0 && (
                  <Button onClick={startTriage} size="sm" className="bg-emerald-600 hover:bg-emerald-500 gap-1.5">
                    Start Triage
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Stats (scrollable) */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Stats Header */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Statistics
            </span>
            <div className="flex items-center gap-1">
              {(['7d', '30d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimelineFilter(range)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    timelineFilter === range
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {range === '7d' ? '7d' : range === '30d' ? '30d' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div>
              <div className="text-2xl font-semibold tabular-nums">{stats.totalMessages}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Total messages</div>
              {stats.pendingMessages > 0 && (
                <div className="text-xs text-emerald-500 mt-1">+{stats.pendingMessages} pending</div>
              )}
            </div>

            <div>
              <div className="text-2xl font-semibold tabular-nums">{stats.avgResponseTime.toFixed(1)}<span className="text-base font-normal text-muted-foreground ml-1">min</span></div>
              <div className="text-xs text-muted-foreground mt-0.5">Avg response time</div>
            </div>

            <div>
              {totalSent === 0 ? (
                <>
                  <div className="text-2xl font-semibold text-muted-foreground">—</div>
                  <div className="text-xs text-muted-foreground mt-0.5">SLA compliance</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-semibold tabular-nums text-emerald-500">{pctIn}%</div>
                  <div className="text-xs text-muted-foreground mt-0.5">SLA compliance</div>
                  <div className="text-xs text-muted-foreground/60 mt-1">{inSLA}/{totalSent} within SLA</div>
                </>
              )}
            </div>

            <button
              onClick={() => totalRatings > 0 && setCsatModalOpen(true)}
              className={`text-left ${totalRatings > 0 ? 'cursor-pointer group' : ''}`}
              disabled={totalRatings === 0}
            >
              {totalRatings === 0 ? (
                <>
                  <div className="text-2xl font-semibold text-muted-foreground">—</div>
                  <div className="text-xs text-muted-foreground mt-0.5">CSAT score</div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-semibold tabular-nums text-amber-500">{avgCSAT.toFixed(1)}</span>
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors">
                    CSAT · {totalRatings} ratings
                  </div>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50 my-6" />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Cases by Category
              </div>
              {pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No cases yet</p>
              ) : (
                <PieChart data={pieData} totalLabel="Total" />
              )}
            </div>
            <UsageWidget />
          </div>
        </div>
      </div>

      {/* CSAT Modal */}
      <Dialog open={csatModalOpen} onOpenChange={setCsatModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              CSAT Ratings
              <span className="text-muted-foreground font-normal text-sm ml-2">
                {avgCSAT.toFixed(1)} avg · {totalRatings} response{totalRatings !== 1 ? 's' : ''}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            <div className="space-y-3 pb-4">
              {ratedMessages.slice(0, 50).map((item) => {
                const isHighRating = item.rating >= 4

                return (
                  <div
                    key={item.id}
                    className={`relative p-4 rounded-lg border transition-colors ${
                      isHighRating
                        ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                        : 'bg-muted/50 border-border hover:bg-muted/80 hover:border-primary/30'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <button
                        onClick={() => {
                          setCsatModalOpen(false)
                          const caseId = item.ticketId?.replace(/^#/, '') || item.id
                          window.location.href = `/app/c/${caseId}`
                        }}
                        className="min-w-0 flex-1 text-left group"
                      >
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">
                          <span className="text-muted-foreground">#{item.ticketId}</span>
                          {' '}{item.subject}
                        </p>
                      </button>

                      <div className="flex-shrink-0 flex items-center gap-2">
                        <StarRating rating={item.rating} size="sm" />
                        <span className={`text-xs font-medium ${
                          item.rating >= 4 ? 'text-emerald-600' : item.rating === 3 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {getRatingLabel(item.rating)}
                        </span>
                      </div>
                    </div>

                    {/* Feedback */}
                    {item.feedback && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground">{item.feedback}</p>
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    {item.submittedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatFriendlyDate(item.submittedAt)}
                      </p>
                    )}
                  </div>
                )
              })}
              {ratedMessages.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No ratings yet</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
