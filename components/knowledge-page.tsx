"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Calendar, User, Mail, MessageSquare, Clock, BookOpen, X } from "lucide-react"
import { format } from "date-fns"
import { AddToKnowledgeBaseModal } from "@/components/add-to-knowledge-base-modal"

interface Message {
  id: string
  organization_id: string
  ticket_id: string
  customer_name: string | null
  customer_email: string | null
  subject: string | null
  message: string | null
  category: string | null
  ai_suggested_response: string | null
  status: string
  agent_id: string | null
  processed_at: string | null
  response_time_ms: number | null
  auto_reviewed: boolean
  is_generating: boolean
  edit_history: unknown[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface SearchResult {
  messages: Message[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
  query: {
    text: string
    field: string
    status?: string
  }
}

const STATUS_COLORS: Record<string, string> = {
  new: "status-new",
  to_send_queue: "status-sent",
  rejected: "bg-red-500/15 text-red-400",
  edited: "bg-amber-500/15 text-amber-400",
  sent: "status-sent",
  to_review_queue: "status-review"
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  to_send_queue: "Approved",
  rejected: "Rejected",
  edited: "Edited",
  sent: "Sent",
  to_review_queue: "Review"
}

export function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchField, setSearchField] = useState("all")
  const [statusFilter, setStatusFilter] = useState("")
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCase, setSelectedCase] = useState<Message | null>(null)
  const [showKnowledgeBaseModal, setShowKnowledgeBaseModal] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search query")
      return
    }

    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        field: searchField,
        ...(statusFilter && { status: statusFilter })
      })

      const response = await fetch(`/api/messages/search?${params}`)
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const openCaseModal = async (ticketId: string) => {
    const caseId = ticketId.replace('#', '')

    try {
      const response = await fetch(`/api/messages/case/${caseId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch case details')
      }

      const data = await response.json()
      setSelectedCase(data.message)
      setModalOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load case details')
    }
  }

  // Lock background scroll when modal is open
  useEffect(() => {
    if (!modalOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [modalOpen])

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
  }

  const truncateText = (text: string | null, maxLength: number = 200) => {
    if (!text) return ""
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text
  }

  const highlightSearchTerm = (text: string | null, searchTerm: string) => {
    if (!text || !searchTerm) return text || ""

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ?
        <mark key={index} className="bg-accent/30 text-accent-foreground px-0.5 rounded">{part}</mark> :
        part
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Knowledge</h1>
        <p className="text-muted-foreground">
          Search message history and manage your knowledge base
        </p>
      </div>

      {/* Search Form */}
      <div className="surface-elevated rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Search</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <Input
              placeholder="Search cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full"
            />
          </div>
          <div className="md:col-span-3">
            <Select value={searchField} onValueChange={setSearchField}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                <SelectItem value="ticket_id">Case ID</SelectItem>
                <SelectItem value="subject">Subject</SelectItem>
                <SelectItem value="message">Message Body</SelectItem>
                <SelectItem value="customer_email">Customer Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Any Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="to_send_queue">Approved</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="to_review_queue">Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleSearch} disabled={loading} className="w-full">
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Search Results */}
      {results && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found {results.pagination.total} {results.pagination.total === 1 ? 'result' : 'results'}
              {` for "${results.query.text}"`}
              {results.query.field !== 'all' && ` in ${results.query.field.replace('_', ' ')}`}
            </p>
          </div>

          {results.messages.length === 0 ? (
            <div className="surface rounded-xl p-12">
              <div className="empty-state">
                <Search className="empty-state-icon" />
                <h3 className="empty-state-title">No results found</h3>
                <p className="empty-state-description">Try adjusting your search criteria</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {results.messages.map((message) => (
                <div
                  key={message.id}
                  className="surface hover:bg-muted/50 transition-colors rounded-lg p-4 cursor-pointer"
                  onClick={() => openCaseModal(message.ticket_id)}
                  role="button"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm font-medium">{message.ticket_id}</span>
                        <span className={`status-badge ${STATUS_COLORS[message.status]}`}>
                          {STATUS_LABELS[message.status] || message.status}
                        </span>
                        {message.category && (
                          <Badge variant="outline" className="text-xs">{message.category}</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {message.customer_name || "Unknown"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {message.customer_email || "No email"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(message.created_at)}
                        </span>
                      </div>

                      {message.subject && (
                        <p className="font-medium text-sm mb-1">
                          {highlightSearchTerm(message.subject, results.query.text)}
                        </p>
                      )}

                      {message.message && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {highlightSearchTerm(truncateText(message.message, 150), results.query.text)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {results.pagination.pages > 1 && (
            <div className="mt-6 flex justify-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={results.pagination.page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {results.pagination.page} of {results.pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={results.pagination.page >= results.pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Case Details Modal */}
      {modalOpen && selectedCase && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div
            className="modal-content max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-bold">{selectedCase.subject || "No Subject"}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-mono text-muted-foreground">{selectedCase.ticket_id}</span>
                  <span className={`status-badge ${STATUS_COLORS[selectedCase.status]}`}>
                    {STATUS_LABELS[selectedCase.status] || selectedCase.status}
                  </span>
                  {selectedCase.category && (
                    <Badge variant="outline" className="text-xs">{selectedCase.category}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowKnowledgeBaseModal(true)}
                  variant="outline"
                  size="sm"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Add to KB
                </Button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{selectedCase.customer_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">Customer</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{selectedCase.customer_email || "No email"}</p>
                    <p className="text-xs text-muted-foreground">Email</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {selectedCase.processed_at ? formatDate(selectedCase.processed_at) : "Not processed"}
                    </p>
                    <p className="text-xs text-muted-foreground">Processed</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {STATUS_LABELS[selectedCase.status] || selectedCase.status}
                    </p>
                    <p className="text-xs text-muted-foreground">Status</p>
                  </div>
                </div>
              </div>

              {/* Customer Message */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full" />
                  Customer Message
                </h3>
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedCase.message || "No message"}</p>
                </div>
              </div>

              {/* Response */}
              {selectedCase.ai_suggested_response && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                    Response
                  </h3>
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedCase.ai_suggested_response}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Base Modal */}
      {selectedCase && (
        <AddToKnowledgeBaseModal
          isOpen={showKnowledgeBaseModal}
          onClose={() => setShowKnowledgeBaseModal(false)}
          message={selectedCase}
        />
      )}
    </div>
  )
}
