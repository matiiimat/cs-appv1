"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, User, Mail, MessageSquare, BookOpen } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { AddToKnowledgeBaseModal } from "@/components/add-to-knowledge-base-modal"

interface Message {
  id: string
  ticket_id: string
  customer_name: string | null
  customer_email: string | null
  subject: string | null
  message: string | null
  ai_suggested_response: string | null
  category: string | null
  status: string
  created_at: string
  updated_at: string
  processed_at: string | null
  agent_id: string | null
}

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  to_send_queue: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  edited: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  sent: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  to_review_queue: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
}

const STATUS_LABELS = {
  new: "New",
  to_send_queue: "Approved",
  rejected: "Rejected",
  edited: "Edited",
  sent: "Sent",
  to_review_queue: "Review"
}

export default function CaseViewPage() {
  const params = useParams()
  const caseId = params.caseId as string

  const [message, setMessage] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showKnowledgeBaseModal, setShowKnowledgeBaseModal] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log('Case detail page loaded, message:', message)
    console.log('Show KB Modal state:', showKnowledgeBaseModal)
  }, [message, showKnowledgeBaseModal])

  useEffect(() => {
    const fetchCase = async () => {
      if (!caseId) return

      try {
        const response = await fetch(`/api/messages/case/${caseId}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Case not found')
          }
          throw new Error('Failed to load case')
        }

        const data = await response.json()
        setMessage(data.message)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load case')
      } finally {
        setLoading(false)
      }
    }

    fetchCase()
  }, [caseId])

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !message) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <Link href="/app">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Case Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error || "The case you're looking for doesn't exist or you don't have permission to view it."}
            </p>
            <Link href="/app">
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/app">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="flex items-center flex-wrap gap-4">
          <h1 className="text-3xl font-bold">Case {message.ticket_id}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={STATUS_COLORS[message.status as keyof typeof STATUS_COLORS]}
              variant="secondary"
            >
              {STATUS_LABELS[message.status as keyof typeof STATUS_LABELS] || message.status}
            </Badge>
            {message.category && (
              <Badge variant="outline">{message.category}</Badge>
            )}
            <Button
              onClick={() => {
                console.log('Add to Knowledge Base button clicked')
                setShowKnowledgeBaseModal(true)
              }}
              variant="outline"
              size="sm"
              className="ml-2"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Add to Knowledge Base
            </Button>
          </div>
        </div>
      </div>

      {/* Case Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p>{message.customer_name || "Unknown Customer"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {message.customer_email || "No email provided"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Received</p>
              <p>{formatDate(message.created_at)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p>{formatDate(message.updated_at)}</p>
            </div>
            {message.processed_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Processed</p>
                <p>{formatDate(message.processed_at)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Thread */}
      <div className="space-y-6">
        {/* Original Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Original Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {message.subject && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Subject</p>
                <p className="font-medium">{message.subject}</p>
              </div>
            )}

            {message.message && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Message</p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap leading-relaxed">{message.message}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Response (if exists) */}
        {message.ai_suggested_response && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {message.status === 'sent' ? 'Sent Response' : 'AI Suggested Response'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="whitespace-pre-wrap leading-relaxed">{message.ai_suggested_response}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8">
        <Link href="/app">
          <Button variant="outline">
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Knowledge Base Modal */}
      {message && (
        <AddToKnowledgeBaseModal
          isOpen={showKnowledgeBaseModal}
          onClose={() => setShowKnowledgeBaseModal(false)}
          message={message}
          sourceTicketId={message.ticket_id?.replace(/^#/, '')}
        />
      )}
    </div>
  )
}