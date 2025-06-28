import { DictionaryEntry, SearchResult } from '../types/dictionary';

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

  buildIndex(entries: DictionaryEntry[]): void {
    console.log('Building search index...');
    
    // Clear existing index
    this.index.exact.clear();
    this.index.prefix.clear();
    this.index.words.clear();

    entries.forEach(entry => {
      // Validate that entry.english exists and is a string
      if (!entry.english || typeof entry.english !== 'string') {
        return;
      }

      const english = entry.english.toLowerCase().trim();
      
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

    console.log(`Index built: ${this.index.exact.size} exact entries, ${this.index.prefix.size} prefixes, ${this.index.words.size} words`);
  }

  searchExact(query: string): DictionaryEntry[] {
    return this.index.exact.get(query.toLowerCase().trim()) || [];
  }

  searchFuzzy(query: string, limit = 10): SearchResult[] {
    const normalizedQuery = query.toLowerCase().trim();
    const results: Map<string, SearchResult> = new Map();

    // Exact matches (highest priority)
    const exactMatches = this.searchExact(normalizedQuery);
    exactMatches.forEach(entry => {
      results.set(entry.id, {
        entry,
        confidence: 1.0,
        source: 'dictionary'
      });
    });

    // Prefix matches
    const prefixMatches = this.index.prefix.get(normalizedQuery) || [];
    prefixMatches.forEach(entry => {
      if (!results.has(entry.id)) {
        const confidence = normalizedQuery.length / entry.english.length;
        results.set(entry.id, {
          entry,
          confidence: Math.min(0.9, confidence),
          source: 'dictionary'
        });
      }
    });

    // Word-based matches
    const words = normalizedQuery.split(/\s+/);
    words.forEach(word => {
      if (word.length > 2) {
        const wordMatches = this.index.words.get(word) || [];
        wordMatches.forEach(entry => {
          if (!results.has(entry.id)) {
            const confidence = this.calculateWordMatchConfidence(normalizedQuery, entry.english.toLowerCase());
            if (confidence > 0.3) {
              results.set(entry.id, {
                entry,
                confidence,
                source: 'dictionary'
              });
            }
          }
        });
      }
    });

    // Contains matches (lower priority)
    if (results.size < limit) {
      this.index.exact.forEach((entries, key) => {
        if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) {
          entries.forEach(entry => {
            if (!results.has(entry.id)) {
              const confidence = Math.min(normalizedQuery.length, key.length) / Math.max(normalizedQuery.length, key.length);
              results.set(entry.id, {
                entry,
                confidence: confidence * 0.6,
                source: 'dictionary'
              });
            }
          });
        }
      });
    }

    return Array.from(results.values())
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
}

export const searchEngine = new SearchEngine();