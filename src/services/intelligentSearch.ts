
import { dictionaryService } from './dictionaryService';
import { groqService } from './groqService';
import { langchainAgentService } from './langchainAgent';
import { DictionaryEntry, SearchResult } from '../types/dictionary';

class IntelligentSearchService {
  async search(query: string): Promise<{
    result: DictionaryEntry | null;
    source: 'dictionary' | 'ai' | 'langchain-web' | 'cache';
    confidence: number;
  }> {
    console.log('Searching for:', query);

    // Step 1: Try exact dictionary lookup
    const exactMatch = dictionaryService.searchExact(query);
    if (exactMatch) {
      console.log('Found exact match in dictionary');
      return {
        result: exactMatch,
        source: 'dictionary',
        confidence: 1.0
      };
    }

    // Step 2: Try fuzzy dictionary search
    const fuzzyResults = dictionaryService.searchFuzzy(query, 1);
    if (fuzzyResults.length > 0 && fuzzyResults[0].confidence > 0.7) {
      console.log('Found fuzzy match in dictionary');
      return {
        result: fuzzyResults[0].entry,
        source: 'dictionary',
        confidence: fuzzyResults[0].confidence
      };
    }

    // Step 3: Try Langchain web search (new primary method)
    try {
      console.log('Using Langchain agent for web search');
      const webResult = await langchainAgentService.searchWithAgent(query);
      
      if (webResult.result) {
        return {
          result: webResult.result,
          source: webResult.source as 'langchain-web' | 'cache',
          confidence: webResult.confidence
        };
      }
    } catch (error) {
      console.error('Langchain web search failed:', error);
      // Continue to fallback AI method
    }

    // Step 4: Fallback to direct Groq AI translation
    try {
      console.log('Using direct AI for translation');
      const aiResponse = await groqService.translateWithAI(query);
      
      const aiEntry: DictionaryEntry = {
        id: `ai-${Date.now()}`,
        english: query,
        ibibio: aiResponse.ibibio,
        meaning: aiResponse.meaning,
        partOfSpeech: 'unknown',
        examples: aiResponse.examples,
        cultural: aiResponse.cultural
      };

      return {
        result: aiEntry,
        source: 'ai',
        confidence: aiResponse.confidence
      };
    } catch (error) {
      console.error('AI translation failed:', error);
      return {
        result: null,
        source: 'ai',
        confidence: 0
      };
    }
  }
}

export const intelligentSearchService = new IntelligentSearchService();
