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
  "id" | "status" | "timestamp" | "category" | "priority" | "aiSuggestedResponse"
>[] = [
  {
    customerName: "Sarah Johnson",
    customerEmail: "sarah.johnson@email.com",
    subject: "Unable to access my account",
    message:
      "Hi, I've been trying to log into my account for the past hour but keep getting an error message saying my credentials are invalid. I'm sure I'm using the correct password. Can you help me reset it?",
  },
  {
    customerName: "Mike Chen",
    customerEmail: "mike.chen@company.com",
    subject: "Billing question about recent charge",
    message:
      "I noticed a charge on my credit card for $99 but I can't find any details about what this was for in my account. Could you please clarify what this charge is for?",
  },
  {
    customerName: "Emma Rodriguez",
    customerEmail: "emma.r@startup.io",
    subject: "Feature request - API integration",
    message:
      "Our development team is looking to integrate with your API for our mobile app. Do you have documentation available for the REST API endpoints? Also, are there any rate limits we should be aware of?",
  },
  {
    customerName: "David Kim",
    customerEmail: "david.kim@startup.com",
    subject: "Login issues on mobile app",
    message:
      "The mobile app keeps crashing when I try to log in. I've tried reinstalling but the problem persists. This is affecting my daily workflow.",
  },
  {
    customerName: "Lisa Wang",
    customerEmail: "lisa.wang@company.org",
    subject: "Subscription cancellation request",
    message:
      "I need to cancel my premium subscription due to budget constraints. Can you help me with the cancellation process and confirm when it will take effect?",
  },
]

export function MessageManagerProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const [messages, setMessages] = useState<CustomerMessage[]>([])
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
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
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Failed to generate response (${response.status})`
        throw new Error(errorMessage)
      }

      const data = await response.json()

      // Update message with AI response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                category: data.category,
                priority: data.priority,
                aiSuggestedResponse: data.aiSuggestedResponse,
                isGenerating: false,
              }
            : m,
        ),
      )
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
                isGenerating: false,
              }
            : m,
        ),
      )
    }
  }, [settings.aiConfig, setMessages])

  const addMessage = (messageData: Omit<CustomerMessage, "id" | "status" | "timestamp">) => {
    const newMessage: CustomerMessage = {
      ...messageData,
      id: Date.now().toString(),
      status: "pending",
      timestamp: new Date().toLocaleString(),
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
    const pendingMessages = messages.filter(m => m.status === 'pending')
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

  // Initialize with mock data
  useEffect(() => {
    const initializeMessages = async () => {
      setIsLoading(true)

      for (const mockMessage of mockIncomingMessages) {
        const message: CustomerMessage = {
          ...mockMessage,
          id: Date.now().toString() + Math.random(),
          status: "pending",
          timestamp: new Date(Date.now() - Math.random() * 3600000).toLocaleString(), // Random time within last hour
          isGenerating: true,
        }

        setMessages((prev) => [...prev, message])
        await generateAIResponse(message)

        // Small delay to simulate real-time message arrival
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      setIsLoading(false)
    }

    initializeMessages()
  }, [generateAIResponse])

  // Adjust currentMessageIndex when pending messages change
  useEffect(() => {
    const pendingMessages = messages.filter(m => m.status === 'pending')
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
