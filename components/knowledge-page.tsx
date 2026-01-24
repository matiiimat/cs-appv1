"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, User, Mail, MessageSquare, Clock, BookOpen, X } from "lucide-react"
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
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Search Bar - Fixed at top */}
      <div className="flex-shrink-0 border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-9 h-10 bg-muted/30 border-border/50"
              />
            </div>
            <Select value={searchField} onValueChange={setSearchField}>
              <SelectTrigger className="w-[140px] h-10 bg-transparent border-border/50">
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
            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[120px] h-10 bg-transparent border-border/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="to_send_queue">Approved</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="to_review_queue">Review</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={loading} size="sm" className="h-10 px-5">
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>

          {error && (
            <div className="mt-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results Area - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Empty state when no search yet */}
          {!results && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="h-10 w-10 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-medium mb-1">Search your message history</h3>
              <p className="text-sm text-muted-foreground">
                Find cases by ID, subject, message content, or customer email
              </p>
            </div>
          )}

          {/* Search Results */}
          {results && (
            <>
              {/* Results header */}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {results.pagination.total} {results.pagination.total === 1 ? 'result' : 'results'}
                  {` for "${results.query.text}"`}
                  {results.query.field !== 'all' && ` in ${results.query.field.replace('_', ' ')}`}
                </p>
              </div>

              {results.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Search className="h-10 w-10 text-muted-foreground/20 mb-4" />
                  <h3 className="text-lg font-medium mb-1">No results found</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your search criteria</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {results.messages.map((message, index) => (
                    <div key={message.id}>
                      <div
                        className="group py-3 px-3 -mx-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => openCaseModal(message.ticket_id)}
                        role="button"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                            {(message.customer_name || "?").charAt(0).toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Top row: name, status, date */}
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium text-sm">{message.customer_name || "Unknown"}</span>
                              <span className="text-xs text-muted-foreground font-mono">{message.ticket_id}</span>
                              <span className={`status-badge text-[10px] ${STATUS_COLORS[message.status]}`}>
                                {STATUS_LABELS[message.status] || message.status}
                              </span>
                              {message.category && (
                                <span className="text-[10px] text-muted-foreground">{message.category}</span>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto">
                                {formatDate(message.created_at)}
                              </span>
                            </div>

                            {/* Subject */}
                            {message.subject && (
                              <p className="text-sm mb-0.5">
                                {highlightSearchTerm(message.subject, results.query.text)}
                              </p>
                            )}

                            {/* Message preview */}
                            {message.message && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {highlightSearchTerm(truncateText(message.message, 120), results.query.text)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      {index < results.messages.length - 1 && (
                        <div className="border-b border-border/30 mx-11" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {results.pagination.pages > 1 && (
                <div className="mt-8 flex justify-center">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={results.pagination.page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground px-3">
                      {results.pagination.page} / {results.pagination.pages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={results.pagination.page >= results.pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
