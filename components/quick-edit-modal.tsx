"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useSettings } from "@/lib/settings-context"
import { useMessageManager } from "@/lib/message-manager"
import { formatEmailText } from "@/lib/utils"
import { useAIErrorHandler } from "@/lib/use-ai-error-handler"
import { X, Send, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react"

interface Message {
  id: string
  customerName: string
  customerEmail: string
  subject: string
  message: string
  aiSuggestedResponse?: string
  category?: string
}

interface QuickEditModalProps {
  isOpen: boolean
  onClose: () => void
  message: Message | null
  onSend?: () => void
}

export function QuickEditModal({ isOpen, onClose, message }: QuickEditModalProps) {
  const { settings } = useSettings()
  const { updateMessage, approveMessage } = useMessageManager()
  const { handleAIError } = useAIErrorHandler()
  const [draftResponse, setDraftResponse] = useState("")
  const [aiInput, setAiInput] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [showOriginalMessage, setShowOriginalMessage] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const aiInputRef = useRef<HTMLInputElement>(null)

  // Get agent ID
  const DEMO_AGENT_ID = process.env.NEXT_PUBLIC_DEMO_AGENT_ID
  const agentId = DEMO_AGENT_ID || ""

  // Initialize draft when modal opens
  useEffect(() => {
    if (isOpen && message) {
      setDraftResponse(formatEmailText(message.aiSuggestedResponse || ""))
      setAiInput("")
      setShowOriginalMessage(false)
      // Focus textarea after a brief delay
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen, message])

  // Define handleSend before effects that use it
  const handleSend = useCallback(async () => {
    if (!message || !draftResponse.trim()) return

    try {
      // Update message with edited response and approve
      await updateMessage(message.id, { aiSuggestedResponse: draftResponse })
      await approveMessage(message.id, agentId)
      onClose()
    } catch (error) {
      console.error("Failed to send:", error)
    }
  }, [message, draftResponse, updateMessage, approveMessage, agentId, onClose])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
      // Tab to focus AI input
      if (e.key === "Tab" && !e.shiftKey && document.activeElement === textareaRef.current) {
        e.preventDefault()
        aiInputRef.current?.focus()
      }
      // Cmd+Enter to send
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        handleSend()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose, handleSend])

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  const handleAiRefine = async () => {
    if (!aiInput.trim() || !message) return

    setIsAiLoading(true)
    try {
      const systemPrompt = `You are a customer support AI assistant. The user will give you an instruction to modify or refine the draft response below.

Customer message: ${message.message}
Current draft: ${draftResponse}
User instruction: ${aiInput}

Return ONLY the refined response text. No explanation, no quotes, no markdown.
End with the signature: "${settings.agentSignature}"`

      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiConfig: settings.aiConfig,
          system: systemPrompt,
          prompt: aiInput,
        }),
      })

      if (!resp.ok) {
        // Parse error response for better message
        const errorData = await resp.json().catch(() => ({}))
        const errorMsg = errorData.error || `Request failed (${resp.status})`
        throw new Error(errorMsg)
      }

      const data = await resp.json()
      setDraftResponse(data.content)
      setAiInput("")
    } catch (error) {
      handleAIError(error, "AI Refinement")
    } finally {
      setIsAiLoading(false)
    }
  }

  if (!isOpen || !message) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-semibold">Quick Edit</h2>
            <p className="text-sm text-muted-foreground">{message.customerEmail}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Original Message (collapsible) */}
          <div className="surface rounded-lg overflow-hidden">
            <button
              onClick={() => setShowOriginalMessage(!showOriginalMessage)}
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium">Original Message</span>
              {showOriginalMessage ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {showOriginalMessage && (
              <div className="px-3 pb-3">
                <p className="text-sm font-medium mb-1">{message.subject}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {message.message}
                </p>
              </div>
            )}
          </div>

          {/* Draft Response */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Response</label>
            <Textarea
              ref={textareaRef}
              value={draftResponse}
              onChange={e => setDraftResponse(e.target.value)}
              className="min-h-[200px] resize-none"
              placeholder="Edit your response..."
            />
          </div>

          {/* Inline AI Refinement */}
          <div className="ai-inline-input">
            <Sparkles className="h-4 w-4 text-accent flex-shrink-0" />
            <input
              ref={aiInputRef}
              type="text"
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleAiRefine()
                }
              }}
              placeholder="Type to refine: 'make it shorter', 'add empathy'..."
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
              disabled={isAiLoading}
            />
            {isAiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
            ) : aiInput.trim() ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleAiRefine}
                className="h-6 px-2 text-xs"
              >
                Refine
              </Button>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
          <div className="text-xs text-muted-foreground">
            <kbd className="kbd-sm">⌘</kbd>
            <kbd className="kbd-sm ml-0.5">↵</kbd>
            <span className="ml-2">to send</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={!draftResponse.trim()} className="bg-emerald-600 hover:bg-emerald-500">
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
