"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useMessageManager } from "@/lib/message-manager"
import { MessageSquare, Clock, Zap, PlayCircle, Target, Loader2 } from "lucide-react"
import { useState } from "react"

export function AgentDashboard() {
  const { stats, messages, generateAIResponse } = useMessageManager()
  const [selectedBatchSize, setSelectedBatchSize] = useState(100)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedCount, setProcessedCount] = useState(0)
  const [totalToProcess, setTotalToProcess] = useState(0)
  
  // Calculate queue metrics
  const unprocessedMessages = messages.filter(m => !m.autoReviewed && m.status === 'pending')
  const processingMessages = messages.filter(m => m.isGenerating)
  const readyForReview = messages.filter(m => m.autoReviewed && m.status === 'pending')
  
  const handleProcessQueue = async () => {
    setIsProcessing(true)
    setProcessedCount(0)
    
    // Get messages to process (up to batch size)
    const messagesToProcess = unprocessedMessages.slice(0, selectedBatchSize)
    setTotalToProcess(messagesToProcess.length)
    
    try {
      // Process messages one by one to avoid overwhelming the API
      for (let i = 0; i < messagesToProcess.length; i++) {
        const message = messagesToProcess[i]
        await generateAIResponse(message)
        setProcessedCount(i + 1)
        
        // Small delay between requests to avoid rate limiting
        if (i < messagesToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    } catch (error) {
      console.error('Error processing queue:', error)
    } finally {
      setIsProcessing(false)
      setProcessedCount(0)
      setTotalToProcess(0)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Support Dashboard</h1>
          <p className="text-muted-foreground">Manage AI processing queue and review operations</p>
        </div>
      </div>

      {/* Queue Management Hero Section */}
      <Card className="mb-8 border-2 border-accent/20 bg-gradient-to-r from-accent/5 to-accent/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle className="text-xl">AI Processing Queue</CardTitle>
                <p className="text-muted-foreground">Process customer messages with AI assistance</p>
              </div>
            </div>
            {(isProcessing || processingMessages.length > 0) && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="text-center p-4 bg-white rounded-lg border">
              <div className="text-3xl font-bold text-orange-600 mb-1">{unprocessedMessages.length}</div>
              <div className="text-sm text-muted-foreground">Messages awaiting AI review</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border">
              <div className="text-3xl font-bold text-green-600 mb-1">{readyForReview.length}</div>
              <div className="text-sm text-muted-foreground">Ready for agent review</div>
            </div>
          </div>
          
          {unprocessedMessages.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium mb-2">Process messages in batches</p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Batch size:</span>
                    {[50, 100, 200].map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedBatchSize(size)}
                        disabled={isProcessing}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          selectedBatchSize === size 
                            ? 'bg-accent text-accent-foreground' 
                            : 'bg-muted hover:bg-muted/80'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                <Button 
                  onClick={handleProcessQueue}
                  disabled={isProcessing || unprocessedMessages.length === 0}
                  className="bg-accent hover:bg-accent/90"
                  size="lg"
                >
                  {isProcessing ? (
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
              </div>
              
              {isProcessing && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">Batch Progress</span>
                    <span>{processedCount} of {totalToProcess} completed</span>
                  </div>
                  <Progress 
                    value={(processedCount / Math.max(1, totalToProcess)) * 100} 
                    className="h-2" 
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Essential Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{stats.pendingMessages}</span> pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvalRate.toFixed(1)}%</div>
            <Progress value={stats.approvalRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime.toFixed(1)} min</div>
            <p className="text-xs text-muted-foreground">Processing efficiency</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
