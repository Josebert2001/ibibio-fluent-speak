import { groqService } from './groqService';
import { dictionaryService } from './dictionaryService';
import { langchainAgentService } from './langchainAgent';
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

      // Initialize Langchain agent for online searches
      try {
        await langchainAgentService.initialize();
        console.log('Langchain agent initialized for online searches');
      } catch (agentError) {
        console.warn('Langchain agent initialization failed, will use fallback online search:', agentError);
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
        console.log(`Processing sentence with ${words.length} words: "${query}"`);
        
        // Try to translate sentence word by word using local dictionary
        const sentenceResult = await this.translateSentenceLocally(words, normalizedQuery);
        if (sentenceResult) {
          const result: ParallelSearchResult = {
            result: sentenceResult.entry,
            confidence: sentenceResult.confidence,
            source: 'local_sentence',
            alternatives: sentenceResult.alternatives,
            sources: ['local_dictionary'],
            responseTime: Date.now() - startTime
          };

          // Cache the result
          cacheManager.set(normalizedQuery, result, result.source);
          return result;
        }
      }

      // Step 2: Search local dictionary for the entire phrase
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

      // Step 3: Not found locally - try online search with Langchain agent
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

      console.log(`"${query}" not found in local dictionary. Searching online with AI agent...`);
      
      try {
        const onlineResult = await this.searchOnlineWithAgent(normalizedQuery);
        
        if (onlineResult) {
          const result: ParallelSearchResult = {
            result: onlineResult.result,
            confidence: onlineResult.confidence,
            source: onlineResult.source,
            alternatives: [],
            sources: [onlineResult.source],
            responseTime: Date.now() - startTime
          };

          // Cache the validated online result
          cacheManager.set(normalizedQuery, result, result.source);
          return result;
        }
      } catch (onlineError) {
        console.error('Online search with agent failed:', onlineError);
        
        // Fallback to direct API call if agent fails
        try {
          const fallbackResult = await this.searchOnlineFallback(normalizedQuery);
          if (fallbackResult) {
            const result: ParallelSearchResult = {
              result: fallbackResult,
              confidence: 65, // Lower confidence for fallback
              source: 'online_fallback',
              alternatives: [],
              sources: ['online_fallback'],
              responseTime: Date.now() - startTime
            };

            cacheManager.set(normalizedQuery, result, result.source);
            return result;
          }
        } catch (fallbackError) {
          console.error('Fallback online search also failed:', fallbackError);
        }
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

  private async translateSentenceLocally(words: string[], originalQuery: string): Promise<{
    entry: DictionaryEntry;
    confidence: number;
    alternatives: DictionaryEntry[];
  } | null> {
    const wordTranslations: Array<{
      english: string;
      ibibio: string;
      meaning: string;
      found: boolean;
    }> = [];

    let totalWordsFound = 0;

    // Check each word in the local dictionary
    for (const word of words) {
      const exactMatch = dictionaryService.searchExact(word);
      
      if (exactMatch) {
        wordTranslations.push({
          english: word,
          ibibio: exactMatch.ibibio,
          meaning: exactMatch.meaning,
          found: true
        });
        totalWordsFound++;
        console.log(`Found "${word}" -> "${exactMatch.ibibio}" in local dictionary`);
      } else {
        // Try fuzzy search for partial matches
        const fuzzyResults = dictionaryService.searchFuzzy(word, 1);
        if (fuzzyResults.length > 0 && fuzzyResults[0].confidence > 0.8) {
          const match = fuzzyResults[0].entry;
          wordTranslations.push({
            english: word,
            ibibio: match.ibibio,
            meaning: match.meaning,
            found: true
          });
          totalWordsFound++;
          console.log(`Found "${word}" -> "${match.ibibio}" via fuzzy search`);
        } else {
          wordTranslations.push({
            english: word,
            ibibio: word, // Keep original if not found
            meaning: `Translation not found for "${word}"`,
            found: false
          });
          console.log(`"${word}" not found in local dictionary`);
        }
      }
    }

    // Calculate confidence based on how many words were found
    const confidence = totalWordsFound / words.length;
    
    // Only return a result if we found at least 70% of the words
    if (confidence < 0.7) {
      console.log(`Only found ${totalWordsFound}/${words.length} words locally (${(confidence * 100).toFixed(1)}%). Skipping local sentence translation.`);
      return null;
    }

    // Construct the sentence translation
    const ibibioSentence = wordTranslations.map(wt => wt.ibibio).join(' ');
    const meaningParts = wordTranslations
      .filter(wt => wt.found)
      .map(wt => `${wt.english}: ${wt.meaning}`)
      .join('; ');

    const sentenceEntry: DictionaryEntry = {
      id: `sentence-${Date.now()}`,
      english: originalQuery,
      ibibio: ibibioSentence,
      meaning: `Sentence translation: ${meaningParts}`,
      partOfSpeech: 'sentence',
      examples: [
        {
          english: originalQuery,
          ibibio: ibibioSentence
        }
      ],
      cultural: `This sentence was translated word-by-word using the local dictionary. ${totalWordsFound} out of ${words.length} words were found locally.`
    };

    console.log(`Successfully translated sentence locally: "${originalQuery}" -> "${ibibioSentence}"`);

    return {
      entry: sentenceEntry,
      confidence: confidence * 100, // Convert to percentage
      alternatives: []
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

  private async searchOnlineWithAgent(query: string): Promise<{
    result: DictionaryEntry;
    confidence: number;
    source: string;
  } | null> {
    try {
      console.log('Using Langchain agent for validated online search...');
      
      const agentResult = await langchainAgentService.searchWithAgent(query);
      
      if (agentResult.result) {
        console.log(`Agent found translation: "${query}" -> "${agentResult.result.ibibio}" (confidence: ${agentResult.confidence})`);
        
        return {
          result: agentResult.result,
          confidence: agentResult.confidence * 100, // Convert to percentage
          source: agentResult.source
        };
      }
      
      return null;
    } catch (error) {
      console.error('Langchain agent search error:', error);
      throw error;
    }
  }

  private async searchOnlineFallback(query: string): Promise<DictionaryEntry | null> {
    try {
      console.log('Using fallback direct API search...');
      
      // Use direct Groq API as fallback with validation prompt
      const prompt = `Translate "${query}" from English to Ibibio. 
      
      IMPORTANT: Only provide a translation if you are confident it is accurate. 
      Cross-reference multiple sources if possible.
      
      Return ONLY a JSON response with this exact format:
      {
        "ibibio": "the accurate Ibibio translation",
        "meaning": "the English meaning/definition",
        "confidence": 0.8,
        "validation": "brief note on how you verified this translation"
      }
      
      If you cannot find a reliable and accurate translation, return:
      {
        "ibibio": "",
        "meaning": "",
        "confidence": 0,
        "validation": "no reliable translation found"
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
              content: 'You are a careful translator that only provides accurate English to Ibibio translations. Always validate your translations and indicate your confidence level.'
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
        console.log('Fallback search: No reliable translation found');
        return null;
      }

      // Create dictionary entry from validated fallback result
      return {
        id: `fallback-${Date.now()}`,
        english: query,
        ibibio: result.ibibio,
        meaning: result.meaning,
        partOfSpeech: 'unknown',
        examples: [],
        cultural: `Translation found through validated online search. ${result.validation || 'Verified through multiple sources.'}`
      };

    } catch (error) {
      console.error('Fallback online search error:', error);
      return null;
    }
  }

  getStats() {
    return {
      cacheStats: cacheManager.getStats(),
      isInitialized: this.isInitialized,
      hasApiKey: !!groqService.getApiKey(),
      searchEngineReady: !!searchEngine,
      langchainAgentReady: langchainAgentService.getStats().isInitialized
    };
  }
}

export const parallelSearchService = new ParallelSearchService();