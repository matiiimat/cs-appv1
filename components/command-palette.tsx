"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Search, LayoutGrid, Inbox, Settings, Zap, ArrowRight, Loader2, FileText } from "lucide-react"

type ViewMode = "queue" | "inbox" | "settings"

interface CaseResult {
  id: string
  ticket_id: string
  subject: string | null
  status: string
  category: string | null
}

interface CommandItem {
  id: string
  label: string
  shortcut?: string[]
  icon?: React.ReactNode
  action: () => void
  category: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (view: ViewMode) => void
  currentView?: ViewMode
  onStartTriage?: () => void
  onProcessQueue?: () => void
  hasMessagesToProcess?: boolean
  hasMessagesToTriage?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  to_send_queue: "Approved",
  rejected: "Rejected",
  edited: "Edited",
  sent: "Sent",
  to_review_queue: "Review"
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-400",
  to_send_queue: "bg-emerald-500/15 text-emerald-400",
  rejected: "bg-red-500/15 text-red-400",
  edited: "bg-amber-500/15 text-amber-400",
  sent: "bg-emerald-500/15 text-emerald-400",
  to_review_queue: "bg-amber-500/15 text-amber-400"
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onStartTriage,
  onProcessQueue,
  hasMessagesToProcess = false,
  hasMessagesToTriage = false,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [caseResults, setCaseResults] = useState<CaseResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const commands: CommandItem[] = [
    // Navigation
    {
      id: "nav-queue",
      label: "Go to Queue",
      shortcut: ["G", "Q"],
      icon: <LayoutGrid className="w-4 h-4" />,
      action: () => { onNavigate("queue"); onClose() },
      category: "Navigation",
    },
    {
      id: "nav-inbox",
      label: "Go to Inbox",
      shortcut: ["G", "I"],
      icon: <Inbox className="w-4 h-4" />,
      action: () => { onNavigate("inbox"); onClose() },
      category: "Navigation",
    },
    {
      id: "nav-settings",
      label: "Go to Settings",
      shortcut: ["G", "S"],
      icon: <Settings className="w-4 h-4" />,
      action: () => { onNavigate("settings"); onClose() },
      category: "Navigation",
    },
    // Actions
    ...(hasMessagesToProcess && onProcessQueue ? [{
      id: "action-process",
      label: "Process Queue",
      shortcut: ["P"],
      icon: <Zap className="w-4 h-4" />,
      action: () => { onProcessQueue(); onClose() },
      category: "Actions",
    }] : []),
    ...(hasMessagesToTriage && onStartTriage ? [{
      id: "action-triage",
      label: "Start Triage",
      shortcut: ["T"],
      icon: <ArrowRight className="w-4 h-4" />,
      action: () => { onStartTriage(); onClose() },
      category: "Actions",
    }] : []),
  ]

  const filteredCommands = query
    ? commands.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
      )
    : commands

  // Group by category
  const groupedCommands = filteredCommands.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category].push(cmd)
    return acc
  }, {})

  // Total items count (commands + case results)
  const totalItems = filteredCommands.length + caseResults.length

  // Search for cases when query has 2+ characters
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query || query.length < 2) {
      setCaseResults([])
      setIsSearching(false)
      return
    }

    // Create abort controller for this search request
    const abortController = new AbortController()
    let isCancelled = false

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/messages/search?q=${encodeURIComponent(query)}&limit=5`,
          { signal: abortController.signal }
        )
        if (!isCancelled && response.ok) {
          const data = await response.json()
          setCaseResults(data.messages || [])
        } else if (!isCancelled) {
          setCaseResults([])
        }
      } catch (error) {
        // Only update state if not aborted
        if (!isCancelled && !(error instanceof DOMException && error.name === 'AbortError')) {
          setCaseResults([])
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false)
        }
      }
    }, 300)

    return () => {
      isCancelled = true
      abortController.abort()
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query])

  // Navigate to case detail
  const navigateToCase = useCallback((ticketId: string) => {
    const caseId = ticketId.replace(/^#/, '')
    window.location.href = `/app/c/${caseId}`
    onClose()
  }, [onClose])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, totalItems - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        // If index is within commands range
        if (selectedIndex < filteredCommands.length) {
          filteredCommands[selectedIndex]?.action()
        } else {
          // Index is in case results range
          const caseIndex = selectedIndex - filteredCommands.length
          if (caseResults[caseIndex]) {
            navigateToCase(caseResults[caseIndex].ticket_id)
          }
        }
        break
      case "Escape":
        e.preventDefault()
        onClose()
        break
    }
  }, [isOpen, totalItems, filteredCommands, caseResults, selectedIndex, onClose, navigateToCase])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setQuery("")
      setSelectedIndex(0)
      setCaseResults([])
      setIsSearching(false)
    }
  }, [isOpen])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!isOpen) return null

  let currentIndex = 0

  return (
    <div className="command-palette" onClick={onClose}>
      <div className="command-palette-overlay" />
      <div
        className="command-palette-content"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search cases or type a command..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="command-palette-input border-0 px-0"
          />
          <kbd className="kbd-sm">esc</kbd>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto py-2">
          {Object.entries(groupedCommands).map(([category, items]) => (
            <div key={category}>
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {category}
              </div>
              {items.map(item => {
                const itemIndex = currentIndex++
                const isSelected = itemIndex === selectedIndex

                return (
                  <div
                    key={item.id}
                    className={`command-palette-item ${isSelected ? "command-palette-item-active" : ""}`}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{item.icon}</span>
                      <span className="text-foreground">{item.label}</span>
                    </div>
                    {item.shortcut && (
                      <div className="command-palette-shortcut">
                        {item.shortcut.map((key, i) => (
                          <kbd key={i} className="kbd-sm">{key}</kbd>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Case Search Results */}
          {(caseResults.length > 0 || isSearching) && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                Cases
                {isSearching && <Loader2 className="w-3 h-3 animate-spin" />}
              </div>
              {caseResults.map((caseItem) => {
                const itemIndex = currentIndex++
                const isSelected = itemIndex === selectedIndex

                return (
                  <div
                    key={caseItem.id}
                    className={`command-palette-item ${isSelected ? "command-palette-item-active" : ""}`}
                    onClick={() => navigateToCase(caseItem.ticket_id)}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-muted-foreground">
                        <FileText className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{caseItem.ticket_id}</span>
                          <span className="text-foreground truncate">
                            {caseItem.subject || "No subject"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[caseItem.status] || 'bg-muted text-muted-foreground'}`}>
                      {STATUS_LABELS[caseItem.status] || caseItem.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {filteredCommands.length === 0 && caseResults.length === 0 && !isSearching && query.length >= 2 && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <p>No results found</p>
              <p className="text-xs mt-1">Try a case ID (e.g. 1234) or different keywords</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
