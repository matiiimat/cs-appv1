"use client"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useMessageManager } from "@/lib/message-manager"
import { formatRelativeTime } from "@/lib/utils"
import { PlayCircle, Loader2, ArrowRight } from "lucide-react"
import { PieChart } from "@/components/ui/pie-chart"
import { useSettings } from "@/lib/settings-context"
import { useState, useEffect } from "react"
import { getMessageUrgency } from "@/lib/utils"
import { Tooltip } from "@/components/ui/tooltip"

export function AgentDashboard() {
  const { stats, messages, isProcessingBatch, processedCount, totalToProcess, showTriageButton, hideTriageButton, processBatch, cancelBatchProcessing, refreshData } = useMessageManager()
  const [selectedBatchSize, setSelectedBatchSize] = useState(100)
  
  // Refresh dashboard data on mount/entry
  useEffect(() => {
    refreshData()
  }, [refreshData])
  
  // Calculate queue metrics
  const unprocessedMessages = messages.filter(m => !m.aiReviewed && m.status === 'new')
  const processingMessages = messages.filter(m => m.isGenerating)
  const readyForReview = messages.filter(m => m.aiReviewed && m.status === 'new')
  
  // Find oldest pending ticket (includes both pending and review status)
  const pendingMessages = messages.filter(m => m.status === 'new' || m.status === 'to_review_queue')
  const oldestTicket = pendingMessages.length > 0 
    ? pendingMessages.reduce((oldest, current) => 
        new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest
      )
    : null
  
  const [preflightError, setPreflightError] = useState<string | null>(null)
  const [preflightChecking, setPreflightChecking] = useState(false)
  const handleProcessQueue = async () => {
    setPreflightError(null)
    // Optional preflight connectivity check as a backstop
    try {
      setPreflightChecking(true)
      const resp = await fetch('/api/ai/status?checkConnectivity=true', { method: 'GET' })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setPreflightError('AI status check failed. Please try again or fix configuration in Settings.')
        return
      }
      if (!data.configured) {
        setPreflightError((data.reasons && data.reasons.join('; ')) || 'AI is not configured.')
        return
      }
      if (data.connectivityOk === false) {
        setPreflightError((data.reasons && data.reasons.join('; ')) || 'AI connectivity check failed.')
        return
      }
    } catch {
      setPreflightError('Preflight check failed. Please verify your AI settings.')
      return
    } finally {
      setPreflightChecking(false)
    }

    await processBatch(selectedBatchSize)
  }

  // AI configuration status
  const { settings: uiSettings, aiConfigHasKey } = useSettings()
  const provider = uiSettings.aiConfig.provider
  const hasModel = Boolean(uiSettings.aiConfig.model && uiSettings.aiConfig.model.trim() !== '')
  const isLocalConfigured = provider === 'local' && Boolean((uiSettings.aiConfig.localEndpoint || uiSettings.aiConfig.apiKey))
  const isRemoteConfigured = (provider === 'openai' || provider === 'anthropic') && aiConfigHasKey && hasModel
  const isAIConfigured = isLocalConfigured || isRemoteConfigured
  const goToSettings = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aidly:navigate:settings'))
    }
  }

  const goToTriage = () => {
    hideTriageButton()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aidly:navigate:triage'))
    }
  }

  // Category distribution for pie chart
  const categoryCounts = messages.reduce<Record<string, number>>((acc, m) => {
    const key = (m.category && m.category.trim()) || 'Uncategorized'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  // Use configured category colors when available; fallback palette otherwise
  // Already have uiSettings from useSettings above
  const palette = ['#3b82f6','#22c55e','#ef4444','#f59e0b','#a855f7','#06b6d4','#84cc16','#f97316']
  const categoryColorMap: Record<string, string> = {}
  uiSettings.categories.forEach((c, idx) => {
    categoryColorMap[c.name] = c.color || palette[idx % palette.length]
  })
  // Ensure "Uncategorized" has a color
  if (!categoryColorMap['Uncategorized']) categoryColorMap['Uncategorized'] = '#6b7280'
  const pieData = Object.entries(categoryCounts).map(([label, value], idx) => ({
    label,
    value,
    color: categoryColorMap[label] || palette[idx % palette.length],
  }))

  // SLA bar (sent only): Green (in SLA) vs Red (out of SLA)
  const sentEligible = messages.filter(m => m.status === 'sent')
  const slaHours = uiSettings.messageAgeThresholds.yellowHours // Yellow counts within SLA
  const inSLA = sentEligible.filter(m => {
    const created = new Date(m.timestamp).getTime()
    const sentAt = m.processedAt
      ? new Date(m.processedAt).getTime()
      : (m.updatedAt ? new Date(m.updatedAt).getTime() : Date.now())
    const elapsedHours = Math.max(0, (sentAt - created) / (1000 * 60 * 60))
    return elapsedHours <= slaHours
  }).length
  const totalSent = sentEligible.length
  const outSLA = Math.max(0, totalSent - inSLA)
  const pctIn = totalSent > 0 ? Math.round((inSLA / totalSent) * 100) : 0
  const pctOut = totalSent > 0 ? 100 - pctIn : 0

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Support Dashboard</h1>
        </div>
      </div>

      {/* Queue Management Hero Section */}
      <div className="mb-8 bg-gradient-to-r from-accent/5 to-accent/10 rounded-lg shadow-lg">
        <div className="p-6">
          {/* AI configuration banner */}
          {!isAIConfigured && (
            <div className="mb-4 p-4 border rounded-lg bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">AI isn’t configured. Auto-generated replies will fail.</p>
                <p className="text-xs opacity-90">Configure your AI provider and model to enable batch processing.</p>
              </div>
              <Button onClick={goToSettings} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-800/30">Fix in Settings</Button>
            </div>
          )}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
               {/* <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                {/* <Zap className="h-6 w-6 text-accent" />  
              </div>*/}
              <div>
                <h3 className="text-xl font-semibold">AI Processing Queue</h3>
              </div>
            </div>
            {(isProcessingBatch || processingMessages.length > 0) && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isProcessingBatch ? `Processing ${processedCount}/${totalToProcess}` : 'Processing...'}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="text-center p-4 bg-card rounded-lg shadow-md">
              <div className="text-3xl font-bold text-orange-600 mb-1">{unprocessedMessages.length}</div>
              <div className="text-sm text-muted-foreground">Messages awaiting AI review</div>
            </div>
            <div className="text-center p-4 bg-card rounded-lg shadow-md">
              <div className="text-3xl font-bold text-green-600 mb-1">{readyForReview.length}</div>
              <div className="text-sm text-muted-foreground">Ready for agent review</div>
            </div>
          </div>
          
          {unprocessedMessages.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 bg-card rounded-lg shadow-md">
                <div className="flex-1">
                  <p className="font-medium mb-2">Process messages in batches</p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Batch size:</span>
                    {[50, 100, 200].map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedBatchSize(size)}
                        disabled={isProcessingBatch}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          selectedBatchSize === size 
                            ? 'bg-accent text-accent-foreground' 
                            : 'bg-muted hover:bg-muted/80'
                        } ${isProcessingBatch ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <Tooltip content={!isAIConfigured ? "AI configuration required. Fix in Settings." : (preflightChecking ? "Running preflight connectivity check..." : "Start AI processing for the selected batch size.")} side="top">
                    <div className="w-full sm:w-auto">
                      <Button
                        onClick={handleProcessQueue}
                        disabled={isProcessingBatch || unprocessedMessages.length === 0 || !isAIConfigured || preflightChecking}
                        className={`w-full sm:w-auto ${!isAIConfigured ? 'opacity-60 cursor-not-allowed' : 'bg-accent hover:bg-accent/90'}`}
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
                            {isAIConfigured ? (
                              <>Process {Math.min(selectedBatchSize, unprocessedMessages.length)} Messages</>
                            ) : (
                              <>Process (AI unavailable)</>
                            )}
                          </>
                        )}
                      </Button>
                    </div>
                  </Tooltip>
                  {preflightError && (
                    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 self-center">
                      {preflightError}
                    </div>
                  )}
                  {isProcessingBatch && (
                    <Button 
                      onClick={cancelBatchProcessing}
                      variant="outline"
                      size="lg"
                      className="border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
              
              {isProcessingBatch && (
                <div className="p-4 bg-blue-50 rounded-lg shadow-md">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-blue-800">Batch Progress</span>
                    <span className="text-blue-700">{processedCount} of {totalToProcess} completed</span>
                  </div>
                  <Progress 
                    value={(processedCount / Math.max(1, totalToProcess)) * 100} 
                    className="h-2" 
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Triage Button */}
      {showTriageButton && (
        <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg shadow-lg border border-green-200 dark:border-green-800">
          <div className="p-6 text-center">
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                AI Processing Complete
              </div>
            </div>
            <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
              {readyForReview.length} messages ready for review
            </h3>
            <p className="text-green-700 dark:text-green-300 mb-6">
              Start reviewing AI-generated responses in the triage interface
            </p>
            <Button
              onClick={goToTriage}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <ArrowRight className="h-5 w-5 mr-2" />
              Go to Triage
            </Button>
          </div>
        </div>
      )}

      {/* Essential Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-card rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium">Total Messages</div>
          </div>
          <div className="text-2xl font-bold mb-2">{stats.totalMessages}</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-600">+{stats.pendingMessages}</span> pending review
          </p>
        </div>

        

        <div className="p-6 bg-card rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium">Avg Response Time</div>
          </div>
          <div className="text-2xl font-bold mb-2">{stats.avgResponseTime.toFixed(1)} min</div>
          <p className="text-xs text-muted-foreground">Processing efficiency</p>
        </div>

        <div className="p-6 bg-card rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium">SLA</div>
          </div>
          {totalSent === 0 ? (
            <p className="text-sm text-muted-foreground">No sent messages yet.</p>
          ) : (
            <div>
              <div className="w-full h-4 bg-muted rounded overflow-hidden flex">
                <div className="h-full bg-green-500" style={{ width: `${pctIn}%` }} />
                <div className="h-full bg-red-500" style={{ width: `${pctOut}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="text-green-600">{pctIn}% ({inSLA}/{totalSent})</span>
                <span className="text-red-600">{pctOut}% ({outSLA}/{totalSent})</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-card rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium">Oldest Pending Ticket</div>
          </div>
          {oldestTicket ? (
            <>
              <div className="text-2xl font-bold mb-2">{oldestTicket.ticketId}</div>
              <p
                className={`text-xs ${(() => {
                  const urgency = getMessageUrgency(oldestTicket.timestamp, uiSettings.messageAgeThresholds)
                  return urgency === 'red'
                    ? 'text-red-600'
                    : urgency === 'yellow'
                    ? 'text-yellow-600'
                    : 'text-green-600'
                })()}`}
              >
                {formatRelativeTime(oldestTicket.timestamp)}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold mb-2 text-muted-foreground">None</div>
              <p className="text-xs text-muted-foreground">No pending tickets</p>
            </>
          )}
        </div>
      </div>

      {/* Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="p-6 bg-card rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium">Cases by Category</div>
          </div>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cases yet.</p>
          ) : (
            <PieChart data={pieData} totalLabel="Total" />
          )}
          {uiSettings.categories.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">No categories configured — using detected categories from cases.</p>
          )}
        </div>
      </div>
    </div>
  )
}
