import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { pull } from 'langchain/hub';
import { createOnlineDictionaryTool, createResultValidationTool } from './onlineSearchTools';
import { 
  createCulturalContextTool, 
  createPronunciationTool, 
  createExampleSentenceTool,
  createComprehensiveSearchTool 
} from './langchainTools';
import { groqService } from './groqService';
import { dictionaryService } from './dictionaryService';
import { cacheManager } from './cacheManager';
import { searchEngine } from './searchEngine';
import { DictionaryEntry, SearchResult } from '../types/dictionary';

interface ParallelSearchResult {
  result: DictionaryEntry | null;
  confidence: number;
  source: string;
  alternatives: DictionaryEntry[];
  sources: string[];
  responseTime: number;
}

class ParallelSearchService {
  private agent: AgentExecutor | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const apiKey = groqService.getApiKey();
      if (!apiKey) {
        console.warn('Groq API key not available - enhanced search disabled');
        return;
      }

      const llm = new ChatOpenAI({
        modelName: 'llama3-8b-8192',
        temperature: 0.05, // Reduced for faster responses
        openAIApiKey: apiKey,
        configuration: {
          baseURL: 'https://api.groq.com/openai/v1'
        }
      });

      const prompt = await pull<any>('hwchase17/react');
      
      // Enhanced tools array with new Langchain tools
      const tools = [
        createOnlineDictionaryTool(),
        createResultValidationTool(),
        createCulturalContextTool(),
        createPronunciationTool(),
        createExampleSentenceTool(),
        createComprehensiveSearchTool()
      ];

      const agentRunnable = await createReactAgent({
        llm,
        tools,
        prompt,
      });

      this.agent = new AgentExecutor({
        agent: agentRunnable,
        tools,
        verbose: false,
        maxIterations: 2, // Reduced from 3 for faster responses
      });

      this.isInitialized = true;
      console.log('Enhanced parallel search service initialized with', tools.length, 'tools');
    } catch (error) {
      console.error('Failed to initialize enhanced parallel search service:', error);
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

    // Initialize search engine if needed
    const entries = dictionaryService.getAllEntries();
    if (entries.length > 0) {
      searchEngine.buildIndex(entries);
    }

    // Parallel search execution with enhanced capabilities
    const searchPromises = [
      this.searchLocal(normalizedQuery),
      this.searchEnhanced(normalizedQuery)
    ];

    try {
      const [localResults, enhancedResults] = await Promise.allSettled(searchPromises);
      
      const local = localResults.status === 'fulfilled' ? localResults.value : null;
      const enhanced = enhancedResults.status === 'fulfilled' ? enhancedResults.value : null;

      // Reconcile results with enhanced data
      const finalResult = await this.reconcileEnhancedResults(normalizedQuery, local, enhanced);
      
      const result: ParallelSearchResult = {
        ...finalResult,
        responseTime: Date.now() - startTime
      };

      // Cache successful results
      if (result.result) {
        cacheManager.set(normalizedQuery, result, result.source);
      }

      return result;
    } catch (error) {
      console.error('Enhanced parallel search error:', error);
      
      // Fallback to local search only
      const localResult = await this.searchLocal(normalizedQuery);
      return {
        result: localResult?.result || null,
        confidence: localResult?.confidence || 0,
        source: 'local_fallback',
        alternatives: localResult?.alternatives || [],
        sources: ['local_dictionary'],
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

  private async searchEnhanced(query: string): Promise<any> {
    if (!this.isInitialized || !this.agent) {
      await this.initialize();
      if (!this.agent) {
        throw new Error('Enhanced search not available');
      }
    }

    // Optimized prompt for faster processing
    const prompt = `Find Ibibio translation for "${query}". Return concise JSON with translation, cultural context, and pronunciation.`;
    
    const result = await this.agent!.invoke({
      input: prompt
    });

    try {
      // Try to extract JSON from the response
      const jsonMatch = result.output.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : result.output;
      const parsed = JSON.parse(jsonString);
      return parsed;
    } catch (error) {
      console.error('Failed to parse enhanced search results:', error);
      return null;
    }
  }

  private async reconcileEnhancedResults(
    query: string,
    localResults: any,
    enhancedResults: any
  ): Promise<{
    result: DictionaryEntry | null;
    confidence: number;
    source: string;
    alternatives: DictionaryEntry[];
    sources: string[];
  }> {
    // If we have local results, enhance them with AI data
    if (localResults?.result) {
      const enhancedEntry = { ...localResults.result };
      const alternatives = [...(localResults.alternatives || [])];
      const sources = ['local_dictionary'];

      // Enhance with AI-generated data if available
      if (enhancedResults) {
        if (enhancedResults.cultural) {
          enhancedEntry.cultural = enhancedResults.cultural;
          sources.push('ai_cultural_context');
        }
        if (enhancedResults.pronunciation) {
          enhancedEntry.pronunciation = enhancedResults.pronunciation;
          sources.push('ai_pronunciation');
        }
        if (enhancedResults.examples && enhancedResults.examples.length > 0) {
          enhancedEntry.examples = [
            ...(enhancedEntry.examples || []),
            ...enhancedResults.examples
          ].slice(0, 3); // Limit to 3 examples
          sources.push('ai_examples');
        }
      }

      return {
        result: enhancedEntry,
        confidence: Math.min(100, localResults.confidence + (enhancedResults ? 10 : 0)),
        source: 'enhanced_local',
        alternatives: alternatives.slice(0, 3),
        sources
      };
    }

    // If no local results but we have enhanced AI results
    if (enhancedResults && enhancedResults.ibibio) {
      return {
        result: {
          id: `enhanced-ai-${Date.now()}`,
          english: query,
          ibibio: enhancedResults.ibibio,
          meaning: enhancedResults.meaning || `AI-generated translation for ${query}`,
          partOfSpeech: 'unknown',
          examples: enhancedResults.examples || [],
          pronunciation: enhancedResults.pronunciation,
          cultural: enhancedResults.cultural || 'AI-enhanced cultural context'
        },
        confidence: 85,
        source: 'ai_enhanced',
        alternatives: [],
        sources: ['ai_translation', 'ai_cultural_context', 'ai_pronunciation']
      };
    }

    // No results found
    return {
      result: null,
      confidence: 0,
      source: 'none',
      alternatives: [],
      sources: []
    };
  }

  getStats() {
    return {
      cacheStats: cacheManager.getStats(),
      isEnhancedEnabled: this.isInitialized,
      searchEngineReady: !!searchEngine,
      toolsAvailable: this.isInitialized ? 6 : 0
    };
  }
}

export const parallelSearchService = new ParallelSearchService();