import { dictionaryService } from './dictionaryService';
import { searchEngine } from './searchEngine';
import { groqService } from './groqService';
import { DictionaryEntry } from '../types/dictionary';

interface WordTranslation {
  english: string;
  ibibio: string;
  found: boolean;
  confidence: number;
  source: 'dictionary' | 'online' | 'unknown';
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
    
    // Step 4: Get online translation if API key is available
    let onlineResult: DictionaryEntry | null = null;
    let onlineWordTranslations: WordTranslation[] = [];
    
    const apiKey = groqService.getApiKey();
    if (apiKey) {
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
    const translations: WordTranslation[] = [];
    
    try {
      // Translate words in batches to avoid too many API calls
      const batchSize = 5;
      for (let i = 0; i < words.length; i += batchSize) {
        const batch = words.slice(i, i + batchSize);
        const batchTranslations = await this.translateWordBatchOnline(batch);
        translations.push(...batchTranslations);
      }
    } catch (error) {
      console.error('Online word translation failed:', error);
      // Return empty translations if online fails
      return words.map(word => ({
        english: word,
        ibibio: `[${word}]`,
        found: false,
        confidence: 0,
        source: 'unknown'
      }));
    }
    
    return translations;
  }
  
  private async translateWordBatchOnline(words: string[]): Promise<WordTranslation[]> {
    const prompt = `Translate these English words to Ibibio individually. Return ONLY a JSON array:

Words: ${words.join(', ')}

Format:
[
  {"english": "word1", "ibibio": "translation1", "confidence": 0.9},
  {"english": "word2", "ibibio": "translation2", "confidence": 0.8}
]

If you cannot translate a word reliably, use confidence: 0 and ibibio: ""`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqService.getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are a precise English to Ibibio translator. Return only valid JSON arrays.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in response');
      }

      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const results = JSON.parse(jsonMatch[0]);
      
      return results.map((result: any) => ({
        english: result.english,
        ibibio: result.ibibio || `[${result.english}]`,
        found: !!result.ibibio && result.confidence > 0,
        confidence: (result.confidence || 0) * 100,
        source: 'online' as const
      }));

    } catch (error) {
      console.error('Batch translation error:', error);
      // Return fallback translations
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
    const prompt = `Translate this complete English sentence to Ibibio:

"${sentence}"

Provide a natural, fluent Ibibio translation that maintains the meaning and context.

Return ONLY a JSON response:
{
  "ibibio": "complete Ibibio sentence translation",
  "meaning": "explanation of the sentence meaning",
  "confidence": 0.9
}

If you cannot provide a reliable translation, return confidence: 0`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqService.getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are an expert English to Ibibio translator who provides natural, fluent sentence translations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 400,
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
      
      if (!result.ibibio || result.confidence === 0) {
        return null;
      }

      return {
        id: `online-sentence-${Date.now()}`,
        english: sentence,
        ibibio: result.ibibio,
        meaning: result.meaning || `Online translation of: ${sentence}`,
        partOfSpeech: 'sentence',
        examples: [],
        cultural: 'Complete sentence translation from online AI service'
      };

    } catch (error) {
      console.error('Online sentence translation error:', error);
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
          source: 'online'
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