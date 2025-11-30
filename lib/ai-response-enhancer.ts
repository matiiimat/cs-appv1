import { KnowledgeBaseStorage } from '@/lib/knowledge-base'

/**
 * Enhances AI response generation requests with knowledge base context
 */
export class AIResponseEnhancer {
  /**
   * Get relevant knowledge base entries for a customer message
   */
  static getRelevantKnowledgeBaseEntries(
    subject: string,
    message: string,
    category?: string
  ) {
    try {
      const allEntries = KnowledgeBaseStorage.getAll().filter(entry => entry.enabled)

      if (allEntries.length === 0) {
        return []
      }

      // Extract search terms from customer message
      const searchTerms = KnowledgeBaseStorage.extractSearchTerms(`${subject} ${message}`)

      // Find relevant entries
      const relevantEntries = KnowledgeBaseStorage.findRelevantEntries(category, searchTerms)

      // Return limited number of entries to avoid overwhelming the AI
      return relevantEntries.slice(0, 3).map(entry => ({
        case_summary: entry.case_summary,
        resolution: entry.resolution,
        category: entry.category,
      }))
    } catch (error) {
      console.warn('Failed to get relevant knowledge base entries:', error)
      return []
    }
  }

  /**
   * Enhanced generate response API call with knowledge base context
   */
  static async generateResponse(
    payload: {
      customerName: string
      customerEmail: string
      subject: string
      message: string
      aiConfig: unknown
      agentName: string
      agentSignature: string
      categories?: unknown[]
      quickActionInstruction?: string
      currentResponse?: string
      companyKnowledge?: string
    }
  ) {
    try {
      // Get relevant knowledge base entries
      const knowledgeBaseEntries = this.getRelevantKnowledgeBaseEntries(
        payload.subject,
        payload.message,
        undefined // For now, don't try to determine category automatically
      )

      // Enhanced payload with knowledge base entries
      const enhancedPayload = {
        ...payload,
        knowledgeBaseEntries,
      }

      // Make the API call
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedPayload),
      })

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Enhanced generate response failed:', error)
      throw error
    }
  }

  /**
   * Get knowledge base statistics for display
   */
  static getKnowledgeBaseStats() {
    try {
      const allEntries = KnowledgeBaseStorage.getAll()
      const enabledEntries = allEntries.filter(entry => entry.enabled)

      const categoryCounts: Record<string, number> = {}
      enabledEntries.forEach(entry => {
        if (entry.category) {
          categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1
        }
      })

      return {
        total: allEntries.length,
        enabled: enabledEntries.length,
        disabled: allEntries.length - enabledEntries.length,
        categories: categoryCounts,
      }
    } catch (error) {
      console.warn('Failed to get knowledge base stats:', error)
      return {
        total: 0,
        enabled: 0,
        disabled: 0,
        categories: {},
      }
    }
  }
}