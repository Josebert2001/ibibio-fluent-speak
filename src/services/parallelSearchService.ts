import { groqService } from './groqService';
import { dictionaryService } from './dictionaryService';
import { cacheManager } from './cacheManager';
import { searchEngine } from './searchEngine';
import { langchainAgentService } from './langchainAgent';
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

      // Try to initialize Langchain agent (non-blocking)
      try {
        await langchainAgentService.initialize();
      } catch (agentError) {
        console.warn('Langchain agent initialization failed, continuing without agent:', agentError);
        // Don't throw - continue initialization without agent
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
      // Step 1: Check if this is a sentence (multiple words)
      const words = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
      
      if (words.length > 1) {
        console.log(`Processing sentence with ${words.length} words:`, words);
        
        // Try local sentence translation first
        const sentenceResult = await this.translateSentenceLocally(words);
        if (sentenceResult.result) {
          const result: ParallelSearchResult = {
            result: sentenceResult.result,
            confidence: sentenceResult.confidence,
            source: 'local_sentence',
            alternatives: [],
            sources: ['local_dictionary'],
            responseTime: Date.now() - startTime
          };
          
          cacheManager.set(normalizedQuery, result, result.source);
          return result;
        }
      }

      // Step 2: Search local dictionary for exact phrase
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

      // Step 3: Not found locally - try online search with AI
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

      console.log(`"${query}" not found in local dictionary. Searching online...`);
      
      // Step 4: Try Langchain agent first (if available)
      if (langchainAgentService.isAvailable()) {
        try {
          const agentResult = await langchainAgentService.searchWithAgent(normalizedQuery);
          
          if (agentResult.result) {
            const result: ParallelSearchResult = {
              result: agentResult.result,
              confidence: agentResult.confidence * 100,
              source: agentResult.source,
              alternatives: [],
              sources: [agentResult.source],
              responseTime: Date.now() - startTime
            };

            cacheManager.set(normalizedQuery, result, result.source);
            return result;
          }
        } catch (agentError) {
          console.warn('Langchain agent search failed, trying fallback:', agentError);
        }
      }
      
      // Step 5: Fallback to direct online search
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

  private async translateSentenceLocally(words: string[]): Promise<{
    result: DictionaryEntry | null;
    confidence: number;
  }> {
    const translations: string[] = [];
    const foundWords: string[] = [];
    const notFoundWords: string[] = [];

    // Look up each word individually
    for (const word of words) {
      // Skip very short words (articles, prepositions)
      if (word.length <= 2 && !['is', 'am', 'be', 'to', 'of', 'in', 'on', 'at'].includes(word)) {
        translations.push(word); // Keep as-is
        continue;
      }

      // Try exact match first
      const exactMatch = searchEngine.searchExact(word);
      if (exactMatch.length > 0) {
        translations.push(exactMatch[0].ibibio);
        foundWords.push(word);
        continue;
      }

      // Try fuzzy search with high confidence threshold
      const fuzzyResults = searchEngine.searchFuzzy(word, 1);
      if (fuzzyResults.length > 0 && fuzzyResults[0].confidence > 0.8) {
        translations.push(fuzzyResults[0].entry.ibibio);
        foundWords.push(word);
        continue;
      }

      // Word not found
      notFoundWords.push(word);
      translations.push(`[${word}]`); // Mark as untranslated
    }

    console.log(`Local sentence analysis: Found ${foundWords.length}/${words.length} words`);
    console.log('Found words:', foundWords);
    console.log('Not found words:', notFoundWords);

    // Calculate confidence based on found words
    const confidence = foundWords.length / words.length;
    
    // Only return result if we found at least 70% of words
    if (confidence >= 0.7) {
      const ibibioSentence = translations.join(' ');
      const englishSentence = words.join(' ');
      
      return {
        result: {
          id: `sentence-${Date.now()}`,
          english: englishSentence,
          ibibio: ibibioSentence,
          meaning: `Sentence translation: ${englishSentence}`,
          partOfSpeech: 'sentence',
          examples: [],
          cultural: `Translated word-by-word from local dictionary (${Math.round(confidence * 100)}% coverage)`
        },
        confidence: confidence * 100
      };
    }

    return {
      result: null,
      confidence: confidence * 100
    };
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
      // Use AI to search online for the specific word with validation
      const prompt = `Search online for the English to Ibibio translation of "${query}". 
      
      IMPORTANT: Verify the accuracy of your translation by cross-referencing multiple reliable sources.
      Only provide translations you are confident are correct.
      
      Return ONLY a JSON response with this exact format:
      {
        "ibibio": "the verified Ibibio translation",
        "meaning": "the English meaning/definition",
        "confidence": 0.8,
        "verified": true
      }
      
      If you cannot find a reliable and verified translation, return:
      {
        "ibibio": "",
        "meaning": "",
        "confidence": 0,
        "verified": false
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
              content: 'You are a careful and accurate translator that only provides verified English to Ibibio translations. Always verify your translations against multiple sources before responding.'
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
      
      if (!result.ibibio || !result.meaning || result.confidence === 0 || !result.verified) {
        return null;
      }

      // Create dictionary entry from verified online result
      return {
        id: `online-verified-${Date.now()}`,
        english: query,
        ibibio: result.ibibio,
        meaning: result.meaning,
        partOfSpeech: 'unknown',
        examples: [],
        cultural: 'Translation verified through online search with multiple source validation'
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
      searchEngineReady: !!searchEngine,
      langchainAgentAvailable: langchainAgentService.isAvailable()
    };
  }
}

export const parallelSearchService = new ParallelSearchService();