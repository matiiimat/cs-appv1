/**
 * Enhances AI response generation requests with knowledge base context
 */
export class AIResponseEnhancer {

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
      // The API route now handles knowledge base fetching directly from the database
      // so we just pass the original payload without pre-fetching entries
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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