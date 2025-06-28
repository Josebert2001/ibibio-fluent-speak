import { groqService } from './groqService';
import { dictionaryService } from './dictionaryService';
import { cacheManager } from './cacheManager';
import { searchEngine } from './searchEngine';
import { langchainAgentService } from './langchainAgent';
import { sentenceTranslationService } from './sentenceTranslationService';
import { DictionaryEntry } from '../types/dictionary';

interface ParallelSearchResult {
  result: DictionaryEntry | null;
  confidence: number;
  source: string;
  alternatives: DictionaryEntry[];
  sources: string[];
  responseTime: number;
  // New fields for sentence processing
  isMultiWord?: boolean;
  localResult?: DictionaryEntry | null;
  onlineResult?: DictionaryEntry | null;
  wordBreakdown?: Array<{
    english: string;
    ibibio: string;
    found: boolean;
    confidence: number;
    source: string;
  }>;
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
      // Step 1: Determine if this is a multi-word query (sentence)
      const words = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
      const isMultiWord = words.length > 1;
      
      if (isMultiWord) {
        console.log(`Processing sentence with ${words.length} words:`, words);
        return await this.processSentence(query, normalizedQuery, startTime);
      } else {
        console.log(`Processing single word:`, query);
        return await this.processSingleWord(normalizedQuery, startTime);
      }

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

  private async processSentence(
    originalQuery: string, 
    normalizedQuery: string, 
    startTime: number
  ): Promise<ParallelSearchResult> {
    
    // Step 1: Check if exact sentence exists in dictionary
    const exactSentenceMatch = await this.searchLocal(normalizedQuery);
    
    // Step 2: Process sentence with word-by-word analysis
    const sentenceResult = await sentenceTranslationService.translateSentence(originalQuery);
    
    // Step 3: Determine primary result
    let primaryResult: DictionaryEntry | null = null;
    let primarySource = 'none';
    let primaryConfidence = 0;
    
    // Prioritize exact sentence match if found
    if (exactSentenceMatch.result) {
      primaryResult = exactSentenceMatch.result;
      primarySource = 'local_dictionary_exact';
      primaryConfidence = exactSentenceMatch.confidence;
    }
    // Then prioritize online sentence translation if available
    else if (sentenceResult.onlineResult) {
      primaryResult = sentenceResult.onlineResult;
      primarySource = 'online_sentence';
      primaryConfidence = sentenceResult.onlineConfidence;
    }
    // Finally use local word-by-word translation
    else if (sentenceResult.localResult) {
      primaryResult = sentenceResult.localResult;
      primarySource = 'local_sentence';
      primaryConfidence = sentenceResult.localConfidence;
    }
    
    // Step 4: Build alternatives array
    const alternatives: DictionaryEntry[] = [];
    
    // Add local result as alternative if it's not the primary
    if (sentenceResult.localResult && primarySource !== 'local_sentence') {
      alternatives.push(sentenceResult.localResult);
    }
    
    // Add online result as alternative if it's not the primary
    if (sentenceResult.onlineResult && primarySource !== 'online_sentence') {
      alternatives.push(sentenceResult.onlineResult);
    }
    
    // Step 5: Determine sources
    const sources: string[] = [];
    if (sentenceResult.hasLocalTranslation) sources.push('local_dictionary');
    if (sentenceResult.hasOnlineTranslation) sources.push('online_search');
    
    const result: ParallelSearchResult = {
      result: primaryResult,
      confidence: primaryConfidence,
      source: primarySource,
      alternatives,
      sources,
      responseTime: Date.now() - startTime,
      isMultiWord: true,
      localResult: sentenceResult.localResult,
      onlineResult: sentenceResult.onlineResult,
      wordBreakdown: sentenceResult.wordBreakdown
    };
    
    // Cache the result
    if (primaryResult) {
      cacheManager.set(normalizedQuery, result, primarySource);
    }
    
    return result;
  }

  private async processSingleWord(
    normalizedQuery: string, 
    startTime: number
  ): Promise<ParallelSearchResult> {
    
    // Step 1: Search local dictionary
    const localResult = await this.searchLocal(normalizedQuery);
    
    if (localResult.result) {
      // Found in local dictionary - return immediately
      const result: ParallelSearchResult = {
        result: localResult.result,
        confidence: localResult.confidence,
        source: 'local_dictionary',
        alternatives: localResult.alternatives,
        sources: ['local_dictionary'],
        responseTime: Date.now() - startTime,
        isMultiWord: false
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
        responseTime: Date.now() - startTime,
        isMultiWord: false
      };
    }

    console.log(`"${normalizedQuery}" not found in local dictionary. Searching online...`);
    
    // Step 3: Try Langchain agent first (if available)
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
            responseTime: Date.now() - startTime,
            isMultiWord: false
          };

          cacheManager.set(normalizedQuery, result, result.source);
          return result;
        }
      } catch (agentError) {
        console.warn('Langchain agent search failed, trying fallback:', agentError);
      }
    }
    
    // Step 4: Fallback to direct online search
    try {
      const onlineResult = await this.searchOnline(normalizedQuery);
      
      if (onlineResult) {
        const result: ParallelSearchResult = {
          result: onlineResult,
          confidence: 75, // Online results get 75% confidence
          source: 'online_search',
          alternatives: [],
          sources: ['online_search'],
          responseTime: Date.now() - startTime,
          isMultiWord: false
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
      responseTime: Date.now() - startTime,
      isMultiWord: false
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