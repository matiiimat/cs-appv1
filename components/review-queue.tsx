"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useMessageManager } from "@/lib/message-manager"
import { useSettings } from "@/lib/settings-context"
import { formatEmailText, getMessageUrgency, getUrgencyBgClass, formatFriendlyDate } from "@/lib/utils"
import { MessageSquare, Clock, User, Tag, Eye, Zap, Loader2 } from "lucide-react"

export function ReviewQueue() {
  const { getMessagesByStatus, updateMessage } = useMessageManager()
  const { settings } = useSettings()

  const reviewMessages = getMessagesByStatus("to_review_queue")

  const handleQuickAction = async (messageId: string, actionTitle: string, actionInstruction: string) => {
    const message = reviewMessages.find(m => m.id === messageId)
    if (!message || !message.aiSuggestedResponse) return

    // Set loading state
    updateMessage(messageId, { isGenerating: true })

    try {
      const response = await fetch("/api/generate-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: message.customerName,
          customerEmail: message.customerEmail,
          subject: message.subject,
          message: message.message,
          aiConfig: settings.aiConfig,
          agentName: settings.agentName || "Support Agent",
          agentSignature: settings.agentSignature || "Best regards,\nSupport Team",
          categories: settings.categories,
          quickActionInstruction: actionInstruction, // Add the quick action instruction
          currentResponse: message.aiSuggestedResponse, // Include current response for modification
          companyKnowledge: settings.companyKnowledge,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to process quick action (${response.status})`)
      }

      const data = await response.json()

      // Update message with modified response
      updateMessage(messageId, {
        aiSuggestedResponse: data.aiSuggestedResponse,
        isGenerating: false,
      })
    } catch (error) {
      console.error("Error processing quick action:", error)
      updateMessage(messageId, { isGenerating: false })
    }
  }

  if (reviewMessages.length === 0) {
    return (
      <div className="text-center py-12">
        <Eye className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Messages to Review</h3>
        <p className="text-muted-foreground">All messages have been processed.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Review Queue</h2>
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          {reviewMessages.length} messages
        </Badge>
      </div>

      <div className="grid gap-4">
        {reviewMessages.map((message) => (
          <div key={message.id} className="bg-card rounded-lg shadow-md">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{message.customerName}</h3>
                    <p className="text-sm text-muted-foreground">{message.customerEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {message.category && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {message.category}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    Review
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Clock className="h-4 w-4" />
                <span className={`px-2 py-1 rounded text-sm font-medium ${getUrgencyBgClass(getMessageUrgency(message.timestamp, settings.messageAgeThresholds))}`}>
                  {formatFriendlyDate(message.timestamp)}
                </span>
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Subject: {message.subject}</h4>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words mb-4">{formatEmailText(message.message)}</p>
              </div>

              {message.aiSuggestedResponse && (
                <div className="border-t pt-4 mb-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-accent" />
                    AI Suggested Response
                  </h4>
                  <div className="bg-accent/5 p-3 rounded-lg shadow-sm">
                    <p className="text-foreground leading-relaxed whitespace-pre-line">
                      {formatEmailText(message.aiSuggestedResponse || "")}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent" />
                  Quick Actions
                </h5>
                <div className="flex gap-2">
                  {settings.quickActions.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction(message.id, action.title, action.action)}
                      disabled={message.isGenerating}
                      className="flex-1 max-w-[120px]"
                      title={action.action}
                    >
                      {message.isGenerating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        action.title
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
