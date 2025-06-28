import { DictionaryEntry, SearchResult } from '../types/dictionary';
import { dictionaryService } from './dictionaryService';

class EnhancedDictionaryService {
  private dictionary: DictionaryEntry[] = [];
  private isLoaded = false;
  private isIndexed = false;
  private searchIndex: Map<string, DictionaryEntry[]> = new Map();

  async loadDictionary(): Promise<void> {
    try {
      // Use the base dictionary service to load data
      await dictionaryService.loadDictionary();
      this.dictionary = dictionaryService.getAllEntries();
      this.isLoaded = this.dictionary.length > 0;
      
      if (this.isLoaded) {
        this.buildSearchIndex();
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
      this.buildSearchIndex();
      console.log(`Enhanced dictionary saved with ${entries.length} entries`);
    } catch (error) {
      console.error('Error saving enhanced dictionary:', error);
      throw error;
    }
  }

  private buildSearchIndex(): void {
    this.searchIndex.clear();
    
    this.dictionary.forEach(entry => {
      // Check if entry.english exists and is a valid string
      if (!entry.english || typeof entry.english !== 'string') {
        return; // Skip this entry if english property is invalid
      }
      
      const english = entry.english.toLowerCase().trim();
      
      // Index exact phrase
      if (!this.searchIndex.has(english)) {
        this.searchIndex.set(english, []);
      }
      this.searchIndex.get(english)!.push(entry);
      
      // Index individual words
      const words = english.split(/\s+/);
      words.forEach(word => {
        if (word.length > 1) {
          if (!this.searchIndex.has(word)) {
            this.searchIndex.set(word, []);
          }
          this.searchIndex.get(word)!.push(entry);
        }
      });
      
      // Index prefixes for autocomplete
      for (let i = 2; i <= english.length; i++) {
        const prefix = english.substring(0, i);
        if (!this.searchIndex.has(prefix)) {
          this.searchIndex.set(prefix, []);
        }
        this.searchIndex.get(prefix)!.push(entry);
      }
    });
    
    this.isIndexed = true;
    console.log(`Search index built with ${this.searchIndex.size} entries`);
  }

  search(query: string): DictionaryEntry | null {
    if (!this.isLoaded) return null;
    
    const normalizedQuery = (query || '').toLowerCase().trim();
    if (!normalizedQuery) return null;
    
    // Try exact match first
    const exactMatches = this.searchIndex.get(normalizedQuery);
    if (exactMatches && exactMatches.length > 0) {
      return exactMatches[0];
    }
    
    // Try fuzzy search
    const fuzzyResults = this.searchFuzzy(normalizedQuery, 1);
    return fuzzyResults.length > 0 ? fuzzyResults[0].entry : null;
  }

  searchFuzzy(query: string, limit = 5): SearchResult[] {
    if (!this.isLoaded || !this.isIndexed) return [];
    
    const normalizedQuery = (query || '').toLowerCase().trim();
    if (!normalizedQuery) return [];
    
    const results: Map<string, SearchResult> = new Map();
    
    // Exact matches (highest confidence)
    const exactMatches = this.searchIndex.get(normalizedQuery);
    if (exactMatches) {
      exactMatches.forEach(entry => {
        results.set(entry.id, {
          entry,
          confidence: 1.0,
          source: 'dictionary'
        });
      });
    }
    
    // Prefix matches
    this.searchIndex.forEach((entries, key) => {
      if (key.startsWith(normalizedQuery) && key !== normalizedQuery) {
        entries.forEach(entry => {
          if (!results.has(entry.id)) {
            const confidence = normalizedQuery.length / key.length;
            results.set(entry.id, {
              entry,
              confidence: Math.min(0.9, confidence),
              source: 'dictionary'
            });
          }
        });
      }
    });
    
    // Contains matches
    if (results.size < limit) {
      this.searchIndex.forEach((entries, key) => {
        if (key.includes(normalizedQuery) && !key.startsWith(normalizedQuery)) {
          entries.forEach(entry => {
            if (!results.has(entry.id)) {
              const confidence = normalizedQuery.length / key.length * 0.7;
              results.set(entry.id, {
                entry,
                confidence: Math.min(0.8, confidence),
                source: 'dictionary'
              });
            }
          });
        }
      });
    }
    
    // Word-based matches
    const queryWords = normalizedQuery.split(/\s+/);
    queryWords.forEach(word => {
      if (word.length > 1) {
        const wordMatches = this.searchIndex.get(word);
        if (wordMatches) {
          wordMatches.forEach(entry => {
            if (!results.has(entry.id)) {
              const confidence = 0.6;
              results.set(entry.id, {
                entry,
                confidence,
                source: 'dictionary'
              });
            }
          });
        }
      }
    });
    
    return Array.from(results.values())
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