export function searchCompanyKnowledge(query: string, knowledge: string): string {
  if (!knowledge || !knowledge.trim()) {
    return ''
  }

  // Convert query to lowercase for case-insensitive matching
  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2) // Filter out very short words

  if (queryWords.length === 0) {
    return ''
  }

  // Split knowledge into lines and paragraphs
  const lines = knowledge.split('\n').map(line => line.trim()).filter(line => line)
  const relevantSections: string[] = []

  // Score each line based on keyword matches
  const scoredLines = lines.map(line => {
    const lineLower = line.toLowerCase()
    let score = 0
    
    // Count exact matches of query words
    queryWords.forEach(word => {
      const matches = (lineLower.match(new RegExp(word, 'g')) || []).length
      score += matches * 2 // Weight exact matches higher
    })
    
    // Bonus for lines containing multiple query words
    const wordsInLine = queryWords.filter(word => lineLower.includes(word))
    if (wordsInLine.length > 1) {
      score += wordsInLine.length * 3
    }
    
    // Check for common support keywords that indicate relevant sections
    const supportKeywords = ['faq', 'help', 'support', 'issue', 'problem', 'solution', 'policy', 'how to', 'troubleshoot']
    supportKeywords.forEach(keyword => {
      if (lineLower.includes(keyword)) {
        score += 1
      }
    })

    return { line, score }
  })

  // Sort by score and take top matches
  const topMatches = scoredLines
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10) // Limit to top 10 most relevant lines
    .map(item => item.line)

  // Join and limit total context length to ~2000 characters to preserve API token budget
  const result = topMatches.join('\n')
  return result.length > 2000 ? result.substring(0, 2000) + '...' : result
}