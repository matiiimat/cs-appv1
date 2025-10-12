"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMessageManager } from "@/lib/message-manager"
import { useSettings } from "@/lib/settings-context"
import { formatEmailText, getMessageUrgency, getUrgencyBgClass, formatFriendlyDate } from "@/lib/utils"
import { CategorySelector } from "@/components/ui/category-selector"
import { Tooltip } from "@/components/ui/tooltip"
import { Clock, User, Send, Bot, Zap, MessageSquare } from "lucide-react"

interface ChatMessage {
  id: string
  content: string
  sender: "agent" | "ai"
  timestamp: Date
}

export function DetailedReviewInterface() {
  const { messages, updateMessage, updateMessageCategory, getDraftReply, updateDraftReply } = useMessageManager()
  const { settings, aiConfigHasKey } = useSettings()

  // Get agent ID - use demo agent for demo organization, otherwise require auth
  const DEMO_AGENT_ID = process.env.NEXT_PUBLIC_DEMO_AGENT_ID

  const getAgentId = () => {
    // TODO: Replace with real user authentication
    // const { user } = useAuth()
    // return user?.id

    // For demo organization, use demo agent
    if (DEMO_AGENT_ID) {
      console.warn('🚨 DEMO AGENT ID IN USE - This must be replaced with real user authentication for production. Current agent:', DEMO_AGENT_ID)
      return DEMO_AGENT_ID
    }

    throw new Error('No agent context available. Implement user authentication.')
  }

  const agentId = getAgentId()
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [aiChatInput, setAiChatInput] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  // Generate unique IDs for chat items to avoid key collisions
  const genId = () => {
    try {
      // Prefer cryptographically-strong UUIDs when available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g: any = globalThis as any
      if (g?.crypto?.randomUUID) return g.crypto.randomUUID()
    } catch {
      // ignore
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }
  
  // Get current draft reply for selected message
  const replyText = selectedMessageId ? getDraftReply(selectedMessageId) : ""
  
  // Function to update reply text
  const setReplyText = (text: string) => {
    if (selectedMessageId) {
      updateDraftReply(selectedMessageId, text)
    }
  }

  const reviewMessages = messages
    .filter((msg) => msg.status === "to_review_queue")
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) // Sort by date, oldest first
  const selectedMessage = reviewMessages.find((msg) => msg.id === selectedMessageId)

  useEffect(() => {
    if (reviewMessages.length > 0 && !selectedMessageId) {
      setSelectedMessageId(reviewMessages[0].id)
    }
  }, [reviewMessages, selectedMessageId])

  useEffect(() => {
    if (selectedMessage?.aiSuggestedResponse && selectedMessageId) {
      // Only set draft if no existing draft exists
      const existingDraft = getDraftReply(selectedMessageId)
      if (!existingDraft) {
        updateDraftReply(selectedMessageId, formatEmailText(selectedMessage.aiSuggestedResponse))
      }
    }
  }, [selectedMessage, selectedMessageId, getDraftReply, updateDraftReply])

  const handleApprove = useCallback(async () => {
    if (selectedMessage) {
      try {
        await updateMessage(selectedMessage.id, { status: "sent", agentId })
        setChatMessages([])
        // Navigation will be handled by useEffect when reviewMessages updates
      } catch (error) {
        console.error('Failed to approve message:', error)
        alert('Authentication required. Please implement user login.')
      }
    }
  }, [selectedMessage, updateMessage, setChatMessages, agentId])

  // Auto-navigate when reviewMessages changes (after approve/etc)
  useEffect(() => {
    if (selectedMessageId && !reviewMessages.find(msg => msg.id === selectedMessageId)) {
      // Current message was removed, select the first available message
      if (reviewMessages.length > 0) {
        setSelectedMessageId(reviewMessages[0].id)
      } else {
        setSelectedMessageId(null)
      }
    }
  }, [reviewMessages, selectedMessageId])



  // Auto-scroll to bottom when new chat messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [chatMessages])


  const handleAiChat = async () => {
    if (!aiChatInput.trim() || !selectedMessage) return

    // Check for category change commands
    const categoryChangeRegex = /(?:change|set|update).*category.*(?:to|as)\s+(.+)/i
    const categoryMatch = aiChatInput.match(categoryChangeRegex)
    
    if (categoryMatch) {
      const requested = categoryMatch[1].trim().replace(/['"]/g, '')
      const available = settings.categories || []
      const match = available.find(c => c.name.toLowerCase() === requested.toLowerCase())

      if (!match) {
        console.info(
          `Category change ignored: "${requested}" not found. Available: ${available.map(c => c.name).join(', ')}`
        )
        // Do nothing else per requirement (no UI change)
        return
      }

      // Use canonical category name from settings
      updateMessageCategory(selectedMessage.id, match.name)
      
      const confirmMessage: ChatMessage = {
        id: genId(),
        content: `✅ Category changed to "${match.name}" for this message.`,
        sender: "ai",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, 
        { id: genId(), content: aiChatInput, sender: "agent", timestamp: new Date() },
        confirmMessage
      ])
      setAiChatInput("")
      return
    }

    // Check if AI is configured
    const isLocal = settings.aiConfig.provider === 'local'
    const hasClientKey = Boolean(settings.aiConfig.apiKey)
    const hasServerKey = Boolean(aiConfigHasKey)
    const hasLocalEndpoint = isLocal && Boolean(settings.aiConfig.localEndpoint || settings.aiConfig.apiKey)

    if ((!isLocal && !(hasClientKey || hasServerKey)) || (isLocal && !hasLocalEndpoint)) {
      const errorMessage: ChatMessage = {
        id: genId(),
        content: "Please configure your AI settings first to use the AI assistant.",
        sender: "ai",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
      return
    }

    const userMessage: ChatMessage = {
      id: genId(),
      content: aiChatInput,
      sender: "agent",
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setAiChatInput("")

    try {
      // Build conversation context for the AI
      const conversationContext = chatMessages
        .map(msg => `${msg.sender === "agent" ? "Agent" : "AI"}: ${msg.content}`)
        .join("\n")
      
      const currentDraft = replyText || selectedMessage.aiSuggestedResponse || ""

      const systemPrompt = `You are an expert customer support AI assistant helping a human agent craft the perfect response to send directly to a customer. Your role is to:

1. Generate customer-ready responses that can be sent directly to the customer
2. Adapt and improve responses based on the agent's feedback and questions  
3. Consider the customer's specific situation, tone, and urgency
4. Maintain a professional, helpful, and empathetic tone
5. Provide specific, actionable solutions when possible

Customer Information:
- Name: ${selectedMessage.customerName}
- Email: ${selectedMessage.customerEmail}  
- Subject: ${selectedMessage.subject}
- Message: ${selectedMessage.message}
- Category: ${selectedMessage.category}

Current draft response: ${currentDraft}

Previous conversation with agent:
${conversationContext}

Agent's latest input: ${aiChatInput}

Generate a customer-ready response that addresses the agent's input while helping resolve the customer's issue.

Output requirements:
- Return only the final, customer-ready email body.
- Do not include any prefaces, labels, quotes, code fences, or markdown.
- Do not say things like "Here is the response" or "Translated version:".
- End your response with this exact signature once: "${settings.agentSignature}". If the current draft already includes a signature, keep only one copy.`

      // Call server route to avoid browser CORS and keep keys server-side
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiConfig: settings.aiConfig,
          system: systemPrompt,
          prompt: aiChatInput,
        })
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data?.error || `AI chat failed (${resp.status})`)
      }
      const data = await resp.json()
      const response = data.content as string
      
      const aiResponse: ChatMessage = {
        id: genId(),
        content: response,
        sender: "ai",
        timestamp: new Date(),
      }
      
      setChatMessages((prev) => [...prev, aiResponse])
      
    } catch (error) {
      console.error("AI chat error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      const errorResponse: ChatMessage = {
        id: genId(),
        content: `Sorry, I encountered an error: ${errorMessage}. Please check your AI configuration and try again.`,
        sender: "ai", 
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorResponse])
    }
  }

  const handleQuickAction = async (actionTitle: string, actionInstruction: string) => {
    if (!selectedMessage) return

    // Allow quick actions when a server-side key exists or a client key is present (non-local).
    const isLocal = settings.aiConfig.provider === 'local'
    const hasClientKey = Boolean(settings.aiConfig.apiKey)
    const hasServerKey = Boolean(aiConfigHasKey)
    const hasLocalEndpoint = isLocal && Boolean(settings.aiConfig.localEndpoint || settings.aiConfig.apiKey)
    if ((!isLocal && !(hasClientKey || hasServerKey)) || (isLocal && !hasLocalEndpoint)) {
      const errorMessage: ChatMessage = {
        id: genId(),
        content: "Please configure your AI settings first to use quick actions.",
        sender: "ai",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
      return
    }

    const currentResponse = replyText || selectedMessage.aiSuggestedResponse || ""
    if (!currentResponse) {
      const errorMessage: ChatMessage = {
        id: genId(),
        content: "Please have some content in the draft reply first to use quick actions.",
        sender: "ai",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
      return
    }

    const userMessage: ChatMessage = {
      id: genId(),
      content: `Quick Action: ${actionTitle}`,
      sender: "agent",
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])

    try {
      // Use existing server route to modify a response via quick actions
      const resp = await fetch('/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: selectedMessage.customerName,
          customerEmail: selectedMessage.customerEmail,
          subject: selectedMessage.subject,
          message: selectedMessage.message,
          aiConfig: settings.aiConfig,
          agentName: settings.agentName || 'Support Agent',
          agentSignature: settings.agentSignature || 'Best regards,\nSupport Team',
          categories: settings.categories,
          quickActionInstruction: actionInstruction,
          currentResponse: currentResponse,
          companyKnowledge: settings.companyKnowledge,
        })
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err?.error || `Quick action failed (${resp.status})`)
      }
      const data = await resp.json()
      const response = data.aiSuggestedResponse as string
      
      const aiResponse: ChatMessage = {
        id: genId(),
        content: response,
        sender: "ai",
        timestamp: new Date(),
      }
      
      setChatMessages((prev) => [...prev, aiResponse])
      
    } catch (error) {
      console.error("Quick action error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      const errorResponse: ChatMessage = {
        id: genId(),
        content: `Sorry, I encountered an error: ${errorMessage}. Please check your AI configuration.`,
        sender: "ai",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorResponse])
    }
  }


  if (reviewMessages.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="relative">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Queue Empty!</h3>
          <p className="text-muted-foreground">All messages have been reviewed. Great work!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-6">

      <div className="flex gap-6 h-[calc(100vh-180px)]">
        <div className="w-1/6 min-w-[200px]">
          <div className="h-full flex flex-col bg-card rounded-lg shadow-md">
            <div className="pb-3 flex-shrink-0 p-6">
              <h3 className="text-sm font-semibold">Cases to Review ({reviewMessages.length})</h3>
            </div>
            <div className="p-0 flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto overflow-x-visible p-3">
                <div className="space-y-2">
                  {reviewMessages.map((message) => (
                    <div key={message.id} className="w-full">
                      <Tooltip 
                        content={message.message} 
                        delay={1000}
                        className="text-xs whitespace-pre-wrap"
                      >
                      <div
                        className={`p-3 rounded-lg border cursor-pointer transition-colors w-full ${
                          selectedMessageId === message.id ? "bg-accent border-accent-foreground" : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedMessageId(message.id)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="text-xs font-medium truncate">{message.customerName}</span>
                        </div>
                        <Badge variant="outline" className="text-xs mb-1">
                          {message.category}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                          <span className={`px-2 py-1 rounded text-xs font-medium truncate ${getUrgencyBgClass(getMessageUrgency(message.timestamp, settings.messageAgeThresholds))}`}>
                            {formatFriendlyDate(message.timestamp)}
                          </span>
                        </div>
                      </div>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-2/4 flex flex-col gap-4">
          {selectedMessage && (
            <>
              <div className="flex-1 bg-card rounded-lg shadow-md">
                <div className="pb-3 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Customer Question</h3>
                    <div className="flex items-center gap-2">
                      <CategorySelector
                        currentCategory={selectedMessage.category || ""}
                        onCategoryChange={(newCategory) => updateMessageCategory(selectedMessage.id, newCategory)}
                      />
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{selectedMessage.customerName}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className={`px-2 py-1 rounded text-sm font-medium ${getUrgencyBgClass(getMessageUrgency(selectedMessage.timestamp, settings.messageAgeThresholds))}`}>
                        {formatFriendlyDate(selectedMessage.timestamp)}
                      </span>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm leading-relaxed">{selectedMessage.message}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-card rounded-lg shadow-md">
                <div className="pb-3 p-6">
                  <h3 className="text-sm font-semibold">Draft Reply</h3>
                </div>
                <div className="px-6 pb-6 space-y-4">
                  <Textarea
                    placeholder="Edit the AI-generated response or write your own..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleApprove} className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-1/3">
          <div className="h-full flex flex-col bg-card rounded-lg shadow-md">
            <div className="pb-3 p-6">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AI Assistant
              </h3>
            </div>
            <div className="flex-1 flex flex-col p-0">
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-3 max-h-[300px] overflow-hidden">
                <div className="space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Ask me anything about this case</p>
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === "agent" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] ${
                          msg.sender === "agent" ? "" : "w-full"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg text-xs ${
                            msg.sender === "agent" ? "bg-accent text-accent-foreground" : "bg-muted"
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                        </div>
                        {msg.sender === "ai" && (
                          <div className="mt-1 flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReplyText(msg.content)}
                              className="text-xs h-6 px-2"
                            >
                              Replace Draft
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReplyText(replyText ? `${replyText}\n\n${msg.content}` : msg.content)}
                              className="text-xs h-6 px-2"
                            >
                              Add to Draft
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-3 border-t border-b bg-muted/30">
                <div className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Quick Actions
                  </p>
                  <div className="flex gap-1">
                    {settings.quickActions.map((action, index) => (
                      <Button
                        key={action.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(action.title, action.action)}
                        className="flex-1 justify-center text-xs h-8 bg-background hover:bg-accent"
                        title={action.action}
                      >
                        <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs mr-1">{index + 1}</span>
                        {action.title}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 border-t mt-auto">
                <div className="flex gap-2 items-end">
                  <Textarea
                    placeholder="Ask AI about this case..."
                    value={aiChatInput}
                    onChange={(e) => setAiChatInput(e.target.value)}
                    className="flex-1 min-h-[60px] max-h-[80px] resize-none text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleAiChat()
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleAiChat} disabled={!aiChatInput.trim()} className="mb-0">
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
