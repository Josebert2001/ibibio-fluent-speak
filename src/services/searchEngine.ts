import { DictionaryEntry, SearchResult } from '../types/dictionary';
import { semanticAnalyzer } from './semanticAnalyzer';

interface SearchIndex {
  exact: Map<string, DictionaryEntry[]>;
  prefix: Map<string, DictionaryEntry[]>;
  words: Map<string, DictionaryEntry[]>;
  ibibio: Map<string, DictionaryEntry[]>; // New: Index for Ibibio words
  meanings: Map<string, DictionaryEntry[]>; // New: Index for meanings
}

interface IndexStats {
  exactEntries: number;
  prefixEntries: number;
  wordEntries: number;
  ibibioEntries: number;
  meaningEntries: number;
  totalUniqueTerms: number;
}

class SearchEngine {
  private index: SearchIndex = {
    exact: new Map(),
    prefix: new Map(),
    words: new Map(),
    ibibio: new Map(),
    meanings: new Map()
  };
  private isIndexBuilt = false;
  private indexStats: IndexStats = {
    exactEntries: 0,
    prefixEntries: 0,
    wordEntries: 0,
    ibibioEntries: 0,
    meaningEntries: 0,
    totalUniqueTerms: 0
  };

  buildIndex(entries: DictionaryEntry[]): void {
    if (!Array.isArray(entries) || entries.length === 0) {
      console.warn('⚠️ Cannot build index: entries is empty or not an array');
      return;
    }

    console.log('🔧 Building enhanced search index...');
    const startTime = performance.now();
    
    // Clear existing index
    this.clearIndex();

    let processedEntries = 0;
    let skippedEntries = 0;

    entries.forEach((entry, index) => {
      try {
        // Validate entry
        if (!this.validateEntryForIndexing(entry, index)) {
          skippedEntries++;
          return;
        }

        // Index English terms
        this.indexEnglishTerms(entry);
        
        // Index Ibibio terms (new feature)
        this.indexIbibioTerms(entry);
        
        // Index meanings and definitions (new feature)
        this.indexMeanings(entry);

        processedEntries++;
      } catch (error) {
        console.error(`❌ Error indexing entry ${index}:`, error, entry);
        skippedEntries++;
      }
    });

    // Calculate statistics
    this.calculateIndexStats();
    
    const buildTime = performance.now() - startTime;
    this.isIndexBuilt = true;
    
    console.log('✅ Enhanced index built successfully:', {
      processedEntries,
      skippedEntries,
      buildTime: `${buildTime.toFixed(2)}ms`,
      stats: this.indexStats
    });
  }

  private clearIndex(): void {
    this.index.exact.clear();
    this.index.prefix.clear();
    this.index.words.clear();
    this.index.ibibio.clear();
    this.index.meanings.clear();
  }

  private validateEntryForIndexing(entry: DictionaryEntry, index: number): boolean {
    if (!entry) {
      console.warn(`⚠️ Skipping null entry at index ${index}`);
      return false;
    }

    if (!entry.english || typeof entry.english !== 'string' || entry.english.trim().length === 0) {
      console.warn(`⚠️ Skipping entry with invalid English field at index ${index}:`, entry);
      return false;
    }

    if (!entry.ibibio || typeof entry.ibibio !== 'string' || entry.ibibio.trim().length === 0) {
      console.warn(`⚠️ Skipping entry with invalid Ibibio field at index ${index}:`, entry);
      return false;
    }

    return true;
  }

  private indexEnglishTerms(entry: DictionaryEntry): void {
    const english = String(entry.english).toLowerCase().trim();
    
    // Exact match index
    this.addToIndex(this.index.exact, english, entry);

    // Prefix index (for autocomplete and partial matches)
    for (let i = 1; i <= english.length; i++) {
      const prefix = english.substring(0, i);
      this.addToIndex(this.index.prefix, prefix, entry);
    }

    // Enhanced word-based index
    const words = this.extractWords(english);
    words.forEach(word => {
      if (this.isSignificantWord(word)) {
        this.addToIndex(this.index.words, word, entry);
      }
    });
  }

  private indexIbibioTerms(entry: DictionaryEntry): void {
    const ibibio = String(entry.ibibio).toLowerCase().trim();
    
    // Index full Ibibio term
    this.addToIndex(this.index.ibibio, ibibio, entry);
    
    // Index Ibibio words if it's a phrase
    const ibibioWords = this.extractWords(ibibio);
    ibibioWords.forEach(word => {
      if (word.length > 1) { // Include shorter words for Ibibio
        this.addToIndex(this.index.ibibio, word, entry);
      }
    });
  }

  private indexMeanings(entry: DictionaryEntry): void {
    if (!entry.meaning || typeof entry.meaning !== 'string') return;
    
    const meaning = entry.meaning.toLowerCase().trim();
    
    // Index significant words from meanings
    const meaningWords = this.extractWords(meaning);
    meaningWords.forEach(word => {
      if (this.isSignificantWord(word)) {
        this.addToIndex(this.index.meanings, word, entry);
      }
    });

    // Index key phrases from meanings (2-3 word combinations)
    const phrases = this.extractPhrases(meaning);
    phrases.forEach(phrase => {
      this.addToIndex(this.index.meanings, phrase, entry);
    });
  }

  private extractWords(text: string): string[] {
    return text
      .replace(/[^\w\s'-]/g, ' ') // Keep apostrophes and hyphens
      .split(/\s+/)
      .map(word => word.replace(/^[-']+|[-']+$/g, '')) // Remove leading/trailing punctuation
      .filter(word => word.length > 0);
  }

  private extractPhrases(text: string): string[] {
    const words = this.extractWords(text);
    const phrases: string[] = [];
    
    // Extract 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      if (this.isSignificantWord(words[i]) && this.isSignificantWord(words[i + 1])) {
        phrases.push(`${words[i]} ${words[i + 1]}`);
      }
    }
    
    // Extract 3-word phrases
    for (let i = 0; i < words.length - 2; i++) {
      if (this.isSignificantWord(words[i]) && this.isSignificantWord(words[i + 1]) && this.isSignificantWord(words[i + 2])) {
        phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
      }
    }
    
    return phrases;
  }

  private isSignificantWord(word: string): boolean {
    if (word.length < 2) return false;
    
    // Enhanced stop words list
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it',
      'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with', 'or', 'but', 'not', 'this',
      'they', 'have', 'had', 'what', 'said', 'each', 'which', 'she', 'do', 'how', 'their', 'if',
      'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like',
      'into', 'him', 'time', 'two', 'more', 'go', 'no', 'way', 'could', 'my', 'than', 'first',
      'been', 'call', 'who', 'oil', 'sit', 'now', 'find', 'down', 'day', 'did', 'get', 'come',
      'made', 'may', 'part'
    ]);
    
    return !stopWords.has(word.toLowerCase());
  }

  private addToIndex(indexMap: Map<string, DictionaryEntry[]>, key: string, entry: DictionaryEntry): void {
    if (!indexMap.has(key)) {
      indexMap.set(key, []);
    }
    
    // Avoid duplicates
    const entries = indexMap.get(key)!;
    if (!entries.some(e => e.id === entry.id)) {
      entries.push(entry);
    }
  }

  private calculateIndexStats(): void {
    this.indexStats = {
      exactEntries: this.index.exact.size,
      prefixEntries: this.index.prefix.size,
      wordEntries: this.index.words.size,
      ibibioEntries: this.index.ibibio.size,
      meaningEntries: this.index.meanings.size,
      totalUniqueTerms: this.index.exact.size + this.index.words.size + this.index.ibibio.size + this.index.meanings.size
    };
  }

  searchExact(query: string): DictionaryEntry[] {
    if (!this.isIndexBuilt || !query) return [];
    
    const normalizedQuery = String(query).toLowerCase().trim();
    const results = this.index.exact.get(normalizedQuery) || [];
    
    if (results.length > 0) {
      console.log(`🎯 Exact search found ${results.length} result(s) for "${query}"`);
    }
    
    return results;
  }

  searchFuzzy(query: string, limit = 10): SearchResult[] {
    if (!this.isIndexBuilt || !query) return [];
    
    const normalizedQuery = String(query).toLowerCase().trim();
    if (!normalizedQuery) return [];
    
    console.log(`🔍 Enhanced fuzzy search for: "${normalizedQuery}"`);
    
    const candidateEntries = new Set<DictionaryEntry>();
    const searchStrategies: Array<{ name: string; count: number }> = [];

    // Strategy 1: Exact matches (highest priority)
    const exactMatches = this.searchExact(normalizedQuery);
    exactMatches.forEach(entry => candidateEntries.add(entry));
    searchStrategies.push({ name: 'exact', count: exactMatches.length });

    // Strategy 2: Prefix matches
    const prefixMatches = this.index.prefix.get(normalizedQuery) || [];
    prefixMatches.forEach(entry => candidateEntries.add(entry));
    searchStrategies.push({ name: 'prefix', count: prefixMatches.length });

    // Strategy 3: Word-based matches
    const words = this.extractWords(normalizedQuery);
    let wordMatchCount = 0;
    words.forEach(word => {
      if (this.isSignificantWord(word)) {
        const wordMatches = this.index.words.get(word) || [];
        wordMatches.forEach(entry => candidateEntries.add(entry));
        wordMatchCount += wordMatches.length;
      }
    });
    searchStrategies.push({ name: 'words', count: wordMatchCount });

    // Strategy 4: Ibibio reverse search (new feature)
    const ibibioMatches = this.index.ibibio.get(normalizedQuery) || [];
    ibibioMatches.forEach(entry => candidateEntries.add(entry));
    searchStrategies.push({ name: 'ibibio', count: ibibioMatches.length });

    // Strategy 5: Meaning-based search (new feature)
    let meaningMatchCount = 0;
    words.forEach(word => {
      if (this.isSignificantWord(word)) {
        const meaningMatches = this.index.meanings.get(word) || [];
        meaningMatches.forEach(entry => candidateEntries.add(entry));
        meaningMatchCount += meaningMatches.length;
      }
    });
    searchStrategies.push({ name: 'meanings', count: meaningMatchCount });

    // Strategy 6: Enhanced contains matches
    let containsMatchCount = 0;
    this.index.exact.forEach((entries, key) => {
      if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) {
        entries.forEach(entry => candidateEntries.add(entry));
        containsMatchCount += entries.length;
      }
    });
    searchStrategies.push({ name: 'contains', count: containsMatchCount });

    // Strategy 7: Phrase matching in meanings
    if (words.length > 1) {
      const phrase = words.join(' ');
      const phraseMatches = this.index.meanings.get(phrase) || [];
      phraseMatches.forEach(entry => candidateEntries.add(entry));
      searchStrategies.push({ name: 'phrases', count: phraseMatches.length });
    }

    console.log('📊 Search strategy results:', searchStrategies);

    // Apply enhanced semantic analysis to all candidates
    const results: SearchResult[] = [];
    candidateEntries.forEach(entry => {
      const semanticScore = semanticAnalyzer.analyzeMatch(normalizedQuery, entry);
      
      // Enhanced threshold - only include meaningful results
      if (semanticScore.totalScore > 0.05) {
        results.push({
          entry,
          confidence: semanticScore.totalScore,
          source: 'dictionary'
        });
      }
    });

    // Enhanced sorting with tie-breaking
    const sortedResults = results
      .sort((a, b) => {
        // Primary sort by confidence
        if (Math.abs(a.confidence - b.confidence) > 0.01) {
          return b.confidence - a.confidence;
        }
        
        // Tie-breaker 1: Prefer entries with examples
        const aHasExamples = a.entry.examples && a.entry.examples.length > 0;
        const bHasExamples = b.entry.examples && b.entry.examples.length > 0;
        if (aHasExamples !== bHasExamples) {
          return aHasExamples ? -1 : 1;
        }
        
        // Tie-breaker 2: Prefer shorter English terms (more specific)
        const lengthDiff = a.entry.english.length - b.entry.english.length;
        if (Math.abs(lengthDiff) > 2) {
          return lengthDiff;
        }
        
        // Tie-breaker 3: Alphabetical order
        return a.entry.english.localeCompare(b.entry.english);
      })
      .slice(0, limit);

    console.log(`📊 Enhanced fuzzy search results (top ${Math.min(limit, sortedResults.length)}):`, 
      sortedResults.map(r => `${r.entry.english} -> ${r.entry.ibibio} (${(r.confidence * 100).toFixed(1)}%)`));

    // Log detailed analysis for top results
    if (sortedResults.length > 0) {
      console.log('🔍 Detailed analysis of top result:');
      console.log(semanticAnalyzer.getDebugInfo(normalizedQuery, sortedResults[0].entry));
    }

    return sortedResults;
  }

  // New method: Search across all indexed content
  searchComprehensive(query: string, limit = 15): SearchResult[] {
    if (!this.isIndexBuilt || !query) return [];
    
    const normalizedQuery = String(query).toLowerCase().trim();
    console.log(`🔍 Comprehensive search for: "${normalizedQuery}"`);
    
    // Use fuzzy search as base, but with higher limit for comprehensive results
    const fuzzyResults = this.searchFuzzy(normalizedQuery, limit * 2);
    
    // Additional comprehensive strategies
    const additionalCandidates = new Set<DictionaryEntry>();
    
    // Search in cultural context
    this.index.exact.forEach((entries) => {
      entries.forEach(entry => {
        if (entry.cultural && entry.cultural.toLowerCase().includes(normalizedQuery)) {
          additionalCandidates.add(entry);
        }
      });
    });
    
    // Search in pronunciation
    this.index.exact.forEach((entries) => {
      entries.forEach(entry => {
        if (entry.pronunciation && entry.pronunciation.toLowerCase().includes(normalizedQuery)) {
          additionalCandidates.add(entry);
        }
      });
    });
    
    // Add additional candidates with lower confidence
    additionalCandidates.forEach(entry => {
      if (!fuzzyResults.some(r => r.entry.id === entry.id)) {
        const semanticScore = semanticAnalyzer.analyzeMatch(normalizedQuery, entry);
        if (semanticScore.totalScore > 0.02) {
          fuzzyResults.push({
            entry,
            confidence: semanticScore.totalScore * 0.8, // Lower confidence for additional matches
            source: 'dictionary'
          });
        }
      }
    });
    
    return fuzzyResults
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  // New method: Get search suggestions
  getSearchSuggestions(query: string, limit = 5): string[] {
    if (!this.isIndexBuilt || !query) return [];
    
    const normalizedQuery = String(query).toLowerCase().trim();
    const suggestions = new Set<string>();
    
    // Get prefix matches for autocomplete
    this.index.prefix.forEach((entries, prefix) => {
      if (prefix.startsWith(normalizedQuery) && prefix !== normalizedQuery) {
        entries.forEach(entry => {
          if (entry.english.toLowerCase().startsWith(normalizedQuery)) {
            suggestions.add(entry.english);
          }
        });
      }
    });
    
    return Array.from(suggestions)
      .sort((a, b) => a.length - b.length) // Prefer shorter suggestions
      .slice(0, limit);
  }

  getStats() {
    return {
      isIndexBuilt: this.isIndexBuilt,
      ...this.indexStats,
      memoryUsage: {
        exactEntries: this.index.exact.size,
        prefixEntries: this.index.prefix.size,
        wordEntries: this.index.words.size,
        ibibioEntries: this.index.ibibio.size,
        meaningEntries: this.index.meanings.size
      }
    };
  }

  // Debug method for analyzing search performance
  debugSearch(query: string): void {
    console.log('=== SEARCH ENGINE DEBUG ===');
    console.log(`Query: "${query}"`);
    console.log('Index stats:', this.getStats());
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // Test each search strategy
    console.log('\n🎯 Exact matches:', this.searchExact(normalizedQuery).length);
    console.log('🔸 Prefix matches:', (this.index.prefix.get(normalizedQuery) || []).length);
    console.log('🔹 Word matches:', this.extractWords(normalizedQuery).map(word => 
      `${word}: ${(this.index.words.get(word) || []).length}`));
    console.log('🔄 Ibibio matches:', (this.index.ibibio.get(normalizedQuery) || []).length);
    console.log('📝 Meaning matches:', this.extractWords(normalizedQuery).map(word => 
      `${word}: ${(this.index.meanings.get(word) || []).length}`));
    
    // Test fuzzy search
    const fuzzyResults = this.searchFuzzy(normalizedQuery, 5);
    console.log('\n🔍 Fuzzy search results:');
    fuzzyResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.entry.english} -> ${result.entry.ibibio} (${(result.confidence * 100).toFixed(1)}%)`);
    });
    
    // Test suggestions
    const suggestions = this.getSearchSuggestions(normalizedQuery);
    console.log('\n💡 Suggestions:', suggestions);
  }
}

export const searchEngine = new SearchEngine();