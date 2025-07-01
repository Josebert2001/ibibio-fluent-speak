
import { dictionaryService } from './dictionaryService';
import { groqService } from './groqService';
import { langchainAgentService } from './langchainAgent';
import { DictionaryEntry } from '../types/dictionary';

interface SearchResult {
  result: DictionaryEntry | null;
  source: 'dictionary' | 'ai' | 'langchain-web' | 'cache';
  confidence: number;
  error?: string;
}

class IntelligentSearchService {
  async search(query: string): Promise<SearchResult> {
    const trimmedQuery = query.trim().toLowerCase();
    
    // First, try dictionary search
    const dictionaryResult = dictionaryService.search(trimmedQuery);
    if (dictionaryResult) {
      return {
        result: dictionaryResult,
        source: 'dictionary',
        confidence: 1.0
      };
    }

    // Check if API key is available for AI-powered searches
    const apiKey = groqService.getApiKey();
    if (!apiKey) {
      return {
        result: null,
        source: 'dictionary',
        confidence: 0,
        error: 'API key required for AI-powered translations. Please configure your Groq API key in the setup section.'
      };
    }

    // Try Langchain web search
    try {
      const webResult = await langchainAgentService.searchWithAgent(trimmedQuery);
      if (webResult.result) {
        return {
          result: webResult.result,
          source: 'langchain-web',
          confidence: webResult.confidence
        };
      }
    } catch (error) {
      console.warn('Langchain web search failed:', error);
      // Continue to AI translation as fallback
    }

    // Try AI translation as fallback
    try {
      const aiResult = await groqService.translateWithAI(trimmedQuery);
      if (aiResult.ibibio) {
        const entry: DictionaryEntry = {
          id: `ai-${Date.now()}`,
          english: trimmedQuery,
          ibibio: aiResult.ibibio,
          meaning: aiResult.meaning,
          partOfSpeech: 'unknown',
          examples: aiResult.examples || [],
          cultural: aiResult.cultural || undefined
        };

        return {
          result: entry,
          source: 'ai',
          confidence: aiResult.confidence
        };
      }
    } catch (error) {
      console.warn('AI translation failed:', error);
    }

    // No results found
    return {
      result: null,
      source: 'dictionary',
      confidence: 0,
      error: 'No translation found. Try a different word or check your API key configuration.'
    };
  }
}

export const intelligentSearchService = new IntelligentSearchService();
