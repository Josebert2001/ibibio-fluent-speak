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
        console.log('Groq API key not available - using local search only');
        this.isInitialized = true; // Mark as initialized for local-only mode
        return;
      }

      const llm = new ChatOpenAI({
        modelName: 'llama3-8b-8192',
        temperature: 0.05,
        openAIApiKey: apiKey,
        configuration: {
          baseURL: 'https://api.groq.com/openai/v1'
        }
      });

      const prompt = await pull<any>('hwchase17/react');
      
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
        maxIterations: 2,
      });

      this.isInitialized = true;
      console.log('Enhanced parallel search service initialized with AI capabilities');
    } catch (error) {
      console.error('Failed to initialize AI features, falling back to local search:', error);
      this.isInitialized = true; // Still mark as initialized for local-only mode
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

    try {
      // Always try local search first
      const localResults = await this.searchLocal(normalizedQuery);
      
      // If we have a good local result, enhance it if AI is available
      if (localResults.result && this.agent) {
        try {
          const enhancedResults = await this.searchEnhanced(normalizedQuery);
          const finalResult = await this.reconcileEnhancedResults(normalizedQuery, localResults, enhancedResults);
          
          const result: ParallelSearchResult = {
            ...finalResult,
            responseTime: Date.now() - startTime
          };

          // Cache successful results
          if (result.result) {
            cacheManager.set(normalizedQuery, result, result.source);
          }

          return result;
        } catch (aiError) {
          console.warn('AI enhancement failed, using local result:', aiError);
          // Return local result if AI enhancement fails
          return {
            result: localResults.result,
            confidence: localResults.confidence,
            source: 'local_primary',
            alternatives: localResults.alternatives,
            sources: ['local_dictionary'],
            responseTime: Date.now() - startTime
          };
        }
      }

      // If no local result and AI is available, try AI-only search
      if (!localResults.result && this.agent) {
        try {
          const aiResults = await this.searchEnhanced(normalizedQuery);
          if (aiResults && aiResults.ibibio) {
            const result: ParallelSearchResult = {
              result: {
                id: `ai-only-${Date.now()}`,
                english: query,
                ibibio: aiResults.ibibio,
                meaning: aiResults.meaning || `AI-generated translation for ${query}`,
                partOfSpeech: 'unknown',
                examples: aiResults.examples || [],
                pronunciation: aiResults.pronunciation,
                cultural: aiResults.cultural || 'AI-enhanced translation'
              },
              confidence: 75,
              source: 'ai_primary',
              alternatives: [],
              sources: ['ai_translation'],
              responseTime: Date.now() - startTime
            };

            // Cache AI result
            if (result.result) {
              cacheManager.set(normalizedQuery, result, result.source);
            }

            return result;
          }
        } catch (aiError) {
          console.warn('AI search failed:', aiError);
        }
      }

      // Return local result or empty result
      return {
        result: localResults.result,
        confidence: localResults.confidence,
        source: localResults.result ? 'local_primary' : 'none',
        alternatives: localResults.alternatives,
        sources: localResults.result ? ['local_dictionary'] : [],
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Search error:', error);
      
      // Fallback to basic local search
      const fallbackResult = dictionaryService.search(normalizedQuery);
      return {
        result: fallbackResult,
        confidence: fallbackResult ? 80 : 0,
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

  private async searchEnhanced(query: string): Promise<any> {
    if (!this.agent) {
      throw new Error('AI enhancement not available');
    }

    const prompt = `Find Ibibio translation for "${query}". Return concise JSON with translation, cultural context, and pronunciation.`;
    
    const result = await this.agent.invoke({
      input: prompt
    });

    try {
      const jsonMatch = result.output.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : result.output;
      const parsed = JSON.parse(jsonString);
      return parsed;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
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
    if (localResults?.result) {
      const enhancedEntry = { ...localResults.result };
      const alternatives = [...(localResults.alternatives || [])];
      const sources = ['local_dictionary'];

      // Enhance with AI data if available
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
          ].slice(0, 3);
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
      isAiEnabled: this.isInitialized && !!this.agent,
      searchEngineReady: !!searchEngine,
      toolsAvailable: this.isInitialized && this.agent ? 6 : 0
    };
  }
}

export const parallelSearchService = new ParallelSearchService();