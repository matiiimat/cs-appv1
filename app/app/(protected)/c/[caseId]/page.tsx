"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, Mail } from "lucide-react"
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
  new: "bg-blue-500/15 text-blue-400",
  to_send_queue: "bg-emerald-500/15 text-emerald-400",
  rejected: "bg-red-500/15 text-red-400",
  edited: "bg-amber-500/15 text-amber-400",
  sent: "bg-emerald-500/15 text-emerald-400",
  to_review_queue: "bg-purple-500/15 text-purple-400"
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
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-40 bg-muted rounded w-3/4"></div>
            <div className="h-40 bg-muted rounded w-3/4 ml-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !message) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/app">
            <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
          </Link>

          <div className="text-center py-16">
            <h2 className="text-xl font-semibold mb-2">Case Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {error || "This case doesn't exist or you don't have access."}
            </p>
            <Link href="/app">
              <Button>Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Compact Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/app">
              <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold truncate">Case {message.ticket_id}</h1>
            <Badge className={STATUS_COLORS[message.status as keyof typeof STATUS_COLORS]}>
              {STATUS_LABELS[message.status as keyof typeof STATUS_LABELS] || message.status}
            </Badge>
            {message.category && (
              <Badge variant="outline" className="hidden sm:inline-flex">{message.category}</Badge>
            )}
          </div>
          <Button
            onClick={() => setShowKnowledgeBaseModal(true)}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <BookOpen className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Add to KB</span>
          </Button>
        </div>

        {/* Subject (if exists) */}
        {message.subject && (
          <div className="mb-6 pb-4 border-b border-border/50">
            <h2 className="text-xl font-medium">{message.subject}</h2>
          </div>
        )}

        {/* Conversation Thread */}
        <div className="space-y-6">
          {/* Customer Message */}
          {message.message && (
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                {/* Customer info bar */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center text-xs font-medium text-emerald-600">
                    {(message.customer_name || "C").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{message.customer_name || "Customer"}</span>
                  {message.customer_email && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {message.customer_email}
                    </span>
                  )}
                </div>
                {/* Message bubble */}
                <div className="bg-emerald-500/10 rounded-2xl rounded-tl-md px-4 py-3">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.message}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 ml-1">
                  {formatDate(message.created_at)}
                </p>
              </div>
            </div>
          )}

          {/* AI/Brand Response */}
          {message.ai_suggested_response && (
            <div className="flex justify-end">
              <div className="max-w-[85%]">
                {/* Brand info bar */}
                <div className="flex items-center justify-end gap-2 mb-2">
                  <span className="text-sm font-medium">
                    {message.status === 'sent' ? 'Sent' : 'AI Draft'}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center text-xs font-medium text-blue-600">
                    AI
                  </div>
                </div>
                {/* Response bubble */}
                <div className="bg-blue-500/10 rounded-2xl rounded-tr-md px-4 py-3">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.ai_suggested_response}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 mr-1 text-right">
                  {message.processed_at ? formatDate(message.processed_at) : formatDate(message.updated_at)}
                </p>
              </div>
            </div>
          )}
        </div>
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