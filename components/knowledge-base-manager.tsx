"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BookOpen, Edit, Trash2, Search, Eye, EyeOff, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/components/ui/toast"
import { KnowledgeBaseStorage, type KnowledgeBaseEntry } from "@/lib/knowledge-base"

export function KnowledgeBaseManager() {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<KnowledgeBaseEntry[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { addToast } = useToast()

  const loadEntries = async () => {
    try {
      const response = await fetch('/api/knowledge-base')
      if (!response.ok) {
        throw new Error('Failed to fetch knowledge base entries')
      }
      const data = await response.json()
      setEntries(data.entries || [])
      setFilteredEntries(data.entries || [])
    } catch (error) {
      console.error('Error loading KB entries:', error)
      addToast({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load knowledge base entries.',
      })
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEntries(entries)
      return
    }

    const filtered = entries.filter(entry =>
      entry.case_summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.resolution.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredEntries(filtered)
  }, [searchQuery, entries])

  const handleEditEntry = (entry: KnowledgeBaseEntry) => {
    setEditingEntry(entry)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingEntry) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/knowledge-base', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingEntry.id,
          case_summary: editingEntry.case_summary,
          resolution: editingEntry.resolution,
          category: editingEntry.category,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update knowledge base entry')
      }

      await loadEntries()
      setIsEditModalOpen(false)
      setEditingEntry(null)
      addToast({
        type: 'success',
        title: 'Entry Updated',
        message: 'Knowledge base entry updated successfully.',
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update knowledge base entry.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEntry = async (entry: KnowledgeBaseEntry) => {
    if (!confirm(`Are you sure you want to delete this knowledge base entry?\n\n"${entry.case_summary.substring(0, 100)}..."`)) {
      return
    }

    try {
      const response = await fetch(`/api/knowledge-base?id=${entry.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete knowledge base entry')
      }

      await loadEntries()
      addToast({
        type: 'success',
        title: 'Entry Deleted',
        message: 'Knowledge base entry deleted successfully.',
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete knowledge base entry.',
      })
    }
  }

  const handleToggleEnabled = async (entry: KnowledgeBaseEntry) => {
    try {
      const response = await fetch('/api/knowledge-base', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: entry.id,
          enabled: !entry.enabled,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update knowledge base entry')
      }

      await loadEntries()
      addToast({
        type: 'success',
        title: 'Entry Updated',
        message: `Knowledge base entry ${!entry.enabled ? 'enabled' : 'disabled'}.`,
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update knowledge base entry.',
      })
    }
  }

  const updateEditingEntry = (field: keyof KnowledgeBaseEntry, value: string) => {
    if (!editingEntry) return
    setEditingEntry({ ...editingEntry, [field]: value })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Knowledge Base Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Manage your saved case resolutions that help improve AI response accuracy.
              </p>
            </div>
            <Badge variant="secondary">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search knowledge base entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No knowledge base entries yet</p>
                <p className="text-sm">
                  Start by adding cases to your knowledge base from the case detail pages.
                </p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No entries match your search.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`border rounded-lg p-4 space-y-3 ${
                      !entry.enabled ? 'opacity-60 bg-muted/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">
                            {entry.case_summary.substring(0, 80)}
                            {entry.case_summary.length > 80 && "..."}
                          </h4>
                          {entry.category && (
                            <Badge variant="outline" className="text-xs">
                              {entry.category}
                            </Badge>
                          )}
                          <Badge variant={entry.enabled ? "default" : "secondary"} className="text-xs">
                            {entry.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Resolution: {entry.resolution.substring(0, 120)}
                          {entry.resolution.length > 120 && "..."}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created: {format(new Date(entry.created_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleEnabled(entry)}
                          className="h-8 w-8 p-0"
                        >
                          {entry.enabled ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEntry(entry)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Knowledge Base Entry</DialogTitle>
            <DialogDescription>
              Modify the case summary and resolution for this knowledge base entry.
            </DialogDescription>
          </DialogHeader>

          {editingEntry && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="edit_case_summary">Case Summary</Label>
                <Textarea
                  id="edit_case_summary"
                  value={editingEntry.case_summary}
                  onChange={(e) => updateEditingEntry('case_summary', e.target.value)}
                  placeholder="Concise summary of the customer issue..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="edit_resolution">Resolution</Label>
                <Textarea
                  id="edit_resolution"
                  value={editingEntry.resolution}
                  onChange={(e) => updateEditingEntry('resolution', e.target.value)}
                  placeholder="How the issue was resolved..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="edit_category">Category</Label>
                <Input
                  id="edit_category"
                  value={editingEntry.category || ''}
                  onChange={(e) => updateEditingEntry('category', e.target.value)}
                  placeholder="Issue category (optional)"
                  className="mt-2"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isLoading || !editingEntry.case_summary.trim() || !editingEntry.resolution.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}