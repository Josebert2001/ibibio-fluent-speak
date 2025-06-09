import { DictionaryEntry, SearchResult } from '../types/dictionary';
import { searchEngine } from './searchEngine';

class EnhancedDictionaryService {
  private dictionary: DictionaryEntry[] = [];
  private isLoaded = false;
  private isIndexed = false;

  async loadDictionary(): Promise<void> {
    try {
      const stored = localStorage.getItem('ibibio-dictionary');
      if (stored) {
        this.dictionary = JSON.parse(stored);
        this.isLoaded = true;
        this.buildSearchIndex();
        console.log(`Enhanced dictionary loaded with ${this.dictionary.length} entries`);
      }
    } catch (error) {
      console.error('Error loading enhanced dictionary:', error);
    }
  }

  async saveDictionary(entries: DictionaryEntry[]): Promise<void> {
    try {
      this.dictionary = entries;
      localStorage.setItem('ibibio-dictionary', JSON.stringify(entries));
      this.isLoaded = true;
      this.buildSearchIndex();
      console.log(`Enhanced dictionary saved with ${entries.length} entries`);
    } catch (error) {
      console.error('Error saving enhanced dictionary:', error);
      throw error;
    }
  }

  private buildSearchIndex(): void {
    if (this.dictionary.length > 0) {
      searchEngine.buildIndex(this.dictionary);
      this.isIndexed = true;
    }
  }

  search(query: string): DictionaryEntry | null {
    if (!this.isLoaded || !this.isIndexed) return null;
    
    const results = searchEngine.searchExact(query);
    return results.length > 0 ? results[0] : null;
  }

  searchFuzzy(query: string, limit = 5): SearchResult[] {
    if (!this.isLoaded || !this.isIndexed) return [];
    
    return searchEngine.searchFuzzy(query, limit);
  }

  getAllEntries(): DictionaryEntry[] {
    return [...this.dictionary];
  }

  getStats() {
    return {
      totalEntries: this.dictionary.length,
      isLoaded: this.isLoaded,
      isIndexed: this.isIndexed,
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