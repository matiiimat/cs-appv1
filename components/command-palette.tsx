"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Search, LayoutGrid, Inbox, BookOpen, Settings, Zap, ArrowRight } from "lucide-react"

type ViewMode = "queue" | "inbox" | "knowledge" | "settings"

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
  const inputRef = useRef<HTMLInputElement>(null)

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
      id: "nav-knowledge",
      label: "Go to Knowledge",
      shortcut: ["G", "K"],
      icon: <BookOpen className="w-4 h-4" />,
      action: () => { onNavigate("knowledge"); onClose() },
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

  // Flatten for index navigation
  const flatCommands = Object.values(groupedCommands).flat()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, flatCommands.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (flatCommands[selectedIndex]) {
          flatCommands[selectedIndex].action()
        }
        break
      case "Escape":
        e.preventDefault()
        onClose()
        break
    }
  }, [isOpen, flatCommands, selectedIndex, onClose])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setQuery("")
      setSelectedIndex(0)
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
            placeholder="Type a command or search..."
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

          {flatCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              No commands found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
