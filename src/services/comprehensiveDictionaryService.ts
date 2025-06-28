import { dictionaryService } from './dictionaryService';
import { searchEngine } from './searchEngine';
import { groqService } from './groqService';
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
    source: 'dictionary' | 'online' | 'hybrid';
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
      (dictionaryResults.coverage < 70 && groqService.getApiKey());

    if (shouldSearchOnline) {
      console.log('Performing online search...');
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
    const apiKey = groqService.getApiKey();
    if (!apiKey) {
      console.warn('No API key available for online search');
      return null;
    }

    try {
      // Find words that weren't found in dictionary
      const missingWords = wordAnalyses
        .filter(w => !w.found)
        .map(w => w.word);

      const prompt = `Perform a comprehensive search for English to Ibibio translation:

Input: "${inputText}"
Missing from dictionary: ${missingWords.join(', ')}

Provide a detailed JSON response with:

{
  "definitions": [
    {
      "source": "source_name",
      "definition": "English definition",
      "ibibio": "Ibibio translation",
      "confidence": 0.9
    }
  ],
  "relatedPhrases": [
    {
      "phrase": "related English phrase",
      "translation": "Ibibio translation",
      "context": "usage context"
    }
  ],
  "webExamples": [
    {
      "english": "example sentence",
      "ibibio": "Ibibio translation",
      "source": "source"
    }
  ],
  "additionalResources": [
    {
      "title": "Resource title",
      "url": "https://example.com",
      "description": "Resource description"
    }
  ]
}

Focus on accuracy and provide multiple sources when possible.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are a comprehensive language research assistant specializing in English to Ibibio translation. Provide detailed, accurate information from multiple sources.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 1000,
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
      
      return {
        definitions: result.definitions || [],
        relatedPhrases: result.relatedPhrases || [],
        webExamples: result.webExamples || [],
        additionalResources: result.additionalResources || []
      };

    } catch (error) {
      console.error('Online search error:', error);
      return null;
    }
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
        source: 'online' as const
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
      hasApiKey: !!groqService.getApiKey()
    };
  }
}

export const comprehensiveDictionaryService = new ComprehensiveDictionaryService();