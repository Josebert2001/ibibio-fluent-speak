
import { enhancedWebScrapingService, ScrapedTranslation } from './enhancedWebScrapingService';
import { huggingFaceService, BackendTranslationResponse } from './huggingFaceService';
import { dictionaryService } from './dictionaryService';
import { groqService } from './groqService';
import { DictionaryEntry } from '../types/dictionary';

interface SourceResult {
  source: string;
  found: boolean;
  translation: string;
  confidence: number;
  metadata: any;
  responseTime: number;
  error?: string;
}

interface MultiSourceResult {
  query: string;
  primaryResult: DictionaryEntry | null;
  sourceResults: SourceResult[];
  finalConfidence: number;
  consensusScore: number;
  conflictingResults: boolean;
  validationNotes: string[];
  totalResponseTime: number;
}

class MultiSourceSearchService {
  private sourceWeights = {
    'local_dictionary': 0.9,
    'enhanced_backend': 0.85,
    'web_glosbe': 0.8,
    'web_wiktionary': 0.85,
    'ai_groq': 0.7
  };

  async searchAllSources(query: string): Promise<MultiSourceResult> {
    const startTime = performance.now();
    console.log(`Starting multi-source search for: "${query}"`);

    const sourcePromises = [
      this.searchLocalDictionary(query),
      this.searchEnhancedBackend(query),
      this.searchWebSources(query),
      this.searchGroqAI(query)
    ];

    const results = await Promise.allSettled(sourcePromises);
    const sourceResults: SourceResult[] = results
      .map(result => result.status === 'fulfilled' ? result.value : null)
      .filter(Boolean)
      .flat();

    const totalResponseTime = performance.now() - startTime;

    // Analyze results for consensus and conflicts
    const analysis = this.analyzeResults(sourceResults);
    
    // Select primary result based on weighted confidence
    const primaryResult = this.selectPrimaryResult(query, sourceResults, analysis.consensusScore);
    
    // Calculate final confidence
    const finalConfidence = this.calculateFinalConfidence(sourceResults, analysis.consensusScore);

    console.log(`Multi-source search completed in ${totalResponseTime.toFixed(1)}ms`);
    console.log(`Found ${sourceResults.length} source results with consensus score: ${analysis.consensusScore}`);

    return {
      query,
      primaryResult,
      sourceResults,
      finalConfidence,
      consensusScore: analysis.consensusScore,
      conflictingResults: analysis.hasConflicts,
      validationNotes: analysis.validationNotes,
      totalResponseTime
    };
  }

  private async searchLocalDictionary(query: string): Promise<SourceResult[]> {
    const startTime = performance.now();
    
    try {
      const result = dictionaryService.search(query);
      const responseTime = performance.now() - startTime;

      if (result) {
        return [{
          source: 'local_dictionary',
          found: true,
          translation: result.ibibio,
          confidence: 95,
          metadata: {
            meaning: result.meaning,
            partOfSpeech: result.partOfSpeech,
            examples: result.examples
          },
          responseTime
        }];
      }

      return [{
        source: 'local_dictionary',
        found: false,
        translation: '',
        confidence: 0,
        metadata: {},
        responseTime
      }];
    } catch (error) {
      return [{
        source: 'local_dictionary',
        found: false,
        translation: '',
        confidence: 0,
        metadata: {},
        responseTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }];
    }
  }

  private async searchEnhancedBackend(query: string): Promise<SourceResult[]> {
    const startTime = performance.now();
    
    try {
      const response = await huggingFaceService.translateOnline(query);
      const responseTime = performance.now() - startTime;

      if (response.status === 'error') {
        return [{
          source: 'enhanced_backend',
          found: false,
          translation: '',
          confidence: 0,
          metadata: { error: response.error },
          responseTime,
          error: response.error
        }];
      }

      const results: SourceResult[] = [];

      // Process AI response
      if (response.ai_response) {
        const translation = this.extractTranslation(response.ai_response);
        results.push({
          source: 'enhanced_backend_ai',
          found: !!translation,
          translation: translation || '',
          confidence: translation ? 85 : 0,
          metadata: { fullResponse: response.ai_response },
          responseTime
        });
      }

      // Process local dictionary match
      if (response.local_dictionary) {
        const translation = this.extractTranslation(response.local_dictionary);
        results.push({
          source: 'enhanced_backend_local',
          found: !!translation,
          translation: translation || '',
          confidence: translation ? 90 : 0,
          metadata: { fullResponse: response.local_dictionary },
          responseTime
        });
      }

      // Process web search results
      if (response.web_search) {
        const translation = this.extractTranslation(response.web_search);
        results.push({
          source: 'enhanced_backend_web',
          found: !!translation,
          translation: translation || '',
          confidence: translation ? 80 : 0,
          metadata: { fullResponse: response.web_search },
          responseTime
        });
      }

      return results.length > 0 ? results : [{
        source: 'enhanced_backend',
        found: false,
        translation: '',
        confidence: 0,
        metadata: response,
        responseTime
      }];
    } catch (error) {
      return [{
        source: 'enhanced_backend',
        found: false,
        translation: '',
        confidence: 0,
        metadata: {},
        responseTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }];
    }
  }

  private async searchWebSources(query: string): Promise<SourceResult[]> {
    const startTime = performance.now();
    
    try {
      const scrapingResults = await enhancedWebScrapingService.searchMultipleSources(query);
      const responseTime = performance.now() - startTime;

      return scrapingResults.map(result => ({
        source: `web_${result.source.split('.')[0]}`, // e.g., 'web_glosbe'
        found: result.success && result.translations.length > 0,
        translation: result.translations[0]?.ibibio || '',
        confidence: result.translations[0]?.confidence ? result.translations[0].confidence * 100 : 0,
        metadata: {
          allTranslations: result.translations,
          source: result.source
        },
        responseTime,
        error: result.error
      }));
    } catch (error) {
      return [{
        source: 'web_sources',
        found: false,
        translation: '',
        confidence: 0,
        metadata: {},
        responseTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }];
    }
  }

  private async searchGroqAI(query: string): Promise<SourceResult[]> {
    const startTime = performance.now();
    
    try {
      const apiKey = groqService.getApiKey();
      if (!apiKey) {
        return [{
          source: 'ai_groq',
          found: false,
          translation: '',
          confidence: 0,
          metadata: { reason: 'API key not available' },
          responseTime: performance.now() - startTime
        }];
      }

      const result = await groqService.translateWithAI(query);
      const responseTime = performance.now() - startTime;

      if (result && result.ibibio) {
        return [{
          source: 'ai_groq',
          found: true,
          translation: result.ibibio,
          confidence: result.confidence * 100,
          metadata: {
            meaning: result.meaning,
            examples: result.examples,
            cultural: result.cultural
          },
          responseTime
        }];
      }

      return [{
        source: 'ai_groq',
        found: false,
        translation: '',
        confidence: 0,
        metadata: {},
        responseTime
      }];
    } catch (error) {
      return [{
        source: 'ai_groq',
        found: false,
        translation: '',
        confidence: 0,
        metadata: {},
        responseTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }];
    }
  }

  private extractTranslation(text: string): string {
    const patterns = [
      /Translation:\s*([^.\n]+)/i,
      /Ibibio:\s*([^.\n]+)/i,
      /means?\s*"([^"]+)"/i,
      /is\s+"([^"]+)"/i,
      /"([^"]+)"/,
      /→\s*([^.\n]+)/,
      /:\s*([^.\n]+)/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim() && match[1].trim().length > 1) {
        return match[1].trim();
      }
    }

    // Fallback: first meaningful line
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 1);
    return lines[0] || '';
  }

  private analyzeResults(sourceResults: SourceResult[]): {
    consensusScore: number;
    hasConflicts: boolean;
    validationNotes: string[];
  } {
    const foundResults = sourceResults.filter(r => r.found && r.translation);
    const validationNotes: string[] = [];

    if (foundResults.length === 0) {
      return {
        consensusScore: 0,
        hasConflicts: false,
        validationNotes: ['No translations found from any source']
      };
    }

    // Group similar translations
    const translationGroups: { [key: string]: SourceResult[] } = {};
    
    foundResults.forEach(result => {
      const normalizedTranslation = result.translation.toLowerCase().trim();
      if (!translationGroups[normalizedTranslation]) {
        translationGroups[normalizedTranslation] = [];
      }
      translationGroups[normalizedTranslation].push(result);
    });

    const groupSizes = Object.values(translationGroups).map(group => group.length);
    const maxGroupSize = Math.max(...groupSizes);
    const hasConflicts = Object.keys(translationGroups).length > 1;

    // Calculate consensus score
    const consensusScore = (maxGroupSize / foundResults.length) * 100;

    // Generate validation notes
    if (hasConflicts) {
      validationNotes.push(`Found ${Object.keys(translationGroups).length} different translations`);
      Object.entries(translationGroups).forEach(([translation, sources]) => {
        validationNotes.push(`"${translation}" supported by ${sources.length} source(s): ${sources.map(s => s.source).join(', ')}`);
      });
    } else {
      validationNotes.push(`All ${foundResults.length} sources agree on the translation`);
    }

    return {
      consensusScore,
      hasConflicts,
      validationNotes
    };
  }

  private selectPrimaryResult(query: string, sourceResults: SourceResult[], consensusScore: number): DictionaryEntry | null {
    const foundResults = sourceResults.filter(r => r.found && r.translation);
    
    if (foundResults.length === 0) {
      return null;
    }

    // Sort by weighted confidence
    const weightedResults = foundResults.map(result => ({
      ...result,
      weightedConfidence: result.confidence * (this.sourceWeights[result.source as keyof typeof this.sourceWeights] || 0.5)
    })).sort((a, b) => b.weightedConfidence - a.weightedConfidence);

    const bestResult = weightedResults[0];

    return {
      id: `multi-source-${Date.now()}`,
      english: query,
      ibibio: bestResult.translation,
      meaning: `Multi-source translation (${bestResult.source})`,
      partOfSpeech: this.inferPartOfSpeech(query),
      examples: bestResult.metadata.examples || [],
      cultural: `Confidence: ${bestResult.confidence}%, Consensus: ${consensusScore.toFixed(1)}%`,
      category: 'multi-source'
    };
  }

  private calculateFinalConfidence(sourceResults: SourceResult[], consensusScore: number): number {
    const foundResults = sourceResults.filter(r => r.found);
    
    if (foundResults.length === 0) return 0;
    
    const avgConfidence = foundResults.reduce((sum, r) => sum + r.confidence, 0) / foundResults.length;
    const sourceBonus = Math.min(foundResults.length * 5, 20); // Up to 20% bonus for multiple sources
    const consensusBonus = consensusScore * 0.1; // Up to 10% bonus for consensus
    
    return Math.min(avgConfidence + sourceBonus + consensusBonus, 100);
  }

  private inferPartOfSpeech(text: string): string {
    const trimmed = text.trim().toLowerCase();
    
    if (trimmed.includes(' ')) return 'phrase';
    if (trimmed.endsWith('ing') || trimmed.endsWith('ed')) return 'verb';
    if (trimmed.endsWith('ly')) return 'adverb';
    if (['good', 'bad', 'big', 'small'].includes(trimmed)) return 'adjective';
    
    return 'noun';
  }

  getStats() {
    return {
      sourceWeights: this.sourceWeights,
      availableSources: Object.keys(this.sourceWeights),
      serviceName: 'Multi-Source Search Orchestrator'
    };
  }
}

export const multiSourceSearchService = new MultiSourceSearchService();
export type { MultiSourceResult, SourceResult };
