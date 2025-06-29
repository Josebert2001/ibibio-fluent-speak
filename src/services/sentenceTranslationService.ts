import { dictionaryService } from './dictionaryService';
import { searchEngine } from './searchEngine';
import { huggingFaceService } from './huggingFaceService';
import { DictionaryEntry } from '../types/dictionary';

interface WordTranslation {
  english: string;
  ibibio: string;
  found: boolean;
  confidence: number;
  source: 'dictionary' | 'huggingface' | 'unknown';
}

interface SentenceTranslationResult {
  localResult: DictionaryEntry | null;
  onlineResult: DictionaryEntry | null;
  wordBreakdown: WordTranslation[];
  localConfidence: number;
  onlineConfidence: number;
  hasLocalTranslation: boolean;
  hasOnlineTranslation: boolean;
}

class SentenceTranslationService {
  async translateSentence(sentence: string): Promise<SentenceTranslationResult> {
    console.log('Processing sentence:', sentence);
    
    // Step 1: Break sentence into words
    const words = this.breakIntoWords(sentence);
    console.log('Words extracted:', words);
    
    // Step 2: Check dictionary for each word
    const localWordTranslations = await this.translateWordsLocally(words);
    
    // Step 3: Build local sentence translation
    const localResult = this.buildLocalSentenceTranslation(sentence, localWordTranslations);
    
    // Step 4: Get online translation if Hugging Face is configured
    let onlineResult: DictionaryEntry | null = null;
    let onlineWordTranslations: WordTranslation[] = [];
    
    if (huggingFaceService.getStats().isConfigured) {
      try {
        onlineResult = await this.getOnlineSentenceTranslation(sentence);
        
        // If we have online result, also get word-by-word online translations for comparison
        if (onlineResult) {
          onlineWordTranslations = await this.translateWordsOnline(words);
        }
      } catch (error) {
        console.error('Online translation failed:', error);
      }
    }
    
    // Step 5: Combine word translations (prioritize local, fill gaps with online)
    const combinedWordTranslations = this.combineWordTranslations(
      localWordTranslations, 
      onlineWordTranslations
    );
    
    // Step 6: Calculate confidence scores
    const localConfidence = this.calculateLocalConfidence(localWordTranslations);
    const onlineConfidence = onlineResult ? 85 : 0;
    
    return {
      localResult,
      onlineResult,
      wordBreakdown: combinedWordTranslations,
      localConfidence,
      onlineConfidence,
      hasLocalTranslation: !!localResult,
      hasOnlineTranslation: !!onlineResult
    };
  }
  
  private breakIntoWords(sentence: string): string[] {
    // Clean and split sentence into words
    return sentence
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 0);
  }
  
  private async translateWordsLocally(words: string[]): Promise<WordTranslation[]> {
    const translations: WordTranslation[] = [];
    
    for (const word of words) {
      // Skip very short words that are likely articles/prepositions
      if (word.length <= 2 && !this.isImportantShortWord(word)) {
        translations.push({
          english: word,
          ibibio: word, // Keep as-is
          found: false,
          confidence: 50,
          source: 'unknown'
        });
        continue;
      }
      
      // Try exact match first
      const exactMatch = searchEngine.searchExact(word);
      if (exactMatch.length > 0) {
        translations.push({
          english: word,
          ibibio: exactMatch[0].ibibio,
          found: true,
          confidence: 100,
          source: 'dictionary'
        });
        continue;
      }
      
      // Try fuzzy search
      const fuzzyResults = searchEngine.searchFuzzy(word, 1);
      if (fuzzyResults.length > 0 && fuzzyResults[0].confidence > 0.7) {
        translations.push({
          english: word,
          ibibio: fuzzyResults[0].entry.ibibio,
          found: true,
          confidence: fuzzyResults[0].confidence * 100,
          source: 'dictionary'
        });
        continue;
      }
      
      // Word not found in dictionary
      translations.push({
        english: word,
        ibibio: `[${word}]`, // Mark as untranslated
        found: false,
        confidence: 0,
        source: 'unknown'
      });
    }
    
    return translations;
  }
  
  private async translateWordsOnline(words: string[]): Promise<WordTranslation[]> {
    try {
      // Use Hugging Face service for batch translation
      const batchResults = await huggingFaceService.translateWordBatch(words);
      
      return batchResults.map(result => ({
        english: result.english,
        ibibio: result.ibibio,
        found: result.found,
        confidence: result.confidence,
        source: 'huggingface' as const
      }));
      
    } catch (error) {
      console.error('Online word translation failed:', error);
      // Return empty translations if online fails
      return words.map(word => ({
        english: word,
        ibibio: `[${word}]`,
        found: false,
        confidence: 0,
        source: 'unknown' as const
      }));
    }
  }
  
  private async getOnlineSentenceTranslation(sentence: string): Promise<DictionaryEntry | null> {
    try {
      const translation = await huggingFaceService.translateOnline(sentence);
      
      if (!translation) {
        return null;
      }

      return {
        id: `hf-sentence-${Date.now()}`,
        english: sentence,
        ibibio: translation,
        meaning: `Hugging Face AI translation of: ${sentence}`,
        partOfSpeech: 'sentence',
        examples: [],
        cultural: 'Complete sentence translation from Hugging Face AI service'
      };

    } catch (error) {
      console.error('Hugging Face sentence translation error:', error);
      return null;
    }
  }
  
  private buildLocalSentenceTranslation(
    originalSentence: string, 
    wordTranslations: WordTranslation[]
  ): DictionaryEntry | null {
    const foundWords = wordTranslations.filter(w => w.found);
    const totalWords = wordTranslations.length;
    
    // Only build local translation if we found at least 60% of words
    if (foundWords.length / totalWords < 0.6) {
      return null;
    }
    
    const ibibioSentence = wordTranslations.map(w => w.ibibio).join(' ');
    const coverage = Math.round((foundWords.length / totalWords) * 100);
    
    return {
      id: `local-sentence-${Date.now()}`,
      english: originalSentence,
      ibibio: ibibioSentence,
      meaning: `Word-by-word translation from local dictionary`,
      partOfSpeech: 'sentence',
      examples: [],
      cultural: `Translated using local dictionary with ${coverage}% word coverage (${foundWords.length}/${totalWords} words found)`
    };
  }
  
  private combineWordTranslations(
    localTranslations: WordTranslation[], 
    onlineTranslations: WordTranslation[]
  ): WordTranslation[] {
    const combined: WordTranslation[] = [];
    
    for (let i = 0; i < localTranslations.length; i++) {
      const local = localTranslations[i];
      const online = onlineTranslations[i];
      
      // Prioritize local dictionary results
      if (local.found) {
        combined.push(local);
      } else if (online && online.found) {
        // Use online translation if local not found
        combined.push({
          ...online,
          source: 'huggingface'
        });
      } else {
        // Keep the local result (even if not found)
        combined.push(local);
      }
    }
    
    return combined;
  }
  
  private calculateLocalConfidence(wordTranslations: WordTranslation[]): number {
    const foundWords = wordTranslations.filter(w => w.found);
    const totalWords = wordTranslations.length;
    
    if (totalWords === 0) return 0;
    
    const coverage = foundWords.length / totalWords;
    const avgConfidence = foundWords.length > 0 
      ? foundWords.reduce((sum, w) => sum + w.confidence, 0) / foundWords.length 
      : 0;
    
    // Combine coverage and average confidence
    return Math.round(coverage * avgConfidence);
  }
  
  private isImportantShortWord(word: string): boolean {
    const importantShortWords = ['is', 'am', 'be', 'to', 'of', 'in', 'on', 'at', 'it', 'he', 'we', 'my', 'me'];
    return importantShortWords.includes(word);
  }
}

export const sentenceTranslationService = new SentenceTranslationService();