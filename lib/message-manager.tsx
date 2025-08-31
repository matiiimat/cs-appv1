"use client"

import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react"
import { useSettings } from "./settings-context"

export interface CustomerMessage {
  id: string
  customerName: string
  customerEmail: string
  subject: string
  message: string
  category?: string
  priority?: "low" | "medium" | "high"
  timestamp: string
  aiSuggestedResponse?: string
  isGenerating?: boolean
  autoReviewed: boolean // Flag to track if AI has analyzed this message
  status: "pending" | "approved" | "rejected" | "edited" | "sent" | "review" // Added "review" status
  agentId?: string
  processedAt?: string
  responseTime?: number
  editHistory?: Array<{
    timestamp: string
    originalResponse: string
    editedResponse: string
    reason: string
  }>
}

export interface MessageStats {
  totalMessages: number
  pendingMessages: number
  approvedMessages: number
  rejectedMessages: number
  editedMessages: number
  sentMessages: number
  reviewMessages: number // Added review messages count
  avgResponseTime: number
  approvalRate: number
  todayProcessed: number
}

interface MessageManagerContextType {
  messages: CustomerMessage[]
  currentMessageIndex: number
  stats: MessageStats
  isLoading: boolean
  addMessage: (message: Omit<CustomerMessage, "id" | "status" | "timestamp">) => void
  updateMessage: (id: string, updates: Partial<CustomerMessage>) => void
  updateMessageCategory: (id: string, category: string) => void
  approveMessage: (id: string, agentId: string) => void
  rejectMessage: (id: string, agentId: string, reason?: string) => void
  sendToReview: (id: string, agentId: string, reason?: string) => void // Added sendToReview function
  editMessage: (id: string, editedResponse: string, reason: string, agentId: string) => void
  moveToNextMessage: () => void
  moveToPreviousMessage: () => void
  generateAIResponse: (message: CustomerMessage) => Promise<void>
  getMessagesByStatus: (status: CustomerMessage["status"]) => CustomerMessage[]
  getRecentActivity: () => Array<{
    id: string
    type: "approved" | "rejected" | "edited" | "received" | "review" // Added "review" type
    message: CustomerMessage
    timestamp: string
    agentId?: string
  }>
}

const MessageManagerContext = createContext<MessageManagerContextType | undefined>(undefined)

export function useMessageManager() {
  const context = useContext(MessageManagerContext)
  if (!context) {
    throw new Error("useMessageManager must be used within a MessageManagerProvider")
  }
  return context
}

// Mock incoming messages for demo
const mockIncomingMessages: Omit<
  CustomerMessage,
  "id" | "status" | "timestamp" | "category" | "priority" | "aiSuggestedResponse" | "autoReviewed" | "isGenerating" | "agentId" | "processedAt" | "responseTime" | "editHistory"
>[] = [
  {
    customerName: "Alex Thompson",
    customerEmail: "alex.thompson@techcorp.com",
    subject: "Plans",
    message:
      "Can you give me an overview of the plans available?",
  },
  {
    customerName: "Maria Santos",
    customerEmail: "maria.santos@design.co",
    subject: "Enterprise Plan",
    message:
      "What can I do with the Enterprise Plan",
  },
  {
    customerName: "James Wilson",
    customerEmail: "james.wilson@freelance.net",
    subject: "Two-factor authentication not working",
    message:
      "I enabled 2FA yesterday but now I can't log in. The authentication codes from my phone aren't being accepted. I've tried syncing the time but it still doesn't work. Please help.",
  },
  {
    customerName: "Rachel Green",
    customerEmail: "rachel.green@marketing.pro",
    subject: "Team collaboration features missing",
    message:
      "Our team upgraded to the business plan specifically for the collaboration tools mentioned on your pricing page. However, we can't find these features in our account. Were they rolled out yet?",
  },
  {
    customerName: "Kevin Park",
    customerEmail: "kevin.park@startup.dev",
    subject: "API rate limiting too restrictive",
    message:
      "Our application is hitting the API rate limits during peak hours, causing service disruptions for our users. Can we discuss increasing our limits or moving to a higher tier?",
  },
]

export function MessageManagerProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const [messages, setMessages] = useState<CustomerMessage[]>([])
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Load from localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    if (!hasLoadedFromStorage) {
      const saved = localStorage.getItem('supportai-processed-messages')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const hasAIResponses = parsed.some((msg: CustomerMessage) => msg.aiSuggestedResponse)
          if (hasAIResponses) {
            console.log('Loaded', parsed.length, 'processed messages from localStorage')
            setMessages(parsed)
            setIsLoading(false)
            setHasLoadedFromStorage(true)
            return
          }
        } catch (error) {
          console.error('Failed to parse saved messages:', error)
        }
      }
      setHasLoadedFromStorage(true)
    }
  }, [hasLoadedFromStorage])
  const [recentActivity, setRecentActivity] = useState<
    Array<{
      id: string
      type: "approved" | "rejected" | "edited" | "received" | "review" // Added "review" type
      message: CustomerMessage
      timestamp: string
      agentId?: string
    }>
  >([])

  const generateAIResponse = useCallback(async (message: CustomerMessage) => {
    try {
      // Update message to show generating state
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, isGenerating: true, aiSuggestedResponse: undefined } : m)),
      )

      const response = await fetch("/api/generate-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: message.customerName,
          customerEmail: message.customerEmail,
          subject: message.subject,
          message: message.message,
          aiConfig: settings.aiConfig,
          agentName: settings.agentName || "Support Agent",
          agentSignature: settings.agentSignature || "Best regards,\nSupport Team",
          categories: settings.categories,
          companyKnowledge: settings.companyKnowledge,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Failed to generate response (${response.status})`
        throw new Error(errorMessage)
      }

      const data = await response.json()

      // Update message with AI response
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                category: data.category,
                priority: data.priority,
                aiSuggestedResponse: data.aiSuggestedResponse,
                autoReviewed: true, // Mark as AI reviewed
                isGenerating: false,
              }
            : m,
        )
        
        // Save to localStorage whenever messages are updated with AI responses
        if (typeof window !== 'undefined') {
          localStorage.setItem('supportai-processed-messages', JSON.stringify(updated))
        }
        
        return updated
      })
    } catch (error) {
      console.error("[v0] Error generating AI response:", error)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                category: "General Inquiry",
                priority: "medium" as const,
                aiSuggestedResponse:
                  "I apologize, but I'm having trouble generating a response right now. Please try again or contact our support team directly.",
                autoReviewed: true, // Mark as reviewed even with error response
                isGenerating: false,
              }
            : m,
        ),
      )
    }
  }, [settings.aiConfig, settings.agentName, settings.agentSignature, settings.categories, setMessages])

  const addMessage = (messageData: Omit<CustomerMessage, "id" | "status" | "timestamp" | "autoReviewed">) => {
    const newMessage: CustomerMessage = {
      ...messageData,
      id: Date.now().toString(),
      status: "pending",
      timestamp: new Date().toLocaleString(),
      autoReviewed: false, // New messages need AI review
      isGenerating: true,
    }

    setMessages((prev) => [...prev, newMessage])

    // Add to recent activity
    setRecentActivity((prev) => [
      {
        id: newMessage.id,
        type: "received",
        message: newMessage,
        timestamp: new Date().toISOString(),
      },
      ...prev.slice(0, 9),
    ])

    // Generate AI response
    generateAIResponse(newMessage)
  }

  const updateMessage = (id: string, updates: Partial<CustomerMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)))
  }

  const updateMessageCategory = (id: string, category: string) => {
    setMessages((prev) => {
      const updated = prev.map((m) => (m.id === id ? { ...m, category } : m))
      
      // Save to localStorage whenever messages are updated
      if (typeof window !== 'undefined') {
        localStorage.setItem('supportai-processed-messages', JSON.stringify(updated))
      }
      
      return updated
    })
  }

  const approveMessage = (id: string, agentId: string) => {
    const processedAt = new Date().toISOString()
    const message = messages.find((m) => m.id === id)

    if (message) {
      const responseTime = Date.now() - new Date(message.timestamp).getTime()

      updateMessage(id, {
        status: "approved",
        agentId,
        processedAt,
        responseTime,
        autoReviewed: false, // Reset for potential customer replies
      })

      setRecentActivity((prev) => [
        {
          id,
          type: "approved",
          message: message,
          timestamp: processedAt,
          agentId,
        },
        ...prev.slice(0, 9),
      ])

    }
  }

  const rejectMessage = (id: string, agentId: string) => {
    const processedAt = new Date().toISOString()
    const message = messages.find((m) => m.id === id)

    if (message) {
      const responseTime = Date.now() - new Date(message.timestamp).getTime()

      updateMessage(id, {
        status: "rejected",
        agentId,
        processedAt,
        responseTime,
      })

      setRecentActivity((prev) => [
        {
          id,
          type: "rejected",
          message: message,
          timestamp: processedAt,
          agentId,
        },
        ...prev.slice(0, 9),
      ])
    }
  }

  const sendToReview = (id: string, agentId: string) => {
    const processedAt = new Date().toISOString()
    const message = messages.find((m) => m.id === id)

    if (message) {
      const responseTime = Date.now() - new Date(message.timestamp).getTime()

      updateMessage(id, {
        status: "review",
        agentId,
        processedAt,
        responseTime,
      })

      setRecentActivity((prev) => [
        {
          id,
          type: "review",
          message: message,
          timestamp: processedAt,
          agentId,
        },
        ...prev.slice(0, 9),
      ])

    }
  }

  const editMessage = (id: string, editedResponse: string, reason: string, agentId: string) => {
    const message = messages.find((m) => m.id === id)
    if (!message || !message.aiSuggestedResponse) return

    const editEntry = {
      timestamp: new Date().toISOString(),
      originalResponse: message.aiSuggestedResponse,
      editedResponse,
      reason,
    }

    updateMessage(id, {
      aiSuggestedResponse: editedResponse,
      status: "edited",
      agentId,
      editHistory: [...(message.editHistory || []), editEntry],
    })

    setRecentActivity((prev) => [
      {
        id,
        type: "edited",
        message: message,
        timestamp: editEntry.timestamp,
        agentId,
      },
      ...prev.slice(0, 9),
    ])
  }

  const moveToNextMessage = () => {
    const pendingMessages = messages.filter(m => m.status === 'pending' && m.autoReviewed)
    if (currentMessageIndex < pendingMessages.length - 1) {
      setCurrentMessageIndex(currentMessageIndex + 1)
    }
  }

  const moveToPreviousMessage = () => {
    if (currentMessageIndex > 0) {
      setCurrentMessageIndex(currentMessageIndex - 1)
    }
  }

  const getMessagesByStatus = (status: CustomerMessage["status"]) => {
    return messages.filter((m) => m.status === status)
  }

  const getRecentActivity = () => {
    return recentActivity
  }

  // Calculate stats
  const stats: MessageStats = {
    totalMessages: messages.length,
    pendingMessages: messages.filter((m) => m.status === "pending").length,
    approvedMessages: messages.filter((m) => m.status === "approved").length,
    rejectedMessages: messages.filter((m) => m.status === "rejected").length,
    editedMessages: messages.filter((m) => m.status === "edited").length,
    sentMessages: messages.filter((m) => m.status === "sent").length,
    reviewMessages: messages.filter((m) => m.status === "review").length, // Added review messages count
    avgResponseTime:
      messages.filter((m) => m.responseTime).reduce((acc, m) => acc + (m.responseTime || 0), 0) /
      Math.max(1, messages.filter((m) => m.responseTime).length) /
      1000 /
      60, // in minutes
    approvalRate:
      messages.length > 0 ? (messages.filter((m) => m.status === "approved").length / messages.length) * 100 : 0,
    todayProcessed: messages.filter((m) => {
      const today = new Date().toDateString()
      return m.processedAt && new Date(m.processedAt).toDateString() === today
    }).length,
  }

  // Initialize with mock data only if no localStorage data was loaded
  useEffect(() => {
    if (!hasLoadedFromStorage) return // Wait for localStorage check

    // Only initialize if no messages were loaded from localStorage
    if (messages.length === 0) {
      const initialMessages = mockIncomingMessages.map((mockMessage, index) => ({
        ...mockMessage,
        id: Date.now().toString() + index,
        status: "pending" as const,
        timestamp: new Date(Date.now() - Math.random() * 3600000).toLocaleString(),
        autoReviewed: false, // Messages need AI review via queue button
      }))

      setMessages(initialMessages)
      setIsLoading(false)
    }
  }, [hasLoadedFromStorage, messages.length])

  // Adjust currentMessageIndex when pending messages change
  useEffect(() => {
    const pendingMessages = messages.filter(m => m.status === 'pending' && m.autoReviewed)
    if (currentMessageIndex >= pendingMessages.length && pendingMessages.length > 0) {
      setCurrentMessageIndex(Math.max(0, pendingMessages.length - 1))
    } else if (pendingMessages.length === 0) {
      setCurrentMessageIndex(0)
    }
  }, [messages, currentMessageIndex])

  const contextValue: MessageManagerContextType = {
    messages,
    currentMessageIndex,
    stats,
    isLoading,
    addMessage,
    updateMessage,
    updateMessageCategory,
    approveMessage,
    rejectMessage,
    sendToReview, // Added sendToReview to context
    editMessage,
    moveToNextMessage,
    moveToPreviousMessage,
    generateAIResponse,
    getMessagesByStatus,
    getRecentActivity,
  }

  return <MessageManagerContext.Provider value={contextValue}>{children}</MessageManagerContext.Provider>
}
