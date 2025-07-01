
import { DictionaryEntry } from '../types/dictionary';

/**
 * Configuration interface for Hugging Face Space API
 */
interface HuggingFaceConfig {
  spaceUrl: string;
  timeout: number;
  retryAttempts: number;
}

/**
 * Response interface from the new Hugging Face backend
 */
interface BackendTranslationResponse {
  query: string;
  ai_response: string;
  local_dictionary: string | null;
  web_search: string | null;
  status: string;
  error?: string;
}

/**
 * Error interface for Hugging Face API errors
 */
interface HuggingFaceError {
  error: string;
  message?: string;
  status?: number;
}

/**
 * Word translation result for batch operations
 */
interface WordTranslationResult {
  english: string;
  ibibio: string;
  confidence: number;
  found: boolean;
}

/**
 * Service class for integrating with the enhanced Hugging Face backend
 * Provides multi-source English to Ibibio translation capabilities
 */
class HuggingFaceService {
  private config: HuggingFaceConfig;

  constructor() {
    this.config = {
      spaceUrl: import.meta.env.VITE_HUGGINGFACE_SPACE_URL || 'https://your-space-url.hf.space',
      timeout: 15000, // Increased timeout for backend processing
      retryAttempts: 2
    };
  }

  /**
   * Update the Hugging Face Space URL configuration
   */
  setSpaceUrl(spaceUrl: string): void {
    this.config.spaceUrl = spaceUrl;
  }

  /**
   * Get current configuration
   */
  getConfig(): HuggingFaceConfig {
    return { ...this.config };
  }

  /**
   * Enhanced translation function that interfaces with the new multi-source backend
   */
  async translateOnline(query: string): Promise<BackendTranslationResponse> {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Invalid input: Query must be a non-empty string');
    }

    if (!this.config.spaceUrl || this.config.spaceUrl === 'https://your-space-url.hf.space') {
      throw new Error('Hugging Face Space URL not configured. Please set VITE_HUGGINGFACE_SPACE_URL environment variable.');
    }

    const trimmedQuery = query.trim();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`Enhanced backend translation attempt ${attempt}/${this.config.retryAttempts} for: "${trimmedQuery}"`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
          const response = await fetch(`${this.config.spaceUrl}/api/predict`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              data: [trimmedQuery],
              fn_index: 0 // Corresponds to translate_interface function
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            
            try {
              const errorData: HuggingFaceError = JSON.parse(errorText);
              errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }

            throw new Error(`Enhanced backend API error: ${errorMessage}`);
          }

          const result: { data: [BackendTranslationResponse] } = await response.json();

          if (!result || !Array.isArray(result.data) || result.data.length === 0) {
            throw new Error('Invalid response format from enhanced backend');
          }

          const translationResponse = result.data[0];

          if (!translationResponse || typeof translationResponse !== 'object') {
            throw new Error('Invalid translation response structure');
          }

          console.log(`Enhanced backend translation successful for: "${trimmedQuery}"`);
          console.log('Response structure:', {
            hasAiResponse: !!translationResponse.ai_response,
            hasLocalDictionary: !!translationResponse.local_dictionary,
            hasWebSearch: !!translationResponse.web_search,
            status: translationResponse.status
          });

          return translationResponse;

        } catch (error) {
          clearTimeout(timeoutId);
          
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Translation request timed out after ${this.config.timeout}ms`);
          }
          
          throw error;
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error occurred');
        console.warn(`Enhanced backend translation attempt ${attempt} failed:`, lastError.message);

        if (attempt < this.config.retryAttempts) {
          const waitTime = attempt * 1000;
          console.log(`Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw new Error(`Enhanced backend translation failed after ${this.config.retryAttempts} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Format the enhanced backend response for display
   */
  formatTranslationResult(result: BackendTranslationResponse): string {
    let formattedOutput = '';
    
    if (result.ai_response) {
      formattedOutput += `🤖 **AI Translation:**\n${result.ai_response}\n\n`;
    }
    
    if (result.local_dictionary) {
      formattedOutput += `📚 **Local Dictionary:**\n${result.local_dictionary}\n\n`;
    }
    
    if (result.web_search) {
      formattedOutput += `🔍 **Web Research:**\n${result.web_search}\n\n`;
    }
    
    if (!formattedOutput && result.status === 'error') {
      formattedOutput = `❌ Error: ${result.error || 'Unknown error'}`;
    }
    
    return formattedOutput.trim();
  }

  /**
   * Get a complete DictionaryEntry object from enhanced backend translation
   */
  async getDictionaryEntry(query: string): Promise<DictionaryEntry | null> {
    try {
      const response = await this.translateOnline(query);
      
      if (response.status === 'error' || (!response.ai_response && !response.local_dictionary && !response.web_search)) {
        return null;
      }

      // Extract the primary translation from the response
      const primaryTranslation = this.extractPrimaryTranslation(response);
      
      if (!primaryTranslation) {
        return null;
      }

      const entry: DictionaryEntry = {
        id: `enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        english: query.trim(),
        ibibio: primaryTranslation,
        meaning: `Multi-source translation from enhanced backend`,
        partOfSpeech: this.inferPartOfSpeech(query),
        examples: [],
        cultural: this.formatTranslationResult(response),
        category: 'enhanced-translation'
      };

      return entry;

    } catch (error) {
      console.error('Failed to get enhanced dictionary entry:', error);
      return null;
    }
  }

  /**
   * Extract the primary translation from BackendTranslationResponse
   */
  extractPrimaryTranslation(response: BackendTranslationResponse): string {
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
  extractTranslationFromText(text: string): string {
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

  /**
   * Simple part of speech inference based on common patterns
   * @param text - The English text to analyze
   * @returns string - Inferred part of speech
   */
  private inferPartOfSpeech(text: string): string {
    const trimmed = text.trim().toLowerCase();
    
    if (trimmed.includes(' ')) {
      return 'phrase';
    }

    if (trimmed.endsWith('ing') || trimmed.endsWith('ed') || 
        ['is', 'am', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had'].includes(trimmed)) {
      return 'verb';
    }

    if (trimmed.endsWith('ly') || trimmed.endsWith('ful') || trimmed.endsWith('less') ||
        ['good', 'bad', 'big', 'small', 'hot', 'cold', 'new', 'old'].includes(trimmed)) {
      return 'adjective';
    }

    if (['the', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'of', 'with', 'to', 'from'].includes(trimmed)) {
      return 'preposition';
    }

    return 'noun';
  }

  /**
   * Translate multiple words in a batch operation
   * @param words - Array of English words to translate
   * @returns Promise<WordTranslationResult[]> - Array of translation results
   */
  async translateWordBatch(words: string[]): Promise<WordTranslationResult[]> {
    if (!Array.isArray(words) || words.length === 0) {
      return [];
    }

    const results: WordTranslationResult[] = [];
    const batchSize = 2; // Reduced for enhanced backend processing

    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (word) => {
        try {
          const response = await this.translateOnline(word);
          const translation = this.extractTranslationFromText(
            response.local_dictionary || response.ai_response || response.web_search || ''
          );
          
          return {
            english: word,
            ibibio: translation || `[${word}]`,
            confidence: translation ? 90 : 0, // Enhanced backend confidence
            found: !!translation
          };
        } catch (error) {
          console.warn(`Failed to translate word "${word}":`, error);
          return {
            english: word,
            ibibio: `[${word}]`,
            confidence: 0,
            found: false
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });

      if (i + batchSize < words.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Longer delay for backend processing
      }
    }

    return results;
  }

  /**
   * Test the connection to the enhanced Hugging Face backend
   * @returns Promise<boolean> - True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.translateOnline('hello');
      return response.status !== 'error';
    } catch (error) {
      console.error('Enhanced backend connection test failed:', error);
      return false;
    }
  }

  /**
   * Get service statistics and status
   * @returns Object with service information
   */
  getStats() {
    return {
      serviceName: 'Enhanced Hugging Face Backend',
      spaceUrl: this.config.spaceUrl,
      timeout: this.config.timeout,
      retryAttempts: this.config.retryAttempts,
      isConfigured: this.config.spaceUrl !== 'https://your-space-url.hf.space',
      features: ['AI Translation', 'Local Dictionary', 'Web Search', 'Multi-source Validation']
    };
  }
}

export const huggingFaceService = new HuggingFaceService();
export type { BackendTranslationResponse };
