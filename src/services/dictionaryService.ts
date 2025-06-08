
import { DictionaryEntry, SearchResult } from '../types/dictionary';

class DictionaryService {
  private dictionary: DictionaryEntry[] = [];
  private isLoaded = false;

  async loadDictionary(): Promise<void> {
    try {
      const stored = localStorage.getItem('ibibio-dictionary');
      if (stored) {
        this.dictionary = JSON.parse(stored);
        this.isLoaded = true;
        console.log(`Dictionary loaded with ${this.dictionary.length} entries`);
      }
    } catch (error) {
      console.error('Error loading dictionary:', error);
    }
  }

  async saveDictionary(entries: DictionaryEntry[]): Promise<void> {
    try {
      this.dictionary = entries;
      localStorage.setItem('ibibio-dictionary', JSON.stringify(entries));
      this.isLoaded = true;
      console.log(`Dictionary saved with ${entries.length} entries`);
    } catch (error) {
      console.error('Error saving dictionary:', error);
      throw error;
    }
  }

  searchExact(query: string): DictionaryEntry | null {
    if (!this.isLoaded) return null;
    
    const normalizedQuery = query.toLowerCase().trim();
    return this.dictionary.find(entry => 
      entry.english.toLowerCase() === normalizedQuery
    ) || null;
  }

  searchFuzzy(query: string, limit = 5): SearchResult[] {
    if (!this.isLoaded) return [];
    
    const normalizedQuery = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    this.dictionary.forEach(entry => {
      const englishLower = entry.english.toLowerCase();
      let confidence = 0;

      // Exact match
      if (englishLower === normalizedQuery) {
        confidence = 1.0;
      }
      // Starts with query
      else if (englishLower.startsWith(normalizedQuery)) {
        confidence = 0.8;
      }
      // Contains query
      else if (englishLower.includes(normalizedQuery)) {
        confidence = 0.6;
      }
      // Check if query contains the word
      else if (normalizedQuery.includes(englishLower)) {
        confidence = 0.4;
      }

      if (confidence > 0) {
        results.push({
          entry,
          confidence,
          source: 'dictionary'
        });
      }
    });

    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  getAllEntries(): DictionaryEntry[] {
    return [...this.dictionary];
  }

  getStats() {
    return {
      totalEntries: this.dictionary.length,
      isLoaded: this.isLoaded,
      categories: [...new Set(this.dictionary.map(e => e.category).filter(Boolean))]
    };
  }
}

export const dictionaryService = new DictionaryService();
