import { DictionaryEntry } from '../types/dictionary';
import { dictionaryService } from './dictionaryService';
import { enhancedDictionaryService } from './enhancedDictionaryService';
import { langchainAgentService } from './langchainAgent';
import { groqService } from './groqService';

interface SearchResponse {
  word: string;
  definition: DictionaryEntry | null;
  source: 'local' | 'online' | 'ai' | 'cache';
  responseTime: number;
  confidence: number;
  error?: string;
  cached?: boolean;
}

interface OnlineSearchResult {
  word: string;
  definitions: Array<{
    meaning: string;
    partOfSpeech: string;
    pronunciation?: string;
    examples?: string[];
    etymology?: string;
  }>;
  source: string;
}

class DictionarySearchService {
  private cache: Map<string, { result: DictionaryEntry; timestamp: number; source: string }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly SEARCH_TIMEOUT = 5000; // 5 seconds

  constructor() {
    this.loadCacheFromStorage();
  }

  private loadCacheFromStorage(): void {
    try {
      const cached = localStorage.getItem('dictionary-search-cache');
      if (cached) {
        const data = JSON.parse(cached);
        this.cache = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading search cache:', error);
    }
  }

  private saveCacheToStorage(): void {
    try {
      const data = Object.fromEntries(this.cache);
      localStorage.setItem('dictionary-search-cache', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving search cache:', error);
    }
  }

  private isValidCacheEntry(entry: { timestamp: number }): boolean {
    return Date.now() - entry.timestamp < this.CACHE_DURATION;
  }

  async searchWord(word: string): Promise<SearchResponse> {
    const startTime = performance.now();
    const normalizedWord = word.toLowerCase().trim();

    if (!normalizedWord) {
      return {
        word,
        definition: null,
        source: 'local',
        responseTime: performance.now() - startTime,
        confidence: 0,
        error: 'Please enter a valid word'
      };
    }

    try {
      // Step 1: Check cache first
      const cached = this.getCachedResult(normalizedWord);
      if (cached) {
        return {
          word,
          definition: cached.result,
          source: cached.source as 'local' | 'online' | 'ai',
          responseTime: performance.now() - startTime,
          confidence: 0.95,
          cached: true
        };
      }

      // Step 2: Primary search - Local dictionary
      const localResult = await this.searchLocal(normalizedWord);
      if (localResult.definition) {
        this.cacheResult(normalizedWord, localResult.definition, 'local');
        return {
          ...localResult,
          word,
          responseTime: performance.now() - startTime
        };
      }

      // Step 3: Secondary search - Online sources
      console.log(`Word "${word}" not found locally, searching online...`);
      const onlineResult = await this.searchOnline(normalizedWord);
      if (onlineResult.definition) {
        this.cacheResult(normalizedWord, onlineResult.definition, 'online');
        return {
          ...onlineResult,
          word,
          responseTime: performance.now() - startTime
        };
      }

      // Step 4: Fallback - AI translation (for Ibibio words)
      const aiResult = await this.searchWithAI(normalizedWord);
      if (aiResult.definition) {
        this.cacheResult(normalizedWord, aiResult.definition, 'ai');
        return {
          ...aiResult,
          word,
          responseTime: performance.now() - startTime
        };
      }

      // No results found
      return {
        word,
        definition: null,
        source: 'local',
        responseTime: performance.now() - startTime,
        confidence: 0,
        error: `No definition found for "${word}" in local or online sources`
      };

    } catch (error) {
      console.error('Dictionary search error:', error);
      return {
        word,
        definition: null,
        source: 'local',
        responseTime: performance.now() - startTime,
        confidence: 0,
        error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private getCachedResult(word: string): { result: DictionaryEntry; source: string } | null {
    const cached = this.cache.get(word);
    if (cached && this.isValidCacheEntry(cached)) {
      return cached;
    }
    if (cached) {
      this.cache.delete(word); // Remove expired entry
    }
    return null;
  }

  private cacheResult(word: string, definition: DictionaryEntry, source: string): void {
    this.cache.set(word, {
      result: definition,
      timestamp: Date.now(),
      source
    });
    this.saveCacheToStorage();
  }

  private async searchLocal(word: string): Promise<Omit<SearchResponse, 'word' | 'responseTime'>> {
    try {
      // Try enhanced dictionary service first
      let result = enhancedDictionaryService.search(word);
      
      if (!result) {
        // Fallback to basic dictionary service
        result = dictionaryService.search(word);
      }

      if (!result) {
        // Try fuzzy search
        const fuzzyResults = enhancedDictionaryService.searchFuzzy(word, 1);
        if (fuzzyResults.length > 0) {
          result = fuzzyResults[0].entry;
        }
      }

      return {
        definition: result,
        source: 'local',
        confidence: result ? 0.95 : 0
      };
    } catch (error) {
      console.error('Local search error:', error);
      return {
        definition: null,
        source: 'local',
        confidence: 0,
        error: 'Local search failed'
      };
    }
  }

  private async searchOnline(word: string): Promise<Omit<SearchResponse, 'word' | 'responseTime'>> {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Online search timeout')), this.SEARCH_TIMEOUT);
      });

      // Race between actual search and timeout
      const searchPromise = this.performOnlineSearch(word);
      const result = await Promise.race([searchPromise, timeoutPromise]);

      return {
        definition: result,
        source: 'online',
        confidence: result ? 0.85 : 0
      };
    } catch (error) {
      console.error('Online search error:', error);
      return {
        definition: null,
        source: 'online',
        confidence: 0,
        error: `Online search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async performOnlineSearch(word: string): Promise<DictionaryEntry | null> {
    try {
      // Simulate multiple online dictionary APIs
      const searchPromises = [
        this.searchDictionaryAPI(word),
        this.searchMerriamWebster(word),
        this.searchWordnik(word)
      ];

      const results = await Promise.allSettled(searchPromises);
      
      // Find the first successful result
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          return result.value;
        }
      }

      return null;
    } catch (error) {
      console.error('Online search execution error:', error);
      return null;
    }
  }

  private async searchDictionaryAPI(word: string): Promise<DictionaryEntry | null> {
    try {
      // Simulate Dictionary API call
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      
      if (!response.ok) {
        throw new Error(`Dictionary API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const entry = data[0];
        const meaning = entry.meanings?.[0];
        const definition = meaning?.definitions?.[0];

        return {
          id: `dict-api-${Date.now()}`,
          english: word,
          ibibio: '', // Not applicable for English dictionary
          meaning: definition?.definition || 'Definition not available',
          partOfSpeech: meaning?.partOfSpeech || 'unknown',
          examples: definition?.example ? [{ english: definition.example, ibibio: '' }] : [],
          pronunciation: entry.phonetic || entry.phonetics?.[0]?.text,
          cultural: `Definition from Dictionary API - ${entry.sourceUrls?.[0] || 'online source'}`
        };
      }

      return null;
    } catch (error) {
      console.error('Dictionary API search failed:', error);
      return null;
    }
  }

  private async searchMerriamWebster(word: string): Promise<DictionaryEntry | null> {
    try {
      // Simulate Merriam-Webster API (would need API key in real implementation)
      // For demo purposes, we'll simulate a response
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

      // Simulate some common words
      const mockDefinitions: Record<string, any> = {
        'hello': {
          definition: 'Used as a greeting or to begin a phone conversation',
          partOfSpeech: 'interjection',
          pronunciation: 'hə-ˈlō'
        },
        'water': {
          definition: 'A colorless, odorless, and tasteless liquid essential for most animal and plant life',
          partOfSpeech: 'noun',
          pronunciation: 'ˈwȯ-tər'
        },
        'love': {
          definition: 'A feeling of strong or constant affection for a person',
          partOfSpeech: 'noun',
          pronunciation: 'ˈləv'
        }
      };

      const mockData = mockDefinitions[word.toLowerCase()];
      if (mockData) {
        return {
          id: `merriam-${Date.now()}`,
          english: word,
          ibibio: '',
          meaning: mockData.definition,
          partOfSpeech: mockData.partOfSpeech,
          examples: [],
          pronunciation: mockData.pronunciation,
          cultural: 'Definition from Merriam-Webster Dictionary'
        };
      }

      return null;
    } catch (error) {
      console.error('Merriam-Webster search failed:', error);
      return null;
    }
  }

  private async searchWordnik(word: string): Promise<DictionaryEntry | null> {
    try {
      // Simulate Wordnik API
      await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 300));

      // For demo, return null to simulate no results
      return null;
    } catch (error) {
      console.error('Wordnik search failed:', error);
      return null;
    }
  }

  private async searchWithAI(word: string): Promise<Omit<SearchResponse, 'word' | 'responseTime'>> {
    try {
      const apiKey = groqService.getApiKey();
      if (!apiKey) {
        return {
          definition: null,
          source: 'ai',
          confidence: 0,
          error: 'AI search requires API key configuration'
        };
      }

      // Use Langchain agent for AI-powered search
      const result = await langchainAgentService.searchWithAgent(word);
      
      return {
        definition: result.result,
        source: 'ai',
        confidence: result.confidence
      };
    } catch (error) {
      console.error('AI search error:', error);
      return {
        definition: null,
        source: 'ai',
        confidence: 0,
        error: 'AI search failed'
      };
    }
  }

  // Public methods for cache management
  clearCache(): void {
    this.cache.clear();
    localStorage.removeItem('dictionary-search-cache');
  }

  getCacheStats(): {
    totalEntries: number;
    localEntries: number;
    onlineEntries: number;
    aiEntries: number;
  } {
    let localEntries = 0;
    let onlineEntries = 0;
    let aiEntries = 0;

    this.cache.forEach(entry => {
      switch (entry.source) {
        case 'local': localEntries++; break;
        case 'online': onlineEntries++; break;
        case 'ai': aiEntries++; break;
      }
    });

    return {
      totalEntries: this.cache.size,
      localEntries,
      onlineEntries,
      aiEntries
    };
  }

  // Batch search for multiple words
  async searchMultipleWords(words: string[]): Promise<SearchResponse[]> {
    const searchPromises = words.map(word => this.searchWord(word));
    return Promise.all(searchPromises);
  }
}

export const dictionarySearchService = new DictionarySearchService();