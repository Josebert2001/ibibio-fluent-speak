import { DictionaryEntry, SearchResult } from '../types/dictionary';
import { dictionaryService } from './dictionaryService';
import { searchEngine } from './searchEngine';

class EnhancedDictionaryService {
  private dictionary: DictionaryEntry[] = [];
  private isLoaded = false;

  async loadDictionary(): Promise<void> {
    try {
      // Use the base dictionary service to load data
      await dictionaryService.loadDictionary();
      this.dictionary = dictionaryService.getAllEntries();
      this.isLoaded = this.dictionary.length > 0;
      
      if (this.isLoaded) {
        // Build centralized search index
        searchEngine.buildIndex(this.dictionary);
        console.log(`Enhanced dictionary loaded with ${this.dictionary.length} entries`);
      }
    } catch (error) {
      console.error('Error loading enhanced dictionary:', error);
    }
  }

  async saveDictionary(entries: DictionaryEntry[]): Promise<void> {
    try {
      await dictionaryService.saveDictionary(entries);
      this.dictionary = entries;
      this.isLoaded = true;
      
      // Rebuild centralized search index
      searchEngine.buildIndex(this.dictionary);
      console.log(`Enhanced dictionary saved with ${entries.length} entries`);
    } catch (error) {
      console.error('Error saving enhanced dictionary:', error);
      throw error;
    }
  }

  search(query: string): DictionaryEntry | null {
    if (!this.isLoaded) return null;
    
    const normalizedQuery = (query || '').toLowerCase().trim();
    if (!normalizedQuery) return null;
    
    // Use centralized search engine for exact matches
    const exactMatches = searchEngine.searchExact(normalizedQuery);
    if (exactMatches.length > 0) {
      return exactMatches[0];
    }
    
    // Try fuzzy search for partial matches
    const fuzzyResults = searchEngine.searchFuzzy(normalizedQuery, 1);
    return fuzzyResults.length > 0 ? fuzzyResults[0].entry : null;
  }

  searchFuzzy(query: string, limit = 5): SearchResult[] {
    if (!this.isLoaded) return [];
    
    const normalizedQuery = (query || '').toLowerCase().trim();
    if (!normalizedQuery) return [];
    
    // Use centralized search engine for fuzzy search
    return searchEngine.searchFuzzy(normalizedQuery, limit);
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

  // Performance monitoring
  async performanceTest(queries: string[]): Promise<{
    averageTime: number;
    results: Array<{ query: string; time: number; found: boolean }>;
  }> {
    const results = [];
    let totalTime = 0;

    for (const query of queries) {
      const start = performance.now();
      const result = this.search(query);
      const time = performance.now() - start;
      
      results.push({
        query,
        time,
        found: !!result
      });
      
      totalTime += time;
    }

    return {
      averageTime: totalTime / queries.length,
      results
    };
  }
}

export const enhancedDictionaryService = new EnhancedDictionaryService();