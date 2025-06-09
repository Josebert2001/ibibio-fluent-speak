import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { pull } from 'langchain/hub';
import { createOnlineDictionaryTool, createResultValidationTool } from './onlineSearchTools';
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
        console.warn('Groq API key not available - online search disabled');
        return;
      }

      const llm = new ChatOpenAI({
        modelName: 'llama3-8b-8192',
        temperature: 0.1,
        openAIApiKey: apiKey,
        configuration: {
          baseURL: 'https://api.groq.com/openai/v1'
        }
      });

      const prompt = await pull<any>('hwchase17/react');
      const tools = [
        createOnlineDictionaryTool(),
        createResultValidationTool()
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
      console.log('Parallel search service initialized');
    } catch (error) {
      console.error('Failed to initialize parallel search service:', error);
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
    if (!searchEngine) {
      const entries = dictionaryService.getAllEntries();
      searchEngine.buildIndex(entries);
    }

    // Parallel search execution
    const searchPromises = [
      this.searchLocal(normalizedQuery),
      this.searchOnline(normalizedQuery)
    ];

    try {
      const [localResults, onlineResults] = await Promise.allSettled(searchPromises);
      
      const local = localResults.status === 'fulfilled' ? localResults.value : null;
      const online = onlineResults.status === 'fulfilled' ? onlineResults.value : null;

      // Reconcile results
      const finalResult = await this.reconcileResults(normalizedQuery, local, online);
      
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
      console.error('Parallel search error:', error);
      
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

  private async searchOnline(query: string): Promise<any> {
    if (!this.isInitialized || !this.agent) {
      await this.initialize();
      if (!this.agent) {
        throw new Error('Online search not available');
      }
    }

    const prompt = `Search for the English to Ibibio translation of "${query}" using online dictionaries. Return structured results with confidence scores.`;
    
    const result = await this.agent!.invoke({
      input: prompt
    });

    try {
      const parsed = JSON.parse(result.output);
      return parsed.success ? parsed.results : null;
    } catch (error) {
      console.error('Failed to parse online search results:', error);
      return null;
    }
  }

  private async reconcileResults(
    query: string,
    localResults: any,
    onlineResults: any
  ): Promise<{
    result: DictionaryEntry | null;
    confidence: number;
    source: string;
    alternatives: DictionaryEntry[];
    sources: string[];
  }> {
    // If we have local results, prioritize them
    if (localResults?.result) {
      const alternatives = [...(localResults.alternatives || [])];
      const sources = ['local_dictionary'];

      // Add online alternatives if they don't conflict
      if (onlineResults && Array.isArray(onlineResults)) {
        onlineResults.forEach((online: any) => {
          if (online.ibibio !== localResults.result.ibibio) {
            alternatives.push({
              id: `online-${Date.now()}-${Math.random()}`,
              english: query,
              ibibio: online.ibibio,
              meaning: online.meaning,
              partOfSpeech: 'unknown',
              examples: [],
              cultural: `Source: ${online.sources?.join(', ') || 'online'}`
            });
          }
        });
        
        if (onlineResults.length > 0) {
          sources.push('online_verification');
        }
      }

      return {
        result: localResults.result,
        confidence: Math.min(100, localResults.confidence + (onlineResults ? 5 : 0)),
        source: 'local_primary',
        alternatives: alternatives.slice(0, 4),
        sources
      };
    }

    // If no local results but we have online results
    if (onlineResults && Array.isArray(onlineResults) && onlineResults.length > 0) {
      const primary = onlineResults[0];
      
      return {
        result: {
          id: `online-${Date.now()}`,
          english: query,
          ibibio: primary.ibibio,
          meaning: primary.meaning,
          partOfSpeech: 'unknown',
          examples: [],
          pronunciation: primary.pronunciation,
          cultural: `Sources: ${primary.sources?.join(', ') || 'online dictionaries'}`
        },
        confidence: Math.round(primary.combinedConfidence * 100),
        source: 'online_primary',
        alternatives: onlineResults.slice(1, 4).map((result: any) => ({
          id: `online-alt-${Date.now()}-${Math.random()}`,
          english: query,
          ibibio: result.ibibio,
          meaning: result.meaning,
          partOfSpeech: 'unknown',
          examples: [],
          cultural: `Sources: ${result.sources?.join(', ') || 'online'}`
        })),
        sources: primary.sources || ['online_dictionaries']
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
      isOnlineEnabled: this.isInitialized,
      searchEngineReady: !!searchEngine
    };
  }
}

export const parallelSearchService = new ParallelSearchService();