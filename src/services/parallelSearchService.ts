import { groqService } from './groqService';
import { dictionaryService } from './dictionaryService';
import { cacheManager } from './cacheManager';
import { searchEngine } from './searchEngine';
import { DictionaryEntry } from '../types/dictionary';

interface ParallelSearchResult {
  result: DictionaryEntry | null;
  confidence: number;
  source: string;
  alternatives: DictionaryEntry[];
  sources: string[];
  responseTime: number;
}

class ParallelSearchService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize dictionary services
      await dictionaryService.loadDictionary();
      
      // Build search index
      const entries = dictionaryService.getAllEntries();
      if (entries.length > 0) {
        searchEngine.buildIndex(entries);
      }

      this.isInitialized = true;
      console.log('Parallel search service initialized');
    } catch (error) {
      console.error('Failed to initialize parallel search service:', error);
      this.isInitialized = true; // Mark as initialized even if there are errors
    }
  }

  async search(query: string): Promise<ParallelSearchResult> {
    const startTime = Date.now();
    const normalizedQuery = query.toLowerCase().trim();

    // Check cache first
    const cached = cacheManager.get<ParallelSearchResult>(normalizedQuery);
    if (cached) {
      console.log('Cache hit for:', query);
      return {
        ...cached,
        responseTime: Date.now() - startTime
      };
    }

    // Initialize if needed
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Step 1: Search local dictionary first
      const localResult = await this.searchLocal(normalizedQuery);
      
      if (localResult.result) {
        // Found in local dictionary - return immediately
        const result: ParallelSearchResult = {
          result: localResult.result,
          confidence: localResult.confidence,
          source: 'local_dictionary',
          alternatives: localResult.alternatives,
          sources: ['local_dictionary'],
          responseTime: Date.now() - startTime
        };

        // Cache the result
        cacheManager.set(normalizedQuery, result, result.source);
        return result;
      }

      // Step 2: Not found locally - try online search with AI
      const apiKey = groqService.getApiKey();
      if (!apiKey) {
        // No API key available
        return {
          result: null,
          confidence: 0,
          source: 'none',
          alternatives: [],
          sources: [],
          responseTime: Date.now() - startTime
        };
      }

      console.log(`Word "${query}" not found in local dictionary. Searching online...`);
      
      try {
        const onlineResult = await this.searchOnline(normalizedQuery);
        
        if (onlineResult) {
          const result: ParallelSearchResult = {
            result: onlineResult,
            confidence: 75, // Online results get 75% confidence
            source: 'online_search',
            alternatives: [],
            sources: ['online_search'],
            responseTime: Date.now() - startTime
          };

          // Cache the online result
          cacheManager.set(normalizedQuery, result, result.source);
          return result;
        }
      } catch (onlineError) {
        console.error('Online search failed:', onlineError);
      }

      // No results found anywhere
      return {
        result: null,
        confidence: 0,
        source: 'none',
        alternatives: [],
        sources: [],
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Search error:', error);
      
      // Fallback to basic local search
      const fallbackResult = dictionaryService.search(normalizedQuery);
      return {
        result: fallbackResult,
        confidence: fallbackResult ? 60 : 0,
        source: 'local_fallback',
        alternatives: [],
        sources: fallbackResult ? ['local_dictionary'] : [],
        responseTime: Date.now() - startTime
      };
    }
  }

  private async searchLocal(query: string): Promise<{
    result: DictionaryEntry | null;
    confidence: number;
    alternatives: DictionaryEntry[];
  }> {
    const results = searchEngine.searchFuzzy(query, 5);
    
    return {
      result: results.length > 0 ? results[0].entry : null,
      confidence: results.length > 0 ? results[0].confidence * 100 : 0,
      alternatives: results.slice(1).map(r => r.entry)
    };
  }

  private async searchOnline(query: string): Promise<DictionaryEntry | null> {
    try {
      // Use AI to search online for the specific word
      const prompt = `Search online for the English to Ibibio translation of "${query}". 
      
      Look for this word in online dictionaries, language resources, and reliable sources.
      
      Return ONLY a JSON response with this exact format:
      {
        "ibibio": "the Ibibio translation",
        "meaning": "the English meaning/definition",
        "confidence": 0.8
      }
      
      If you cannot find a reliable translation, return:
      {
        "ibibio": "",
        "meaning": "",
        "confidence": 0
      }`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqService.getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that searches online for English to Ibibio translations. Return only valid JSON responses.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        return null;
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const result = JSON.parse(jsonMatch[0]);
      
      if (!result.ibibio || !result.meaning || result.confidence === 0) {
        return null;
      }

      // Create dictionary entry from online result
      return {
        id: `online-${Date.now()}`,
        english: query,
        ibibio: result.ibibio,
        meaning: result.meaning,
        partOfSpeech: 'unknown',
        examples: [],
        cultural: 'Translation found through online search'
      };

    } catch (error) {
      console.error('Online search error:', error);
      return null;
    }
  }

  getStats() {
    return {
      cacheStats: cacheManager.getStats(),
      isInitialized: this.isInitialized,
      hasApiKey: !!groqService.getApiKey(),
      searchEngineReady: !!searchEngine
    };
  }
}

export const parallelSearchService = new ParallelSearchService();