"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMessageManager } from "@/lib/message-manager"
import { AIService } from "@/lib/ai-providers"
import { useSettings } from "@/lib/settings-context"
import { formatEmailText } from "@/lib/utils"
import { CategorySelector } from "@/components/ui/category-selector"
import { Clock, User, Send, Bot, Zap, MessageSquare } from "lucide-react"

interface ChatMessage {
  id: string
  content: string
  sender: "agent" | "ai"
  timestamp: Date
}

export function DetailedReviewInterface() {
  const { messages, updateMessage, updateMessageCategory } = useMessageManager()
  const { settings } = useSettings()
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [aiChatInput, setAiChatInput] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const reviewMessages = messages
    .filter((msg) => msg.status === "review")
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) // Sort by date, oldest first
  const selectedMessage = reviewMessages.find((msg) => msg.id === selectedMessageId)

  useEffect(() => {
    if (reviewMessages.length > 0 && !selectedMessageId) {
      setSelectedMessageId(reviewMessages[0].id)
    }
  }, [reviewMessages, selectedMessageId])

  useEffect(() => {
    if (selectedMessage?.aiSuggestedResponse) {
      setReplyText(formatEmailText(selectedMessage.aiSuggestedResponse))
    }
  }, [selectedMessage])

  const handleApprove = useCallback(() => {
    if (selectedMessage) {
      updateMessage(selectedMessage.id, { status: "approved" })

      const remainingMessages = reviewMessages.filter((msg) => msg.id !== selectedMessage.id)

      if (remainingMessages.length > 0) {
        // Find the next message after the current one
        const currentIndex = reviewMessages.findIndex((msg) => msg.id === selectedMessageId)
        const nextMessage =
          remainingMessages.find((msg) => {
            const originalIndex = reviewMessages.findIndex((original) => original.id === msg.id)
            return originalIndex > currentIndex
          }) || remainingMessages[0]

        setSelectedMessageId(nextMessage.id)
      } else {
        setSelectedMessageId(null)
      }

      setReplyText("")
      setChatMessages([])
    }
  }, [selectedMessage, updateMessage, reviewMessages, selectedMessageId, setSelectedMessageId, setReplyText, setChatMessages])



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
      const newCategory = categoryMatch[1].trim().replace(/['"]/g, '')
      updateMessageCategory(selectedMessage.id, newCategory)
      
      const confirmMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `✅ Category changed to "${newCategory}" for this message.`,
        sender: "ai",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, 
        { id: Date.now().toString(), content: aiChatInput, sender: "agent", timestamp: new Date() },
        confirmMessage
      ])
      setAiChatInput("")
      return
    }

    // Check if AI is configured
    if (!settings.aiConfig.apiKey) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        content: "Please configure your AI settings first to use the AI assistant.",
        sender: "ai",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
      return
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: aiChatInput,
      sender: "agent",
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setAiChatInput("")

    try {
      const aiService = new AIService(settings.aiConfig)
      
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
- Priority: ${selectedMessage.priority}

Current draft response: ${currentDraft}

Previous conversation with agent:
${conversationContext}

Agent's latest input: ${aiChatInput}

Generate a customer-ready response that addresses the agent's input while helping resolve the customer's issue. The response should be ready to send to the customer directly.`

      const response = await aiService.generateText(systemPrompt, aiChatInput)
      
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: "ai",
        timestamp: new Date(),
      }
      
      setChatMessages((prev) => [...prev, aiResponse])
      
    } catch (error) {
      console.error("AI chat error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      const errorResponse: ChatMessage = {
        id: Date.now().toString(),
        content: `Sorry, I encountered an error: ${errorMessage}. Please check your AI configuration and try again.`,
        sender: "ai", 
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorResponse])
    }
  }

  const handleQuickAction = async (actionTitle: string, actionInstruction: string) => {
    if (!selectedMessage || !settings.aiConfig.apiKey) return

    const currentResponse = replyText || selectedMessage.aiSuggestedResponse || ""
    if (!currentResponse) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        content: "Please have some content in the draft reply first to use quick actions.",
        sender: "ai",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
      return
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `Quick Action: ${actionTitle}`,
      sender: "agent",
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])

    try {
      const aiService = new AIService(settings.aiConfig)
      
      const systemPrompt = `You are helping improve a customer support response. The customer's original issue was:

Customer: ${selectedMessage.customerName}
Issue: ${selectedMessage.message}
Category: ${selectedMessage.category}
Priority: ${selectedMessage.priority}

Current response draft:
${currentResponse}

Your task: ${actionInstruction}

Provide an improved version that can be sent directly to the customer.`

      const response = await aiService.generateText(systemPrompt, actionInstruction)
      
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: "ai",
        timestamp: new Date(),
      }
      
      setChatMessages((prev) => [...prev, aiResponse])
      
    } catch (error) {
      console.error("Quick action error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      const errorResponse: ChatMessage = {
        id: Date.now().toString(),
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
              <div className="h-full overflow-y-auto p-3">
                <div className="space-y-2">
                  {reviewMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
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
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{new Date(message.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-3/6 flex flex-col gap-4">
          {selectedMessage && (
            <>
              <div className="flex-1 bg-card rounded-lg shadow-md">
                <div className="pb-3 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Customer Question</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={selectedMessage.priority === "high" ? "destructive" : "secondary"}>
                        {selectedMessage.priority}
                      </Badge>
                      <CategorySelector
                        currentCategory={selectedMessage.category || ""}
                        onCategoryChange={(newCategory) => updateMessageCategory(selectedMessage.id, newCategory)}
                      />
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{selectedMessage.customerName}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <Clock className="h-4 w-4" />
                      <span>{new Date(selectedMessage.timestamp).toLocaleString()}</span>
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
                      Approve & Send
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-2/6">
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
