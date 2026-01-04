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
import { formatEmailText, getMessageUrgency, getUrgencyBgClass, formatFriendlyDate, formatRelativeTime } from "@/lib/utils"
import { EmailText } from "@/components/email-text"
import { Badge } from "@/components/ui/badge"
import { PieChart } from "@/components/ui/pie-chart"
import { Tooltip } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/toast"
import { UsageWidget } from "@/components/usage-widget"
import {
  Zap,
  Clock,
  User,
  Loader2,
  PlayCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
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

  // Get agent ID from user context
  const agentId = user?.id || ""

  // Refresh on mount and when timeline filter changes
  useEffect(() => {
    refreshData({ dateRange: timelineFilter })
  }, [refreshData, timelineFilter])

  // Calculate queue states
  const unprocessedMessages = messages.filter(m => !m.aiReviewed && m.status === 'new')
  const processingMessages = messages.filter(m => m.isGenerating)
  const readyForReview = messages.filter(m => m.aiReviewed && m.status === 'new')
  const pendingMessages = readyForReview
  const currentMessage = pendingMessages[currentMessageIndex]
  const nextMessage = pendingMessages[currentMessageIndex + 1]

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

  // Find oldest pending ticket (uses filtered messages)
  const allPending = filteredMessages.filter(m => m.status === 'new' || m.status === 'to_review_queue')
  const oldestTicket = allPending.length > 0
    ? allPending.reduce((oldest, current) =>
        new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest
      )
    : null

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

  // ============================================================================
  // RENDER: TRIAGE MODE
  // ============================================================================
  if (isInTriageMode && currentMessage) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
        {/* Triage Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={exitTriage}
                className="text-muted-foreground hover:text-foreground -ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <h1 className="text-xl font-semibold">Triage</h1>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="px-2 py-1 bg-muted rounded-md font-medium">
                  {pendingMessages.length - currentMessageIndex} remaining
                </span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="kbd-sm">Esc</kbd>
                <span>Exit</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd-sm">→</kbd>
                <span>Send</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd-sm">←</kbd>
                <span>Review</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd-sm">E</kbd>
                <span>Edit</span>
              </span>
            </div>
          </div>
        </div>

        {/* Swipeable Card Stack */}
        <div className="relative mb-6" style={{ height: "500px" }}>
          {/* Next message (background) */}
          {nextMessage && (
            <div className="absolute inset-0 transform scale-[0.97] opacity-40 pointer-events-none">
              <div className="h-full surface rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{nextMessage.customerName}</h3>
                      <p className="text-sm text-muted-foreground">{nextMessage.customerEmail}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current message card (swipeable) */}
          <SwipeableCard
            onSwipeLeft={handleSendToReview}
            onSwipeRight={handleApprove}
            disabled={currentMessage.isGenerating || isActing}
            className={`absolute inset-0 ${isActing ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <div
              className="h-full overflow-hidden transition-all duration-300 surface-elevated rounded-lg"
              style={{
                backgroundColor: keyboardFeedback === 'approve' ? 'rgba(34, 197, 94, 0.15)' : keyboardFeedback === 'review' ? 'rgba(251, 146, 60, 0.15)' : undefined,
                borderColor: keyboardFeedback === 'approve' ? 'rgb(34, 197, 94)' : keyboardFeedback === 'review' ? 'rgb(251, 146, 60)' : undefined,
              }}
            >
              {/* Card Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{currentMessage.customerName}</h3>
                      <p className="text-sm text-muted-foreground">{currentMessage.customerEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentMessage.category && (
                      <Badge variant="outline" className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: settings.categories.find(c => c.name === currentMessage.category)?.color || '#6b7280' }}
                        />
                        <span>{currentMessage.category}</span>
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                  <Clock className="h-4 w-4" />
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getUrgencyBgClass(getMessageUrgency(currentMessage.timestamp, settings.messageAgeThresholds))}`}>
                    {formatFriendlyDate(currentMessage.timestamp)}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 h-[calc(100%-180px)] overflow-y-auto">
                <div className="mb-6">
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Subject</h4>
                  <p className="font-semibold">{currentMessage.subject}</p>
                </div>
                <div className="mb-6">
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Message</h4>
                  <div className="text-foreground leading-relaxed">
                    <EmailText text={currentMessage.message} />
                  </div>
                </div>

                {/* AI Response Section */}
                <div className="border-t border-border pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-full bg-accent/10 flex items-center justify-center">
                      <Zap className="h-3 w-3 text-accent" />
                    </div>
                    <h4 className="font-medium text-sm">AI Response</h4>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg border border-border">
                    {currentMessage.isGenerating ? (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Generating response...</span>
                      </div>
                    ) : (
                      <p className="text-foreground leading-relaxed whitespace-pre-line text-sm">
                        {formatEmailText(currentMessage.aiSuggestedResponse || "")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Keyboard feedback badges */}
              {keyboardFeedback && (
                <>
                  <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-semibold transition-opacity ${
                    keyboardFeedback === 'approve' ? "bg-emerald-500 text-white opacity-100" : "opacity-0"
                  }`}>
                    SEND
                  </div>
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-semibold transition-opacity ${
                    keyboardFeedback === 'review' ? "bg-amber-500 text-white opacity-100" : "opacity-0"
                  }`}>
                    TO INBOX
                  </div>
                </>
              )}
            </div>
          </SwipeableCard>
        </div>

        {/* Mobile Action Buttons */}
        <div className="flex sm:hidden gap-3 justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={handleSendToReview}
            disabled={isActing}
            className="flex-1 border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
          >
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Review
          </Button>
          <Button
            size="lg"
            onClick={() => setQuickEditOpen(true)}
            disabled={isActing}
            className="flex-1"
            variant="outline"
          >
            Edit
          </Button>
          <Button
            size="lg"
            onClick={handleApprove}
            disabled={isActing}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500"
          >
            Send
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
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
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Queue</h1>
      </div>

      {/* AI Processing Queue Card */}
      <div className="surface-elevated rounded-xl p-6 mb-6">
        {/* AI config warning - only show after plan info loads */}
        {planInfo && !isAIConfigured && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">AI not configured</p>
                <p className="text-xs text-destructive/80">Configure your AI provider to enable auto-processing</p>
              </div>
            </div>
            <Button onClick={goToSettings} variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10">
              Fix in Settings
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold">AI Processing Queue</h2>
              <p className="text-sm text-muted-foreground">Auto-review messages with AI</p>
            </div>
          </div>
          {(isProcessingBatch || processingMessages.length > 0) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isProcessingBatch ? `${processedCount}/${totalToProcess}` : 'Processing...'}
            </div>
          )}
        </div>

        {/* Queue Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-3xl font-bold text-secondary">{unprocessedMessages.length}</div>
            <div className="text-sm text-muted-foreground">Awaiting AI review</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-3xl font-bold text-emerald-500">{readyForReview.length}</div>
            <div className="text-sm text-muted-foreground">Ready for triage</div>
          </div>
        </div>

        {/* Process Controls */}
        {unprocessedMessages.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <p className="font-medium mb-2 text-sm">Batch size</p>
                <div className="flex items-center gap-2">
                  {[50, 100, 200].map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedBatchSize(size)}
                      disabled={isProcessingBatch}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedBatchSize === size
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      } ${isProcessingBatch ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Tooltip content={!isAIConfigured ? "Configure AI in Settings first" : "Start processing"} side="top">
                  <div>
                    <Button
                      onClick={handleProcessQueue}
                      disabled={isProcessingBatch || !isAIConfigured || preflightChecking}
                      className="w-full sm:w-auto bg-accent hover:bg-accent/90"
                      size="lg"
                    >
                      {isProcessingBatch || preflightChecking ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {preflightChecking ? 'Checking...' : 'Processing...'}
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Process {Math.min(selectedBatchSize, unprocessedMessages.length)} Messages
                        </>
                      )}
                    </Button>
                  </div>
                </Tooltip>
                {isProcessingBatch && (
                  <Button onClick={cancelBatchProcessing} variant="outline" size="sm" className="border-destructive/30 text-destructive">
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {isProcessingBatch && (
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium">Progress</span>
                  <span className="text-muted-foreground">{processedCount} / {totalToProcess}</span>
                </div>
                <Progress value={(processedCount / Math.max(1, totalToProcess)) * 100} className="h-2" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Start Triage CTA */}
      {readyForReview.length > 0 && (
        <div className="surface-elevated rounded-xl p-6 mb-6 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{readyForReview.length} messages ready</h3>
                <p className="text-sm text-muted-foreground">Start reviewing AI-generated responses</p>
              </div>
            </div>
            <Button onClick={startTriage} size="lg" className="bg-emerald-600 hover:bg-emerald-500">
              <ArrowRight className="h-4 w-4 mr-2" />
              Start Triage
            </Button>
          </div>
        </div>
      )}

      {/* Stats Header with Timeline Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">Statistics</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          {(['7d', '30d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimelineFilter(range)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                timelineFilter === range
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted hover:bg-muted/80 text-foreground'
              }`}
            >
              {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'All time'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="surface p-4 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Total Messages</div>
          <div className="text-2xl font-bold">{stats.totalMessages}</div>
          <p className="text-xs text-emerald-500 mt-1">+{stats.pendingMessages} pending</p>
        </div>

        <div className="surface p-4 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Avg Response Time</div>
          <div className="text-2xl font-bold">{stats.avgResponseTime.toFixed(1)} min</div>
        </div>

        <div className="surface p-4 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">SLA Compliance</div>
          {totalSent === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <>
              <div className="text-2xl font-bold text-emerald-500">{pctIn}%</div>
              <p className="text-xs text-muted-foreground mt-1">{inSLA}/{totalSent} within SLA</p>
            </>
          )}
        </div>

        <div className="surface p-4 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Oldest Pending</div>
          {oldestTicket ? (
            <>
              <div className="text-lg font-bold">{oldestTicket.ticketId}</div>
              <p className={`text-xs mt-1 ${(() => {
                const urgency = getMessageUrgency(oldestTicket.timestamp, settings.messageAgeThresholds)
                return urgency === 'red' ? 'text-red-500' : urgency === 'yellow' ? 'text-amber-500' : 'text-emerald-500'
              })()}`}>
                {formatRelativeTime(oldestTicket.timestamp)}
              </p>
            </>
          ) : (
            <div className="text-lg font-bold text-muted-foreground">None</div>
          )}
        </div>
      </div>

      {/* Category Chart & Usage Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface p-6 rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Cases by Category</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cases yet.</p>
          ) : (
            <PieChart data={pieData} totalLabel="Total" />
          )}
        </div>
        <UsageWidget />
      </div>
    </div>
  )
}
