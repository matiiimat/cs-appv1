"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ExternalLink, Calendar, User, Mail } from "lucide-react"
import { format } from "date-fns"

interface Message {
  id: string
  ticket_id: string
  customer_name: string | null
  customer_email: string | null
  subject: string | null
  message: string | null
  category: string | null
  status: string
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

export function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchField, setSearchField] = useState("all")
  const [statusFilter, setStatusFilter] = useState("")
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

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

  const openCaseInNewTab = (ticketId: string) => {
    const caseId = ticketId.replace('#', '')
    window.open(`/c/${caseId}`, '_blank')
  }

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
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">{part}</mark> :
        part
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search Messages</h1>
        <p className="text-muted-foreground">
          Search through your organization's message history
        </p>
      </div>

      {/* Search Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Criteria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Enter search terms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full"
              />
            </div>
            <div>
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
            <div>
              <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="to_send_queue">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="edited">Edited</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="to_review_queue">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {results && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-muted-foreground">
              Found {results.pagination.total} result {results.pagination.total !== 1 ? 's' : ''}
              for "{results.query.text}"
              {results.query.field !== 'all' && ` in ${results.query.field.replace('_', ' ')}`}
            </p>
          </div>

          {results.messages.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No messages found matching your search criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {results.messages.map((message) => (
                <Card key={message.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{message.ticket_id}</h3>
                        <Badge
                          className={STATUS_COLORS[message.status as keyof typeof STATUS_COLORS]}
                          variant="secondary"
                        >
                          {STATUS_LABELS[message.status as keyof typeof STATUS_LABELS] || message.status}
                        </Badge>
                        {message.category && (
                          <Badge variant="outline">{message.category}</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCaseInNewTab(message.ticket_id)}
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{message.customer_name || "Unknown Customer"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{message.customer_email || "No email"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(message.created_at)}</span>
                      </div>
                    </div>

                    {message.subject && (
                      <div className="mb-3">
                        <p className="font-medium text-sm text-muted-foreground mb-1">Subject:</p>
                        <p className="text-sm">
                          {highlightSearchTerm(message.subject, results.query.text)}
                        </p>
                      </div>
                    )}

                    {message.message && (
                      <div>
                        <p className="font-medium text-sm text-muted-foreground mb-1">Message:</p>
                        <p className="text-sm leading-relaxed">
                          {highlightSearchTerm(truncateText(message.message), results.query.text)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
    </div>
  )
}