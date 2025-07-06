
import { DictionaryEntry, SearchResult } from '../types/dictionary';
import { dictionaryService } from './dictionaryService';
import { searchEngine } from './searchEngine';
import { cacheManager } from './cacheManager';

interface SearchContext {
  query: string;
  userContext?: string;
  previousQueries: string[];
  userPreferences: Record<string, any>;
}

interface IntelligentSearchResult {
  primaryResult: DictionaryEntry | null;
  alternatives: Array<{
    entry: DictionaryEntry;
    confidence: number;
    reason: string;
  }>;
  needsContext: boolean;
  contextQuestions: string[];
  confidence: number;
  searchStrategy: string;
  ambiguityReason?: string;
}

class IntelligentSearchService {
  private isInitialized = false;
  private userPreferences: Record<string, any> = {};

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await dictionaryService.loadDictionary();
      const entries = dictionaryService.getAllEntries();
      if (entries.length > 0) {
        searchEngine.buildIndex(entries);
      }
      
      // Load user preferences from localStorage
      const stored = localStorage.getItem('user-search-preferences');
      if (stored) {
        this.userPreferences = JSON.parse(stored);
      }
      
      this.isInitialized = true;
      console.log('Intelligent search service initialized');
    } catch (error) {
      console.error('Failed to initialize intelligent search service:', error);
    }
  }

  async searchIntelligently(context: SearchContext): Promise<IntelligentSearchResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const { query, userContext } = context;
    const normalizedQuery = query.toLowerCase().trim();

    // Step 1: Perform comprehensive search across entire dictionary
    const searchResults = await this.performComprehensiveSearch(normalizedQuery);
    
    // Step 2: Analyze results for ambiguity and confidence
    const analysis = this.analyzeSearchResults(searchResults, normalizedQuery, userContext);
    
    // Step 3: Determine if context is needed
    const needsContext = this.shouldRequestContext(analysis, searchResults);
    
    // Step 4: Generate context questions if needed
    const contextQuestions = needsContext ? this.generateContextQuestions(searchResults) : [];

    return {
      primaryResult: analysis.primaryResult,
      alternatives: analysis.alternatives,
      needsContext,
      contextQuestions,
      confidence: analysis.confidence,
      searchStrategy: analysis.strategy,
      ambiguityReason: analysis.ambiguityReason
    };
  }

  private async performComprehensiveSearch(query: string): Promise<SearchResult[]> {
    // Multi-pass search strategy
    const results: SearchResult[] = [];

    // Pass 1: Exact matches
    const exactResults = searchEngine.searchExact(query);
    if (exactResults.length > 0) {
      results.push(...exactResults.map(entry => ({ entry, confidence: 1.0, source: 'exact' })));
    }

    // Pass 2: Fuzzy search for close matches
    const fuzzyResults = searchEngine.searchFuzzy(query, 10);
    results.push(...fuzzyResults.filter(r => r.confidence > 0.3));

    // Pass 3: Semantic search (search meanings and examples)
    const semanticResults = this.performSemanticSearch(query);
    results.push(...semanticResults);

    // Pass 4: Contextual search (check cultural context and examples)
    const contextualResults = this.performContextualSearch(query);
    results.push(...contextualResults);

    // Remove duplicates and sort by confidence
    const uniqueResults = this.deduplicateResults(results);
    return uniqueResults.sort((a, b) => b.confidence - a.confidence);
  }

  private performSemanticSearch(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const entries = dictionaryService.getAllEntries();

    entries.forEach(entry => {
      let confidence = 0;

      // Check meaning/definition
      if (entry.meaning && entry.meaning.toLowerCase().includes(query)) {
        confidence = Math.max(confidence, 0.7);
      }

      // Check examples
      if (entry.examples) {
        entry.examples.forEach(example => {
          if (example.english.toLowerCase().includes(query)) {
            confidence = Math.max(confidence, 0.6);
          }
        });
      }

      // Check cultural context
      if (entry.cultural && entry.cultural.toLowerCase().includes(query)) {
        confidence = Math.max(confidence, 0.5);
      }

      if (confidence > 0) {
        results.push({ entry, confidence, source: 'semantic' });
      }
    });

    return results;
  }

  private performContextualSearch(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const entries = dictionaryService.getAllEntries();
    const queryWords = query.split(/\s+/);

    entries.forEach(entry => {
      let confidence = 0;

      // Check if query relates to the part of speech
      if (entry.partOfSpeech) {
        const posWords = ['verb', 'noun', 'adjective', 'adverb'];
        if (queryWords.some(word => posWords.includes(word)) && 
            queryWords.includes(entry.partOfSpeech)) {
          confidence = Math.max(confidence, 0.4);
        }
      }

      // Check category matches
      if (entry.category && queryWords.includes(entry.category.toLowerCase())) {
        confidence = Math.max(confidence, 0.4);
      }

      if (confidence > 0) {
        results.push({ entry, confidence, source: 'contextual' });
      }
    });

    return results;
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = result.entry.id || `${result.entry.english}-${result.entry.ibibio}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private analyzeSearchResults(
    results: SearchResult[], 
    query: string, 
    userContext?: string
  ): {
    primaryResult: DictionaryEntry | null;
    alternatives: Array<{ entry: DictionaryEntry; confidence: number; reason: string }>;
    confidence: number;
    strategy: string;
    ambiguityReason?: string;
  } {
    if (results.length === 0) {
      return {
        primaryResult: null,
        alternatives: [],
        confidence: 0,
        strategy: 'no_results'
      };
    }

    const topResult = results[0];
    const alternatives = results.slice(1, 6).map(r => ({
      entry: r.entry,
      confidence: r.confidence,
      reason: this.getAlternativeReason(r, query)
    }));

    // Check for ambiguity
    const isAmbiguous = results.length > 1 && 
                       results[1].confidence > 0.7 && 
                       topResult.confidence - results[1].confidence < 0.2;

    let strategy = 'single_result';
    let ambiguityReason;

    if (isAmbiguous) {
      strategy = 'ambiguous_results';
      ambiguityReason = this.determineAmbiguityReason(results.slice(0, 3));
    }

    return {
      primaryResult: topResult.entry,
      alternatives,
      confidence: topResult.confidence,
      strategy,
      ambiguityReason
    };
  }

  private shouldRequestContext(analysis: any, results: SearchResult[]): boolean {
    // Request context if:
    // 1. Results are ambiguous (multiple high-confidence results)
    // 2. Confidence is moderate (0.4-0.8 range)
    // 3. Multiple different meanings exist
    
    if (results.length < 2) return false;
    
    const hasMultipleHighConfidence = results.filter(r => r.confidence > 0.7).length > 1;
    const moderateConfidence = analysis.confidence > 0.4 && analysis.confidence < 0.8;
    const differentMeanings = this.hasDifferentMeanings(results.slice(0, 3));

    return hasMultipleHighConfidence || moderateConfidence || differentMeanings;
  }

  private generateContextQuestions(results: SearchResult[]): string[] {
    const questions: string[] = [];
    const topResults = results.slice(0, 3);

    if (topResults.length > 1) {
      // Generate specific context questions based on the alternatives
      const meanings = topResults.map(r => r.entry.meaning || 'Unknown meaning');
      
      if (meanings.length >= 2) {
        questions.push(`Did you mean "${topResults[0].entry.english}" as in "${meanings[0]}" or "${meanings[1]}"?`);
      }

      // Add part-of-speech based questions
      const uniquePOS = [...new Set(topResults.map(r => r.entry.partOfSpeech).filter(Boolean))];
      if (uniquePOS.length > 1) {
        questions.push(`Are you looking for the ${uniquePOS[0]} or ${uniquePOS[1]} form?`);
      }

      // Add context-specific questions
      questions.push('Can you provide more context about how you plan to use this word?');
    }

    return questions;
  }

  private getAlternativeReason(result: SearchResult, query: string): string {
    switch (result.source) {
      case 'exact':
        return 'Exact match';
      case 'semantic':
        return 'Found in meaning or examples';
      case 'contextual':
        return 'Related context or category';
      default:
        return `${Math.round(result.confidence * 100)}% match`;
    }
  }

  private determineAmbiguityReason(results: SearchResult[]): string {
    const reasons = [];
    
    const uniqueMeanings = new Set(results.map(r => r.entry.meaning));
    if (uniqueMeanings.size > 1) {
      reasons.push('multiple meanings');
    }

    const uniquePOS = new Set(results.map(r => r.entry.partOfSpeech));
    if (uniquePOS.size > 1) {
      reasons.push('different parts of speech');
    }

    return reasons.length > 0 ? reasons.join(' and ') : 'similar translations available';
  }

  private hasDifferentMeanings(results: SearchResult[]): boolean {
    const meanings = results.map(r => r.entry.meaning?.toLowerCase() || '').filter(Boolean);
    if (meanings.length < 2) return false;

    // Simple check for different meanings - could be enhanced with NLP
    return !meanings.every(meaning => meaning === meanings[0]);
  }

  updateUserPreferences(preferences: Record<string, any>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences };
    localStorage.setItem('user-search-preferences', JSON.stringify(this.userPreferences));
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      userPreferences: Object.keys(this.userPreferences).length,
      dictionaryEntries: dictionaryService.getStats().totalEntries
    };
  }
}

export const intelligentSearchService = new IntelligentSearchService();
