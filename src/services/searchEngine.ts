import { DictionaryEntry, SearchResult } from '../types/dictionary';
import { semanticAnalyzer } from './semanticAnalyzer';

interface SearchIndex {
  exact: Map<string, DictionaryEntry[]>;
  prefix: Map<string, DictionaryEntry[]>;
  words: Map<string, DictionaryEntry[]>;
}

class SearchEngine {
  private index: SearchIndex = {
    exact: new Map(),
    prefix: new Map(),
    words: new Map()
  };
  private isIndexBuilt = false;

  buildIndex(entries: DictionaryEntry[]): void {
    if (!Array.isArray(entries) || entries.length === 0) {
      console.warn('Cannot build index: entries is empty or not an array');
      return;
    }

    console.log('Building search index...');
    
    // Clear existing index
    this.index.exact.clear();
    this.index.prefix.clear();
    this.index.words.clear();

    entries.forEach(entry => {
      // Validate that entry.english exists and is a string
      if (!entry || !entry.english || typeof entry.english !== 'string') {
        return;
      }

      const english = String(entry.english).toLowerCase().trim();
      
      if (!english) return;

      // Exact match index
      if (!this.index.exact.has(english)) {
        this.index.exact.set(english, []);
      }
      this.index.exact.get(english)!.push(entry);

      // Prefix index (for autocomplete and partial matches)
      for (let i = 1; i <= english.length; i++) {
        const prefix = english.substring(0, i);
        if (!this.index.prefix.has(prefix)) {
          this.index.prefix.set(prefix, []);
        }
        this.index.prefix.get(prefix)!.push(entry);
      }

      // Word-based index (for multi-word searches)
      const words = english.split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) { // Skip very short words
          if (!this.index.words.has(word)) {
            this.index.words.set(word, []);
          }
          this.index.words.get(word)!.push(entry);
        }
      });
    });

    this.isIndexBuilt = true;
    console.log(`Index built: ${this.index.exact.size} exact entries, ${this.index.prefix.size} prefixes, ${this.index.words.size} words`);
  }

  searchExact(query: string): DictionaryEntry[] {
    if (!this.isIndexBuilt || !query) return [];
    
    const normalizedQuery = String(query).toLowerCase().trim();
    return this.index.exact.get(normalizedQuery) || [];
  }

  searchFuzzy(query: string, limit = 10): SearchResult[] {
    if (!this.isIndexBuilt || !query) return [];
    
    const normalizedQuery = String(query).toLowerCase().trim();
    if (!normalizedQuery) return [];
    
    const candidateEntries = new Set<DictionaryEntry>();

    // Collect all potential matches
    // Exact matches
    const exactMatches = this.searchExact(normalizedQuery);
    exactMatches.forEach(entry => candidateEntries.add(entry));

    // Prefix matches
    const prefixMatches = this.index.prefix.get(normalizedQuery) || [];
    prefixMatches.forEach(entry => candidateEntries.add(entry));

    // Word-based matches
    const words = normalizedQuery.split(/\s+/);
    words.forEach(word => {
      if (word.length > 2) {
        const wordMatches = this.index.words.get(word) || [];
        wordMatches.forEach(entry => candidateEntries.add(entry));
      }
    });

    // Contains matches
    this.index.exact.forEach((entries, key) => {
      if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) {
        entries.forEach(entry => candidateEntries.add(entry));
      }
    });

    // Also search in meanings/definitions
    this.index.exact.forEach((entries) => {
      entries.forEach(entry => {
        if (entry.meaning && entry.meaning.toLowerCase().includes(normalizedQuery)) {
          candidateEntries.add(entry);
        }
      });
    });

    // Apply semantic analysis to all candidates
    const results: SearchResult[] = [];
    candidateEntries.forEach(entry => {
      const semanticScore = semanticAnalyzer.analyzeMatch(normalizedQuery, entry);
      
      // Only include results with meaningful scores
      if (semanticScore.totalScore > 0.1) {
        results.push({
          entry,
          confidence: semanticScore.totalScore,
          source: 'dictionary'
        });
      }
    });

    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  private calculateWordMatchConfidence(query: string, target: string): number {
    const queryWords = new Set(query.split(/\s+/));
    const targetWords = new Set(target.split(/\s+/));
    
    let matchCount = 0;
    queryWords.forEach(word => {
      if (targetWords.has(word)) {
        matchCount++;
      }
    });

    return matchCount / Math.max(queryWords.size, targetWords.size);
  }

  getStats() {
    return {
      isIndexBuilt: this.isIndexBuilt,
      exactEntries: this.index.exact.size,
      prefixEntries: this.index.prefix.size,
      wordEntries: this.index.words.size
    };
  }
}

export const searchEngine = new SearchEngine();