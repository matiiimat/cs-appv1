import { z } from 'zod';

// Knowledge base entry schema
export const KnowledgeBaseEntrySchema = z.object({
  id: z.string(),
  case_summary: z.string(),
  resolution: z.string(),
  category: z.string().optional(),
  created_date: z.string(),
  enabled: z.boolean().default(true),
});

export type KnowledgeBaseEntry = z.infer<typeof KnowledgeBaseEntrySchema>;

// Input schema for creating KB entries
export const CreateKnowledgeBaseEntrySchema = z.object({
  case_summary: z.string().min(1),
  resolution: z.string().min(1),
  category: z.string().optional(),
});

export type CreateKnowledgeBaseEntryInput = z.infer<typeof CreateKnowledgeBaseEntrySchema>;

// Local storage utilities for knowledge base
export class KnowledgeBaseStorage {
  private static readonly STORAGE_KEY = 'support_ai_knowledge_base';

  /**
   * Get all knowledge base entries from localStorage
   */
  static getAll(): KnowledgeBaseEntry[] {
    if (typeof window === 'undefined') return [];

    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];

      const entries = JSON.parse(data);
      return entries.map((entry: unknown) => KnowledgeBaseEntrySchema.parse(entry));
    } catch (error) {
      console.error('Error loading knowledge base from localStorage:', error);
      return [];
    }
  }

  /**
   * Save all knowledge base entries to localStorage
   */
  static saveAll(entries: KnowledgeBaseEntry[]): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving knowledge base to localStorage:', error);
      throw new Error('Failed to save knowledge base entries');
    }
  }

  /**
   * Create a new knowledge base entry
   */
  static create(entryData: CreateKnowledgeBaseEntryInput): KnowledgeBaseEntry {
    console.log('Creating KB entry with data:', entryData);

    const newEntry: KnowledgeBaseEntry = {
      id: crypto.randomUUID(),
      ...entryData,
      created_date: new Date().toISOString(),
      enabled: true,
    };

    console.log('Created new KB entry:', newEntry);

    const entries = this.getAll();
    console.log('Current KB entries before save:', entries);

    entries.unshift(newEntry); // Add to beginning
    this.saveAll(entries);

    console.log('KB entries after save:', this.getAll());

    return newEntry;
  }

  /**
   * Update a knowledge base entry
   */
  static update(id: string, updates: Partial<Omit<KnowledgeBaseEntry, 'id' | 'created_date'>>): KnowledgeBaseEntry | null {
    const entries = this.getAll();
    const index = entries.findIndex(entry => entry.id === id);

    if (index === -1) return null;

    const updatedEntry = { ...entries[index], ...updates };
    entries[index] = updatedEntry;
    this.saveAll(entries);

    return updatedEntry;
  }

  /**
   * Delete a knowledge base entry
   */
  static delete(id: string): boolean {
    const entries = this.getAll();
    const filteredEntries = entries.filter(entry => entry.id !== id);

    if (filteredEntries.length === entries.length) return false;

    this.saveAll(filteredEntries);
    return true;
  }

  /**
   * Get a single entry by ID
   */
  static getById(id: string): KnowledgeBaseEntry | null {
    const entries = this.getAll();
    return entries.find(entry => entry.id === id) || null;
  }

  /**
   * Search for relevant knowledge base entries based on message category and content
   */
  static findRelevantEntries(
    category?: string,
    searchTerms?: string[]
  ): KnowledgeBaseEntry[] {
    const entries = this.getAll().filter(entry => entry.enabled);

    if (!category && (!searchTerms || searchTerms.length === 0)) {
      return entries;
    }

    let relevantEntries = entries;

    // Filter by category first if provided
    if (category) {
      relevantEntries = relevantEntries.filter(entry =>
        entry.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // Then search by keywords/content if provided
    if (searchTerms && searchTerms.length > 0) {
      const lowercaseTerms = searchTerms.map(term => term.toLowerCase());

      relevantEntries = relevantEntries.filter(entry => {
        const combinedText = (entry.case_summary + ' ' + entry.resolution).toLowerCase();

        return lowercaseTerms.some(term => combinedText.includes(term));
      });
    }

    // Sort by relevance (entries with more keyword matches first)
    if (searchTerms && searchTerms.length > 0) {
      const lowercaseTerms = searchTerms.map(term => term.toLowerCase());

      relevantEntries.sort((a, b) => {
        const aText = (a.case_summary + ' ' + a.resolution).toLowerCase();
        const bText = (b.case_summary + ' ' + b.resolution).toLowerCase();

        const aMatches = lowercaseTerms.filter(term => aText.includes(term)).length;
        const bMatches = lowercaseTerms.filter(term => bText.includes(term)).length;

        return bMatches - aMatches; // Sort descending by match count
      });
    }

    return relevantEntries;
  }

  /**
   * Extract search terms from message content
   */
  static extractSearchTerms(messageContent: string): string[] {
    if (!messageContent) return [];

    // Remove common words and extract meaningful terms
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'her', 'its', 'our', 'their'
    ]);

    return messageContent
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ') // Remove punctuation
      .split(/\s+/) // Split on whitespace
      .filter(word => word.length > 2 && !commonWords.has(word)) // Filter short and common words
      .slice(0, 10); // Limit to first 10 meaningful terms
  }
}