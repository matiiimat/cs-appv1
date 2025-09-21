"use client"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useMessageManager } from "@/lib/message-manager"
import { formatRelativeTime } from "@/lib/utils"
import { MessageSquare, Clock, Zap, PlayCircle, Loader2, AlertCircle } from "lucide-react"
import { PieChart } from "@/components/ui/pie-chart"
import { useSettings } from "@/lib/settings-context"
import { useState } from "react"

export function AgentDashboard() {
  const { stats, messages, isProcessingBatch, processedCount, totalToProcess, processBatch, cancelBatchProcessing } = useMessageManager()
  const [selectedBatchSize, setSelectedBatchSize] = useState(100)
  
  // Calculate queue metrics
  const unprocessedMessages = messages.filter(m => !m.autoReviewed && m.status === 'pending')
  const processingMessages = messages.filter(m => m.isGenerating)
  const readyForReview = messages.filter(m => m.autoReviewed && m.status === 'pending')
  
  // Find oldest pending ticket (includes both pending and review status)
  const pendingMessages = messages.filter(m => m.status === 'pending' || m.status === 'review')
  const oldestTicket = pendingMessages.length > 0 
    ? pendingMessages.reduce((oldest, current) => 
        new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest
      )
    : null
  
  const handleProcessQueue = async () => {
    await processBatch(selectedBatchSize)
  }

  // Category distribution for pie chart
  const categoryCounts = messages.reduce<Record<string, number>>((acc, m) => {
    const key = (m.category && m.category.trim()) || 'Uncategorized'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  // Use configured category colors when available; fallback palette otherwise
  const { settings: uiSettings } = useSettings()
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-accent" />
              </div>
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
              <div className="flex items-center gap-4 p-4 bg-card rounded-lg shadow-md">
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
                <div className="flex gap-2">
                  <Button 
                    onClick={handleProcessQueue}
                    disabled={isProcessingBatch || unprocessedMessages.length === 0}
                    className="bg-accent hover:bg-accent/90"
                    size="lg"
                  >
                    {isProcessingBatch ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Process {Math.min(selectedBatchSize, unprocessedMessages.length)} Messages
                      </>
                    )}
                  </Button>
                  {isProcessingBatch && (
                    <Button 
                      onClick={cancelBatchProcessing}
                      variant="outline"
                      size="lg"
                      className="border-red-200 text-red-600 hover:bg-red-50"
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

      {/* Essential Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-card rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium">Total Messages</div>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold mb-2">{stats.totalMessages}</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-600">+{stats.pendingMessages}</span> pending review
          </p>
        </div>

        

        <div className="p-6 bg-card rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium">Avg Response Time</div>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold mb-2">{stats.avgResponseTime.toFixed(1)} min</div>
          <p className="text-xs text-muted-foreground">Processing efficiency</p>
        </div>

        <div className="p-6 bg-card rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium">Oldest Pending Ticket</div>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          {oldestTicket ? (
            <>
              <div className="text-2xl font-bold mb-2">{oldestTicket.ticketId}</div>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(oldestTicket.timestamp)}</p>
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
