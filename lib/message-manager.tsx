"use client"

import { useState, useEffect, createContext, useContext, useCallback, useRef, type ReactNode } from "react"
import { useSettings } from "./settings-context"
import { apiClient, type ApiMessage, type ApiActivity } from "./api-client"

// UUID validation regex for agent IDs
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

// Convert API message to frontend format
function convertApiMessage(apiMessage: ApiMessage): CustomerMessage {
  return {
    id: apiMessage.id,
    ticketId: apiMessage.ticket_id,
    customerName: apiMessage.customer_name || "",
    customerEmail: apiMessage.customer_email || "",
    subject: apiMessage.subject || "",
    message: apiMessage.message || "",
    category: apiMessage.category || undefined,
    timestamp: apiMessage.created_at,
    aiSuggestedResponse: apiMessage.ai_suggested_response || undefined,
    isGenerating: apiMessage.is_generating,
    aiReviewed: apiMessage.ai_reviewed,
    status: apiMessage.status,
    agentId: apiMessage.agent_id || undefined,
    processedAt: apiMessage.processed_at || undefined,
    responseTime: apiMessage.response_time_ms || undefined,
    updatedAt: apiMessage.updated_at,
    editHistory: apiMessage.edit_history || [],
    metadata: apiMessage.metadata || {},
  }
}

// Convert frontend message to API format
function convertToApiMessage(message: Partial<CustomerMessage>): {
  customer_name: string;
  customer_email: string;
  subject: string;
  message: string;
  category?: string;
  metadata: Record<string, unknown>;
} {
  if (!message.customerName || !message.customerEmail || !message.subject || !message.message) {
    throw new Error('Missing required message fields');
  }

  return {
    customer_name: message.customerName!,
    customer_email: message.customerEmail!,
    subject: message.subject!,
    message: message.message!,
    category: message.category,
    metadata: {},
  }
}

export interface CustomerMessage {
  id: string
  ticketId: string
  customerName: string
  customerEmail: string
  subject: string
  message: string
  category?: string
  timestamp: string
  aiSuggestedResponse?: string
  isGenerating?: boolean
  aiReviewed: boolean
  status: "new" | "to_send_queue" | "rejected" | "edited" | "sent" | "to_review_queue"
  agentId?: string
  processedAt?: string
  responseTime?: number
  updatedAt?: string
  editHistory?: Array<{
    timestamp: string
    originalResponse: string
    editedResponse: string
    reason: string
  }>
  metadata?: Record<string, unknown>
}

export interface MessageStats {
  totalMessages: number
  pendingMessages: number
  approvedMessages: number
  rejectedMessages: number
  editedMessages: number
  sentMessages: number
  reviewMessages: number
  avgResponseTime: number
  approvalRate: number
  todayProcessed: number
}

interface MessageManagerContextType {
  messages: CustomerMessage[]
  currentMessageIndex: number
  stats: MessageStats
  isLoading: boolean
  isProcessingBatch: boolean
  processedCount: number
  totalToProcess: number
  isTriageActive: boolean
  enterTriage: () => void
  exitTriage: () => void
  cancelBatchProcessing: () => void
  addMessage: (message: Omit<CustomerMessage, "id" | "status" | "timestamp" | "ticketId" | "aiReviewed">) => Promise<void>
  updateMessage: (id: string, updates: Partial<CustomerMessage>) => Promise<void>
  updateMessageCategory: (id: string, category: string) => Promise<void>
  approveMessage: (id: string, agentId: string) => Promise<void>
  rejectMessage: (id: string, agentId: string, reason?: string) => Promise<void>
  sendToReview: (id: string, agentId: string, reason?: string) => Promise<void>
  editMessage: (id: string, editedResponse: string, reason: string, agentId: string) => Promise<void>
  moveToNextMessage: () => void
  moveToPreviousMessage: () => void
  generateAIResponse: (message: CustomerMessage) => Promise<{ success: boolean; usageLimitHit?: boolean }>
  processBatch: (batchSize: number) => Promise<{ usageLimitHit?: boolean }>
  getMessagesByStatus: (status: CustomerMessage["status"]) => CustomerMessage[]
  getRecentActivity: () => Array<{
    id: string
    type: "approved" | "rejected" | "edited" | "received" | "review"
    message: CustomerMessage
    timestamp: string
    agentId?: string
  }>
  refreshData: (options?: { dateRange?: '7d' | '30d' | 'all' }) => Promise<void>
  // Draft persistence (keep in localStorage)
  draftReplies: Record<string, string>
  updateDraftReply: (messageId: string, draft: string) => void
  clearDraftReply: (messageId: string) => void
  getDraftReply: (messageId: string) => string
}

const MessageManagerContext = createContext<MessageManagerContextType | undefined>(undefined)

export function useMessageManager() {
  const context = useContext(MessageManagerContext)
  if (!context) {
    throw new Error("useMessageManager must be used within a MessageManagerProvider")
  }
  return context
}

export function MessageManagerProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const [messages, setMessages] = useState<CustomerMessage[]>([])
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [stats, setStats] = useState<MessageStats>({
    totalMessages: 0,
    pendingMessages: 0,
    approvedMessages: 0,
    rejectedMessages: 0,
    editedMessages: 0,
    sentMessages: 0,
    reviewMessages: 0,
    avgResponseTime: 0,
    approvalRate: 0,
    todayProcessed: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const [processedCount, setProcessedCount] = useState(0)
  const [totalToProcess, setTotalToProcess] = useState(0)
  const [isTriageActive, setIsTriageActive] = useState(false)
  const [recentActivity, setRecentActivity] = useState<ApiActivity[]>([])
  const cancelRequestedRef = useRef(false)

  // Draft replies - keep in localStorage as requested
  const [draftReplies, setDraftReplies] = useState<Record<string, string>>({})

  // Load draft replies from localStorage on mount
  useEffect(() => {
    const savedDrafts = localStorage.getItem('supportai-drafts-v1')
    if (savedDrafts) {
      try {
        const parsedDrafts = JSON.parse(savedDrafts)
        setDraftReplies(parsedDrafts)
      } catch (error) {
        console.error('Failed to parse saved draft replies:', error)
      }
    }
  }, [])

  // Fetch data from database
  const refreshData = useCallback(async (options: { dateRange?: '7d' | '30d' | 'all' } = {}) => {
    try {
      setIsLoading(true)

      // Fetch all data in parallel
      const [messagesResponse, statsResponse, activityResponse] = await Promise.all([
        apiClient.getMessages({ limit: 100 }),
        apiClient.getStats({ dateRange: options.dateRange }),
        apiClient.getActivity(10)
      ])

      // Convert API messages to frontend format
      const convertedMessages = messagesResponse.messages.map(convertApiMessage)

      setMessages(convertedMessages)
      setStats(statsResponse.stats)
      setRecentActivity(activityResponse.activities)

    } catch (error) {
      console.error('Failed to fetch data from database:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    refreshData()
  }, [refreshData])

  const addMessage = async (messageData: Omit<CustomerMessage, "id" | "status" | "timestamp" | "ticketId" | "aiReviewed">) => {
    try {
      const apiData = convertToApiMessage(messageData)
      const response = await apiClient.createMessage(apiData)
      const newMessage = convertApiMessage(response.message)

      setMessages(prev => [newMessage, ...prev])
      await refreshData() // Refresh to get updated stats
    } catch (error) {
      console.error('Failed to add message:', error)
      throw error
    }
  }

  const updateMessage = useCallback(async (id: string, updates: Partial<CustomerMessage>) => {
    // 1. OPTIMISTIC UPDATE - immediate UI feedback
    setMessages(prev =>
      prev.map(msg => msg.id === id ? { ...msg, ...updates } : msg)
    )

    try {
      const apiUpdates: Record<string, unknown> = {}

      // Map frontend fields to API fields
      if (updates.category !== undefined) apiUpdates.category = updates.category
      if (updates.aiSuggestedResponse !== undefined) apiUpdates.ai_suggested_response = updates.aiSuggestedResponse
      if (updates.status !== undefined) apiUpdates.status = updates.status
      // Only include agent_id if it's a valid UUID
      if (typeof updates.agentId === 'string' && UUID_REGEX.test(updates.agentId)) {
        apiUpdates.agent_id = updates.agentId
      }
      if (updates.aiReviewed !== undefined) apiUpdates.ai_reviewed = updates.aiReviewed
      if (updates.isGenerating !== undefined) apiUpdates.is_generating = updates.isGenerating
      if (updates.metadata !== undefined) apiUpdates.metadata = updates.metadata

      // 2. Call API and get server response
      const response = await apiClient.updateMessage(id, apiUpdates)

      // 3. Replace optimistic update with server response (source of truth)
      const serverMessage = convertApiMessage(response.message)
      setMessages(prev =>
        prev.map(msg => msg.id === id ? serverMessage : msg)
      )

      // 4. Refresh stats only if status changed (affects stats calculation)
      if (updates.status !== undefined) {
        const [statsResponse, activityResponse] = await Promise.all([
          apiClient.getStats(),
          apiClient.getActivity(10)
        ])
        setStats(statsResponse.stats)
        setRecentActivity(activityResponse.activities)
      }
    } catch (error) {
      console.error('Failed to update message:', error)
      // Revert optimistic update on error by refreshing from server
      await refreshData()
      throw error
    }
  }, [refreshData])

  const updateMessageCategory = async (id: string, category: string) => {
    await updateMessage(id, { category })
  }

  const approveMessage = async (id: string, agentId: string) => {
    if (!UUID_REGEX.test(agentId)) {
      throw new Error('approveMessage requires a valid agent UUID')
    }
    await updateMessage(id, { status: "sent", agentId })
    clearDraftReply(id)
  }

  const rejectMessage = async (id: string, agentId: string) => {
    if (!UUID_REGEX.test(agentId)) {
      throw new Error('rejectMessage requires a valid agent UUID')
    }
    await updateMessage(id, { status: "rejected", agentId })
  }

  const sendToReview = async (id: string, agentId: string) => {
    if (!UUID_REGEX.test(agentId)) {
      throw new Error('sendToReview requires a valid agent UUID')
    }
    await updateMessage(id, { status: "to_review_queue", agentId })
  }

  const editMessage = async (id: string, editedResponse: string, reason: string, agentId: string) => {
    const message = messages.find(m => m.id === id)
    if (!message || !message.aiSuggestedResponse) return

    const editEntry = {
      timestamp: new Date().toISOString(),
      originalResponse: message.aiSuggestedResponse,
      editedResponse,
      reason,
    }

    await updateMessage(id, {
      aiSuggestedResponse: editedResponse,
      status: "edited",
      agentId,
      editHistory: [...(message.editHistory || []), editEntry],
    })
  }

  const generateAIResponse = useCallback(async (message: CustomerMessage): Promise<{ success: boolean; usageLimitHit?: boolean }> => {
    try {
      // Update local state to show generating
      setMessages(prev =>
        prev.map(m => m.id === message.id ? { ...m, isGenerating: true, aiSuggestedResponse: undefined } : m)
      )

      // Update database to show generating
      await updateMessage(message.id, { isGenerating: true })

      // Use AIResponseEnhancer to include knowledge base entries
      const { AIResponseEnhancer } = await import('@/lib/ai-response-enhancer')
      const data = await AIResponseEnhancer.generateResponse({
        customerName: message.customerName,
        customerEmail: message.customerEmail,
        subject: message.subject,
        message: message.message,
        aiConfig: settings.aiConfig,
        agentName: settings.agentName || "Support Agent",
        agentSignature: settings.agentSignature || "Best regards,\nSupport Team",
        categories: settings.categories,
        companyKnowledge: settings.companyKnowledge,
      })

      // Update database with AI response
      await updateMessage(message.id, {
        category: data.category,
        aiSuggestedResponse: data.aiSuggestedResponse,
        aiReviewed: true,
        isGenerating: false,
      })

      return { success: true }

    } catch (error) {
      console.error("Error generating AI response:", error)

      // Check if this is a usage limit error
      const errorWithCode = error as Error & { code?: string }
      if (errorWithCode.code === 'USAGE_LIMIT_REACHED') {
        // Reset generating state but don't mark as reviewed
        await updateMessage(message.id, { isGenerating: false })
        return { success: false, usageLimitHit: true }
      }

      // Update with error response for other errors
      await updateMessage(message.id, {
        category: "General Inquiry",
        aiSuggestedResponse: "I apologize, but I'm having trouble generating a response right now. Please try again or contact our support team directly.",
        aiReviewed: true,
        isGenerating: false,
      })

      return { success: false }
    }
  }, [settings, updateMessage])

  const processBatch = useCallback(async (batchSize: number): Promise<{ usageLimitHit?: boolean }> => {
    const unprocessedMessages = messages.filter(m => !m.aiReviewed && m.status === 'new')
    const messagesToProcess = unprocessedMessages.slice(0, batchSize)

    setIsProcessingBatch(true)
    setProcessedCount(0)
    setTotalToProcess(messagesToProcess.length)
    cancelRequestedRef.current = false

    let currentProcessedCount = 0
    let usageLimitHit = false

    try {
      for (let i = 0; i < messagesToProcess.length; i++) {
        if (cancelRequestedRef.current) {
          console.log('Batch processing cancelled by user')
          break
        }

        const message = messagesToProcess[i]
        const result = await generateAIResponse(message)

        // Stop batch processing if usage limit is hit
        if (result.usageLimitHit) {
          console.log('Batch processing stopped: usage limit reached')
          usageLimitHit = true
          break
        }

        currentProcessedCount = i + 1
        setProcessedCount(currentProcessedCount)

        // Small delay between requests
        if (i < messagesToProcess.length - 1 && !cancelRequestedRef.current) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    } catch (error) {
      console.error('Error processing batch:', error)
    } finally {
      setIsProcessingBatch(false)
      setProcessedCount(0)
      setTotalToProcess(0)
      cancelRequestedRef.current = false
    }

    return { usageLimitHit }
  }, [messages, generateAIResponse])

  const cancelBatchProcessing = useCallback(() => {
    cancelRequestedRef.current = true
  }, [])

  const enterTriage = useCallback(() => {
    setIsTriageActive(true)
    setCurrentMessageIndex(0)
  }, [])

  const exitTriage = useCallback(() => {
    setIsTriageActive(false)
  }, [])

  const moveToNextMessage = () => {
    const pendingMessages = messages.filter(m => m.status === 'new' && m.aiReviewed)
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
    return messages.filter(m => m.status === status)
  }

  const getRecentActivity = () => {
    return recentActivity.map(activity => ({
      id: activity.id,
      type: activity.type as "approved" | "rejected" | "edited" | "received" | "review",
      message: convertApiMessage(activity.message),
      timestamp: activity.timestamp,
      agentId: activity.agentId,
    }))
  }

  // Draft management functions (keep localStorage as requested)
  const updateDraftReply = useCallback((messageId: string, draft: string) => {
    setDraftReplies(prev => {
      const updated = { ...prev, [messageId]: draft }

      // Save to localStorage with debouncing
      if (typeof window !== 'undefined') {
        const timeoutKey = `draft-timeout-${messageId}`
        const windowWithTimeouts = window as unknown as Window & Record<string, NodeJS.Timeout>
        const existingTimeout = windowWithTimeouts[timeoutKey]
        if (existingTimeout) {
          clearTimeout(existingTimeout)
        }

        windowWithTimeouts[timeoutKey] = setTimeout(() => {
          localStorage.setItem('supportai-drafts-v1', JSON.stringify(updated))
          delete windowWithTimeouts[timeoutKey]
        }, 500)
      }

      return updated
    })
  }, [])

  const clearDraftReply = useCallback((messageId: string) => {
    setDraftReplies(prev => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [messageId]: _, ...rest } = prev

      if (typeof window !== 'undefined') {
        localStorage.setItem('supportai-drafts-v1', JSON.stringify(rest))
      }

      return rest
    })
  }, [])

  const getDraftReply = useCallback((messageId: string): string => {
    return draftReplies[messageId] || ''
  }, [draftReplies])

  // Adjust currentMessageIndex when pending messages change
  useEffect(() => {
    const pendingMessages = messages.filter(m => m.status === 'new' && m.aiReviewed)
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
    isProcessingBatch,
    processedCount,
    totalToProcess,
    isTriageActive,
    enterTriage,
    exitTriage,
    cancelBatchProcessing,
    addMessage,
    updateMessage,
    updateMessageCategory,
    approveMessage,
    rejectMessage,
    sendToReview,
    editMessage,
    moveToNextMessage,
    moveToPreviousMessage,
    generateAIResponse,
    processBatch,
    getMessagesByStatus,
    getRecentActivity,
    refreshData,
    // Draft persistence functionality (localStorage)
    draftReplies,
    updateDraftReply,
    clearDraftReply,
    getDraftReply,
  }

  return <MessageManagerContext.Provider value={contextValue}>{children}</MessageManagerContext.Provider>
}
