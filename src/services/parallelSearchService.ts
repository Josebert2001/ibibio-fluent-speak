
import { huggingFaceService } from './huggingFaceService';
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
  intelligentAnalysis?: {
    contextType: string;
    linguisticComplexity: number;
    recommendedApproach: string;
    confidence: number;
  };
}

class ParallelSearchService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize core services
      await dictionaryService.loadDictionary();
      
      // Build search index
      const entries = dictionaryService.getAllEntries();
      if (entries.length > 0) {
        searchEngine.buildIndex(entries);
      }

      // Initialize intelligent Langchain agent
      try {
        await langchainAgentService.initialize();
        console.log('Intelligent Langchain coordinator initialized');
      } catch (agentError) {
        console.warn('Langchain agent initialization failed:', agentError);
      }

      this.isInitialized = true;
      console.log('Enhanced parallel search service initialized with intelligent coordination');
    } catch (error) {
      console.error('Failed to initialize parallel search service:', error);
      this.isInitialized = true; // Continue without failing
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
      // Step 1: Determine query type and complexity
      const words = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
      const isMultiWord = words.length > 1;
      
      if (isMultiWord) {
        console.log(`Processing sentence with intelligent coordination: ${words.length} words`);
        return await this.processIntelligentSentence(query, normalizedQuery, startTime);
      } else {
        console.log(`Processing single word with intelligent coordination: ${query}`);
        return await this.processIntelligentSingleWord(normalizedQuery, startTime);
      }

    } catch (error) {
      console.error('Intelligent search error:', error);
      
      // Enhanced fallback with better error handling
      const fallbackResult = dictionaryService.search(normalizedQuery);
      return {
        result: fallbackResult,
        confidence: fallbackResult ? 70 : 0,
        source: 'local_fallback',
        alternatives: [],
        sources: fallbackResult ? ['local_dictionary'] : [],
        responseTime: Date.now() - startTime,
        intelligentAnalysis: {
          contextType: 'fallback',
          linguisticComplexity: 0.5,
          recommendedApproach: 'local_only',
          confidence: fallbackResult ? 0.7 : 0
        }
      };
    }
  }

  private async processIntelligentSingleWord(
    normalizedQuery: string, 
    startTime: number
  ): Promise<ParallelSearchResult> {
    
    // Step 1: Use Langchain as the primary intelligent coordinator
    if (langchainAgentService.isAvailable()) {
      try {
        console.log(`Using intelligent Langchain coordinator for: "${normalizedQuery}"`);
        const intelligentResult = await langchainAgentService.searchWithAgent(normalizedQuery);
        
        if (intelligentResult.result) {
          // Get additional context from local dictionary for comparison
          const localResult = await this.searchLocal(normalizedQuery);
          
          // Prepare alternatives
          const alternatives: DictionaryEntry[] = [];
          if (localResult.result && localResult.result.id !== intelligentResult.result.id) {
            alternatives.push(localResult.result);
          }
          alternatives.push(...localResult.alternatives);

          const result: ParallelSearchResult = {
            result: intelligentResult.result,
            confidence: intelligentResult.confidence * 100,
            source: intelligentResult.source,
            alternatives: alternatives,
            sources: [intelligentResult.source, ...(localResult.result ? ['local_dictionary'] : [])],
            responseTime: Date.now() - startTime,
            isMultiWord: false,
            intelligentAnalysis: {
              contextType: 'single_word_intelligent',
              linguisticComplexity: this.calculateComplexity(normalizedQuery),
              recommendedApproach: 'langchain_coordinated',
              confidence: intelligentResult.confidence
            }
          };

          // Cache the intelligent result
          cacheManager.set(normalizedQuery, result, result.source);
          return result;
        }
      } catch (agentError) {
        console.warn('Intelligent Langchain coordinator failed, using fallback:', agentError);
      }
    }
    
    // Step 2: Fallback to enhanced local search with semantic analysis
    console.log(`Using enhanced local search for: "${normalizedQuery}"`);
    const localResult = await this.searchLocal(normalizedQuery);
    
    if (localResult.result) {
      const result: ParallelSearchResult = {
        result: localResult.result,
        confidence: localResult.confidence,
        source: 'local_semantic',
        alternatives: localResult.alternatives,
        sources: ['local_dictionary'],
        responseTime: Date.now() - startTime,
        isMultiWord: false,
        intelligentAnalysis: {
          contextType: 'local_semantic',
          linguisticComplexity: this.calculateComplexity(normalizedQuery),
          recommendedApproach: 'local_with_analysis',
          confidence: localResult.confidence / 100
        }
      };

      cacheManager.set(normalizedQuery, result, result.source);
      return result;
    }

    // Step 3: Direct Hugging Face backend with enhanced error handling
    console.log(`Using direct Hugging Face backend for: "${normalizedQuery}"`);
    
    try {
      const huggingFaceResult = await huggingFaceService.getDictionaryEntry(normalizedQuery);
      
      if (huggingFaceResult) {
        const result: ParallelSearchResult = {
          result: huggingFaceResult,
          confidence: 80,
          source: 'huggingface_enhanced',
          alternatives: [],
          sources: ['huggingface_backend'],
          responseTime: Date.now() - startTime,
          isMultiWord: false,
          intelligentAnalysis: {
            contextType: 'backend_direct',
            linguisticComplexity: this.calculateComplexity(normalizedQuery),
            recommendedApproach: 'backend_fallback',
            confidence: 0.8
          }
        };

        cacheManager.set(normalizedQuery, result, result.source);
        return result;
      }
    } catch (huggingFaceError) {
      console.error('Enhanced Hugging Face search failed:', huggingFaceError);
    }

    // No results found
    return {
      result: null,
      confidence: 0,
      source: 'no_results',
      alternatives: [],
      sources: [],
      responseTime: Date.now() - startTime,
      isMultiWord: false,
      intelligentAnalysis: {
        contextType: 'not_found',
        linguisticComplexity: this.calculateComplexity(normalizedQuery),
        recommendedApproach: 'no_match',
        confidence: 0
      }
    };
  }

  private async processIntelligentSentence(
    originalQuery: string, 
    normalizedQuery: string, 
    startTime: number
  ): Promise<ParallelSearchResult> {
    
    // Step 1: Check for exact sentence match in local dictionary
    const exactSentenceMatch = await this.searchLocal(normalizedQuery);
    
    // Step 2: Use intelligent sentence processing
    const sentenceResult = await sentenceTranslationService.translateSentence(originalQuery);
    
    // Step 3: Try Langchain for sentence coordination if available
    let langchainSentenceResult = null;
    if (langchainAgentService.isAvailable()) {
      try {
        console.log('Using Langchain for intelligent sentence coordination');
        langchainSentenceResult = await langchainAgentService.searchWithAgent(originalQuery);
      } catch (error) {
        console.warn('Langchain sentence coordination failed:', error);
      }
    }
    
    // Step 4: Intelligent result prioritization
    let primaryResult: DictionaryEntry | null = null;
    let primarySource = 'none';
    let primaryConfidence = 0;
    
    // Priority 1: Langchain coordinated result
    if (langchainSentenceResult?.result) {
      primaryResult = langchainSentenceResult.result;
      primarySource = 'langchain_sentence';
      primaryConfidence = langchainSentenceResult.confidence * 100;
    }
    // Priority 2: Exact local sentence match
    else if (exactSentenceMatch.result) {
      primaryResult = exactSentenceMatch.result;
      primarySource = 'local_sentence_exact';
      primaryConfidence = exactSentenceMatch.confidence;
    }
    // Priority 3: Online sentence translation
    else if (sentenceResult.onlineResult) {
      primaryResult = sentenceResult.onlineResult;
      primarySource = 'huggingface_sentence';
      primaryConfidence = sentenceResult.onlineConfidence;
    }
    // Priority 4: Local word-by-word
    else if (sentenceResult.localResult) {
      primaryResult = sentenceResult.localResult;
      primarySource = 'local_sentence_breakdown';
      primaryConfidence = sentenceResult.localConfidence;
    }
    
    // Step 5: Build intelligent alternatives
    const alternatives: DictionaryEntry[] = [];
    
    if (sentenceResult.localResult && primarySource !== 'local_sentence_breakdown') {
      alternatives.push(sentenceResult.localResult);
    }
    
    if (sentenceResult.onlineResult && primarySource !== 'huggingface_sentence') {
      alternatives.push(sentenceResult.onlineResult);
    }
    
    // Step 6: Compile sources
    const sources: string[] = [];
    if (sentenceResult.hasLocalTranslation) sources.push('local_dictionary');
    if (sentenceResult.hasOnlineTranslation) sources.push('huggingface_online');
    if (langchainSentenceResult?.result) sources.push('langchain_intelligent');
    
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
      wordBreakdown: sentenceResult.wordBreakdown,
      intelligentAnalysis: {
        contextType: 'multi_word_intelligent',
        linguisticComplexity: this.calculateComplexity(normalizedQuery),
        recommendedApproach: primarySource.includes('langchain') ? 'langchain_coordinated' : 'hybrid_sentence',
        confidence: primaryConfidence / 100
      }
    };
    
    // Cache the intelligent sentence result
    if (primaryResult) {
      cacheManager.set(normalizedQuery, result, primarySource);
    }
    
    return result;
  }

  private async searchLocal(query: string): Promise<{
    result: DictionaryEntry | null;
    confidence: number;
    alternatives: DictionaryEntry[];
  }> {
    // Enhanced local search with better semantic matching
    const results = searchEngine.searchFuzzy(query, 5);
    
    return {
      result: results.length > 0 ? results[0].entry : null,
      confidence: results.length > 0 ? results[0].confidence * 100 : 0,
      alternatives: results.slice(1).map(r => r.entry)
    };
  }

  private calculateComplexity(query: string): number {
    const words = query.split(/\s+/);
    let complexity = 0.5; // Base complexity

    // Single words are generally simpler
    if (words.length === 1) complexity -= 0.2;
    
    // Multiple words increase complexity
    if (words.length > 3) complexity += 0.3;
    
    // Common words are simpler
    const commonWords = ['hello', 'water', 'food', 'good', 'bad', 'big', 'small', 'love', 'family', 'stop', 'house', 'thank', 'god'];
    if (words.some(word => commonWords.includes(word.toLowerCase()))) {
      complexity -= 0.1;
    }

    // Complex punctuation or special characters increase complexity
    if (/[^\w\s]/.test(query)) complexity += 0.2;

    return Math.max(0.1, Math.min(complexity, 1.0));
  }

  getStats() {
    return {
      cacheStats: cacheManager.getStats(),
      isInitialized: this.isInitialized,
      huggingFaceStats: huggingFaceService.getStats(),
      searchEngineReady: !!searchEngine,
      langchainIntelligentAvailable: langchainAgentService.isAvailable(),
      langchainStats: langchainAgentService.getStats(),
      intelligentMode: true
    };
  }
}

export const parallelSearchService = new ParallelSearchService();
