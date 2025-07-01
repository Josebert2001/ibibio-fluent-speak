import { dictionaryService } from './dictionaryService';
import { searchEngine } from './searchEngine';
import { huggingFaceService, BackendTranslationResponse } from './huggingFaceService';
import { cacheManager } from './cacheManager';
import { DictionaryEntry } from '../types/dictionary';

interface WordAnalysis {
  word: string;
  cleanWord: string;
  dictionaryEntry: DictionaryEntry | null;
  found: boolean;
  confidence: number;
  partOfSpeech?: string;
  examples: Array<{ english: string; ibibio: string }>;
  alternatives: DictionaryEntry[];
}

interface OnlineSearchResult {
  definitions: Array<{
    source: string;
    definition: string;
    ibibio: string;
    confidence: number;
  }>;
  relatedPhrases: Array<{
    phrase: string;
    translation: string;
    context: string;
  }>;
  webExamples: Array<{
    english: string;
    ibibio: string;
    source: string;
  }>;
  additionalResources: Array<{
    title: string;
    url: string;
    description: string;
  }>;
}

interface ComprehensiveSearchResult {
  inputText: string;
  isMultiWord: boolean;
  wordAnalyses: WordAnalysis[];
  dictionaryResults: {
    totalWords: number;
    foundWords: number;
    coverage: number;
    overallConfidence: number;
  };
  onlineResults: OnlineSearchResult | null;
  combinedTranslation: {
    ibibio: string;
    confidence: number;
    source: 'dictionary' | 'huggingface' | 'hybrid';
  } | null;
  requestedOnlineSearch: boolean;
}

class ComprehensiveDictionaryService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await dictionaryService.loadDictionary();
      const entries = dictionaryService.getAllEntries();
      if (entries.length > 0) {
        searchEngine.buildIndex(entries);
      }
      this.isInitialized = true;
      console.log('Comprehensive dictionary service initialized');
    } catch (error) {
      console.error('Failed to initialize comprehensive dictionary service:', error);
      this.isInitialized = true;
    }
  }

  async search(
    inputText: string, 
    requestOnlineSearch: boolean = false
  ): Promise<ComprehensiveSearchResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const normalizedInput = inputText.trim();
    
    // Check cache first
    const cacheKey = `${normalizedInput}_${requestOnlineSearch}`;
    const cached = cacheManager.get<ComprehensiveSearchResult>(cacheKey);
    if (cached) {
      console.log('Cache hit for comprehensive search:', normalizedInput);
      return cached;
    }

    console.log('Starting comprehensive search for:', normalizedInput);

    // Step 1: Break input into words and clean them
    const words = this.extractWords(normalizedInput);
    const isMultiWord = words.length > 1;

    console.log(`Processing ${words.length} word(s):`, words);

    // Step 2: Analyze each word against the dictionary
    const wordAnalyses = await this.analyzeWords(words);

    // Step 3: Calculate dictionary results summary
    const dictionaryResults = this.calculateDictionaryResults(wordAnalyses);

    // Step 4: Perform online search if requested or if dictionary coverage is low
    let onlineResults: OnlineSearchResult | null = null;
    const shouldSearchOnline = requestOnlineSearch || 
      (dictionaryResults.coverage < 70 && huggingFaceService.getStats().isConfigured);

    if (shouldSearchOnline) {
      console.log('Performing online search with Hugging Face...');
      onlineResults = await this.performOnlineSearch(normalizedInput, wordAnalyses);
    }

    // Step 5: Create combined translation
    const combinedTranslation = this.createCombinedTranslation(
      wordAnalyses, 
      onlineResults, 
      dictionaryResults
    );

    const result: ComprehensiveSearchResult = {
      inputText: normalizedInput,
      isMultiWord,
      wordAnalyses,
      dictionaryResults,
      onlineResults,
      combinedTranslation,
      requestedOnlineSearch: requestOnlineSearch
    };

    // Cache the result
    cacheManager.set(cacheKey, result, 'comprehensive_search');

    return result;
  }

  private extractWords(text: string): string[] {
    // Remove punctuation and split into words
    return text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ') // Keep apostrophes and hyphens
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.replace(/^[-']+|[-']+$/g, '')); // Remove leading/trailing punctuation
  }

  private async analyzeWords(words: string[]): Promise<WordAnalysis[]> {
    const analyses: WordAnalysis[] = [];

    for (const word of words) {
      const cleanWord = word.toLowerCase().trim();
      
      // Skip very short words that are likely articles/prepositions
      if (cleanWord.length <= 1) {
        analyses.push({
          word,
          cleanWord,
          dictionaryEntry: null,
          found: false,
          confidence: 0,
          examples: [],
          alternatives: []
        });
        continue;
      }

      // Search in dictionary
      const searchResults = searchEngine.searchFuzzy(cleanWord, 5);
      
      if (searchResults.length > 0) {
        const bestMatch = searchResults[0];
        const alternatives = searchResults.slice(1).map(r => r.entry);

        analyses.push({
          word,
          cleanWord,
          dictionaryEntry: bestMatch.entry,
          found: true,
          confidence: bestMatch.confidence * 100,
          partOfSpeech: bestMatch.entry.partOfSpeech,
          examples: bestMatch.entry.examples || [],
          alternatives
        });
      } else {
        // Word not found in dictionary
        analyses.push({
          word,
          cleanWord,
          dictionaryEntry: null,
          found: false,
          confidence: 0,
          examples: [],
          alternatives: []
        });
      }
    }

    return analyses;
  }

  private calculateDictionaryResults(wordAnalyses: WordAnalysis[]) {
    const totalWords = wordAnalyses.length;
    const foundWords = wordAnalyses.filter(w => w.found).length;
    const coverage = totalWords > 0 ? (foundWords / totalWords) * 100 : 0;
    
    const confidenceSum = wordAnalyses
      .filter(w => w.found)
      .reduce((sum, w) => sum + w.confidence, 0);
    
    const overallConfidence = foundWords > 0 ? confidenceSum / foundWords : 0;

    return {
      totalWords,
      foundWords,
      coverage: Math.round(coverage),
      overallConfidence: Math.round(overallConfidence)
    };
  }

  private async performOnlineSearch(
    inputText: string, 
    wordAnalyses: WordAnalysis[]
  ): Promise<OnlineSearchResult | null> {
    if (!huggingFaceService.getStats().isConfigured) {
      console.warn('Hugging Face service not configured');
      return null;
    }

    try {
      // Get translation from Hugging Face
      const translationResponse: BackendTranslationResponse = await huggingFaceService.translateOnline(inputText);
      
      if (!translationResponse || translationResponse.status === 'error') {
        return null;
      }

      // Extract the primary translation from the response
      const translation = this.extractPrimaryTranslation(translationResponse);
      
      if (!translation) {
        return null;
      }

      // Create a simplified online search result structure
      // Since Hugging Face provides direct translation, we'll create a basic structure
      const onlineResult: OnlineSearchResult = {
        definitions: [
          {
            source: 'Hugging Face AI Model',
            definition: `AI translation of "${inputText}"`,
            ibibio: translation,
            confidence: 0.85
          }
        ],
        relatedPhrases: [], // Hugging Face doesn't provide related phrases
        webExamples: [
          {
            english: inputText,
            ibibio: translation,
            source: 'Hugging Face AI'
          }
        ],
        additionalResources: [] // No additional resources from Hugging Face
      };

      return onlineResult;

    } catch (error) {
      console.error('Hugging Face online search error:', error);
      return null;
    }
  }

  /**
   * Extract the primary translation from BackendTranslationResponse
   */
  private extractPrimaryTranslation(response: BackendTranslationResponse): string {
    // Prioritize local dictionary, then AI response, then web search
    if (response.local_dictionary) {
      return this.extractTranslationFromText(response.local_dictionary);
    } else if (response.ai_response) {
      return this.extractTranslationFromText(response.ai_response);
    } else if (response.web_search) {
      return this.extractTranslationFromText(response.web_search);
    }
    return '';
  }

  /**
   * Extract Ibibio translation from formatted text response
   */
  private extractTranslationFromText(text: string): string {
    // Look for common patterns in the response text
    const patterns = [
      /Translation:\s*([^.\n]+)/i,
      /Ibibio:\s*([^.\n]+)/i,
      /means?\s*"([^"]+)"/i,
      /is\s+"([^"]+)"/i,
      /"([^"]+)"/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim()) {
        return match[1].trim();
      }
    }

    // Fallback: return first line if no pattern matches
    const firstLine = text.split('\n')[0];
    return firstLine.trim();
  }

  private createCombinedTranslation(
    wordAnalyses: WordAnalysis[],
    onlineResults: OnlineSearchResult | null,
    dictionaryResults: any
  ) {
    // If we have good dictionary coverage, use dictionary translation
    if (dictionaryResults.coverage >= 80) {
      const ibibioWords = wordAnalyses.map(w => 
        w.found ? w.dictionaryEntry!.ibibio : `[${w.word}]`
      );
      
      return {
        ibibio: ibibioWords.join(' '),
        confidence: dictionaryResults.overallConfidence,
        source: 'dictionary' as const
      };
    }

    // If we have online results with good definitions, use those
    if (onlineResults && onlineResults.definitions.length > 0) {
      const bestDefinition = onlineResults.definitions
        .sort((a, b) => b.confidence - a.confidence)[0];
      
      return {
        ibibio: bestDefinition.ibibio,
        confidence: Math.round(bestDefinition.confidence * 100),
        source: 'huggingface' as const
      };
    }

    // Create hybrid translation
    if (dictionaryResults.foundWords > 0) {
      const ibibioWords = wordAnalyses.map(w => {
        if (w.found) {
          return w.dictionaryEntry!.ibibio;
        }
        
        // Try to find online translation for this word
        const onlineDefinition = onlineResults?.definitions.find(d => 
          d.definition.toLowerCase().includes(w.word.toLowerCase())
        );
        
        return onlineDefinition ? onlineDefinition.ibibio : `[${w.word}]`;
      });
      
      return {
        ibibio: ibibioWords.join(' '),
        confidence: Math.round((dictionaryResults.overallConfidence + 60) / 2),
        source: 'hybrid' as const
      };
    }

    return null;
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      dictionaryStats: dictionaryService.getStats(),
      cacheStats: cacheManager.getStats(),
      huggingFaceStats: huggingFaceService.getStats()
    };
  }
}

export const comprehensiveDictionaryService = new ComprehensiveDictionaryService();
