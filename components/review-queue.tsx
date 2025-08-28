"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useMessageManager } from "@/lib/message-manager"
import { formatEmailText } from "@/lib/utils"
import { MessageSquare, Clock, User, Tag, Eye, CheckCircle, XCircle } from "lucide-react"

export function ReviewQueue() {
  const { getMessagesByStatus, approveMessage, rejectMessage } = useMessageManager()

  const reviewMessages = getMessagesByStatus("review")

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive text-destructive-foreground"
      case "medium":
        return "bg-secondary text-secondary-foreground"
      case "low":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const handleApproveFromReview = (messageId: string) => {
    approveMessage(messageId, "agent-1")
  }

  const handleRejectFromReview = (messageId: string) => {
    rejectMessage(messageId, "agent-1", "Rejected after manual review")
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
          <Card key={message.id} className="border-orange-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{message.customerName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{message.customerEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {message.priority && <Badge className={getPriorityColor(message.priority)}>{message.priority}</Badge>}
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
                {message.timestamp}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Subject: {message.subject}</h4>
                <p className="text-foreground leading-relaxed mb-4">{message.message}</p>
              </div>

              {message.aiSuggestedResponse && (
                <div className="border-t pt-4 mb-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-accent" />
                    AI Suggested Response
                  </h4>
                  <div className="bg-accent/5 p-3 rounded-lg border border-accent/20">
                    <p className="text-foreground leading-relaxed whitespace-pre-line">
                      {formatEmailText(message.aiSuggestedResponse || "")}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => handleApproveFromReview(message.id)}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Send
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRejectFromReview(message.id)}
                  className="flex-1 border-red-200 hover:border-red-400 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
