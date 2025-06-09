import { enhancedDictionaryService } from './enhancedDictionaryService';
import { parallelSearchService } from './parallelSearchService';
import { groqService } from './groqService';
import { DictionaryEntry } from '../types/dictionary';

interface EnhancedSearchResult {
  result: DictionaryEntry | null;
  confidence: number;
  source: string;
  alternatives: DictionaryEntry[];
  sources: string[];
  responseTime: number;
  error?: string;
}

class IntelligentSearchV2 {
  private performanceMetrics = {
    totalSearches: 0,
    cacheHits: 0,
    averageResponseTime: 0,
    successRate: 0
  };

  async search(query: string): Promise<EnhancedSearchResult> {
    const startTime = performance.now();
    this.performanceMetrics.totalSearches++;

    try {
      // Initialize services if needed
      await this.ensureServicesReady();

      // Execute parallel search
      const result = await parallelSearchService.search(query);
      
      const responseTime = performance.now() - startTime;
      this.updateMetrics(responseTime, !!result.result);

      return {
        result: result.result,
        confidence: result.confidence,
        source: result.source,
        alternatives: result.alternatives,
        sources: result.sources,
        responseTime,
        error: result.result ? undefined : 'No translation found'
      };

    } catch (error) {
      console.error('Enhanced search error:', error);
      
      // Fallback to basic dictionary search
      const fallbackResult = await this.fallbackSearch(query);
      const responseTime = performance.now() - startTime;
      
      this.updateMetrics(responseTime, !!fallbackResult);

      return {
        result: fallbackResult,
        confidence: fallbackResult ? 80 : 0,
        source: 'fallback',
        alternatives: [],
        sources: ['local_dictionary'],
        responseTime,
        error: fallbackResult ? undefined : 'Search failed - using fallback method'
      };
    }
  }

  private async ensureServicesReady(): Promise<void> {
    // Ensure dictionary is loaded
    if (!enhancedDictionaryService.getStats().isLoaded) {
      await enhancedDictionaryService.loadDictionary();
    }

    // Initialize parallel search service
    await parallelSearchService.initialize();
  }

  private async fallbackSearch(query: string): Promise<DictionaryEntry | null> {
    try {
      // Try enhanced dictionary service
      const result = enhancedDictionaryService.search(query);
      if (result) return result;

      // Try fuzzy search
      const fuzzyResults = enhancedDictionaryService.searchFuzzy(query, 1);
      if (fuzzyResults.length > 0) {
        return fuzzyResults[0].entry;
      }

      // Last resort: AI translation if API key available
      const apiKey = groqService.getApiKey();
      if (apiKey) {
        const aiResult = await groqService.translateWithAI(query);
        if (aiResult.ibibio) {
          return {
            id: `ai-fallback-${Date.now()}`,
            english: query,
            ibibio: aiResult.ibibio,
            meaning: aiResult.meaning,
            partOfSpeech: 'unknown',
            examples: aiResult.examples || [],
            cultural: aiResult.cultural
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Fallback search error:', error);
      return null;
    }
  }

  private updateMetrics(responseTime: number, success: boolean): void {
    const metrics = this.performanceMetrics;
    
    // Update average response time
    metrics.averageResponseTime = (
      (metrics.averageResponseTime * (metrics.totalSearches - 1)) + responseTime
    ) / metrics.totalSearches;

    // Update success rate
    if (success) {
      metrics.successRate = ((metrics.successRate * (metrics.totalSearches - 1)) + 100) / metrics.totalSearches;
    } else {
      metrics.successRate = (metrics.successRate * (metrics.totalSearches - 1)) / metrics.totalSearches;
    }
  }

  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      parallelSearchStats: parallelSearchService.getStats(),
      dictionaryStats: enhancedDictionaryService.getStats()
    };
  }

  async runPerformanceTest(): Promise<any> {
    const testQueries = [
      'hello', 'water', 'love', 'family', 'house', 'food', 'good', 'bad', 'big', 'small'
    ];

    console.log('Running performance test...');
    const results = [];

    for (const query of testQueries) {
      const start = performance.now();
      const result = await this.search(query);
      const time = performance.now() - start;

      results.push({
        query,
        found: !!result.result,
        confidence: result.confidence,
        source: result.source,
        responseTime: time
      });
    }

    const averageTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const successRate = (results.filter(r => r.found).length / results.length) * 100;

    return {
      averageResponseTime: averageTime,
      successRate,
      results,
      totalQueries: testQueries.length
    };
  }
}

export const intelligentSearchV2 = new IntelligentSearchV2();