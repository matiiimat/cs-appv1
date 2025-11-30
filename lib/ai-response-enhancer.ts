/**
 * Enhances AI response generation requests with knowledge base context
 */
export class AIResponseEnhancer {
  /**
   * Get relevant knowledge base entries for a customer message
   */
  static async getRelevantKnowledgeBaseEntries(
    subject: string,
    message: string,
    category?: string
  ) {
    try {
      // Extract search terms from customer message for API call
      const searchTerms = this.extractSearchTerms(`${subject} ${message}`)

      // Build API URL with search parameters
      const params = new URLSearchParams()
      if (category) {
        params.append('category', category)
      }
      if (searchTerms.length > 0) {
        params.append('search', searchTerms.join(','))
      }

      const response = await fetch(`/api/knowledge-base?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch knowledge base entries')
      }

      const data = await response.json()
      const entries = data.entries || []

      // Return limited number of entries to avoid overwhelming the AI
      return entries.slice(0, 3).map((entry: any) => ({
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
   * Extract search terms from message content (moved from localStorage utility)
   */
  static extractSearchTerms(messageContent: string): string[] {
    if (!messageContent) return []

    // Remove common words and extract meaningful terms
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'her', 'its', 'our', 'their'
    ])

    return messageContent
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ') // Remove punctuation
      .split(/\s+/) // Split on whitespace
      .filter(word => word.length > 2 && !commonWords.has(word)) // Filter short and common words
      .slice(0, 10) // Limit to first 10 meaningful terms
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
      const knowledgeBaseEntries = await this.getRelevantKnowledgeBaseEntries(
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
  static async getKnowledgeBaseStats() {
    try {
      const response = await fetch('/api/knowledge-base')
      if (!response.ok) {
        throw new Error('Failed to fetch knowledge base entries')
      }

      const data = await response.json()
      const allEntries = data.entries || []
      const enabledEntries = allEntries.filter((entry: any) => entry.enabled)

      const categoryCounts: Record<string, number> = {}
      enabledEntries.forEach((entry: any) => {
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