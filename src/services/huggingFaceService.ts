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
 * Response interface from Hugging Face Space API
 */
interface HuggingFaceResponse {
  data: string[];
  duration?: number;
  average_duration?: number;
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
 * Service class for integrating with Hugging Face Spaces API
 * Provides English to Ibibio translation capabilities
 */
class HuggingFaceService {
  private config: HuggingFaceConfig;

  constructor() {
    this.config = {
      // Default configuration - can be overridden via environment variables
      spaceUrl: import.meta.env.VITE_HUGGINGFACE_SPACE_URL || 'https://your-space-url.hf.space',
      timeout: 10000, // 10 seconds timeout
      retryAttempts: 2
    };
  }

  /**
   * Update the Hugging Face Space URL configuration
   * @param spaceUrl - The complete URL to your Hugging Face Space
   */
  setSpaceUrl(spaceUrl: string): void {
    this.config.spaceUrl = spaceUrl;
  }

  /**
   * Get current configuration
   * @returns Current HuggingFace configuration
   */
  getConfig(): HuggingFaceConfig {
    return { ...this.config };
  }

  /**
   * Core translation function that interfaces with Hugging Face Spaces API
   * @param query - The English text to translate to Ibibio
   * @returns Promise<string> - The translated Ibibio text
   * @throws Error if translation fails or API is unreachable
   */
  async translateOnline(query: string): Promise<string> {
    // Input validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Invalid input: Query must be a non-empty string');
    }

    // Validate configuration
    if (!this.config.spaceUrl || this.config.spaceUrl === 'https://your-space-url.hf.space') {
      throw new Error('Hugging Face Space URL not configured. Please set VITE_HUGGINGFACE_SPACE_URL environment variable.');
    }

    const trimmedQuery = query.trim();
    let lastError: Error | null = null;

    // Retry mechanism for better reliability
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`HuggingFace translation attempt ${attempt}/${this.config.retryAttempts} for: "${trimmedQuery}"`);

        // Create abort controller for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
          // Make API request to Hugging Face Space
          const response = await fetch(`${this.config.spaceUrl}/api/predict`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              data: [trimmedQuery],
              fn_index: 0
            }),
            signal: controller.signal
          });

          // Clear timeout since request completed
          clearTimeout(timeoutId);

          // Check if response is ok
          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            
            try {
              const errorData: HuggingFaceError = JSON.parse(errorText);
              errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
              // If error response is not JSON, use the text as error message
              errorMessage = errorText || errorMessage;
            }

            throw new Error(`Hugging Face API error: ${errorMessage}`);
          }

          // Parse response
          const result: HuggingFaceResponse = await response.json();

          // Validate response structure
          if (!result || !Array.isArray(result.data) || result.data.length === 0) {
            throw new Error('Invalid response format from Hugging Face API');
          }

          const translation = result.data[0];

          // Validate translation result
          if (!translation || typeof translation !== 'string' || translation.trim().length === 0) {
            throw new Error('Empty or invalid translation received from Hugging Face API');
          }

          console.log(`HuggingFace translation successful: "${trimmedQuery}" -> "${translation}"`);
          return translation.trim();

        } catch (error) {
          clearTimeout(timeoutId);
          
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Translation request timed out after ${this.config.timeout}ms`);
          }
          
          throw error;
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error occurred');
        console.warn(`HuggingFace translation attempt ${attempt} failed:`, lastError.message);

        // If this is the last attempt, don't wait
        if (attempt < this.config.retryAttempts) {
          // Exponential backoff: wait 1s, then 2s
          const waitTime = attempt * 1000;
          console.log(`Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // All attempts failed
    throw new Error(`Translation failed after ${this.config.retryAttempts} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Get a complete DictionaryEntry object from Hugging Face translation
   * @param query - The English text to translate
   * @returns Promise<DictionaryEntry | null> - Complete dictionary entry or null if translation fails
   */
  async getDictionaryEntry(query: string): Promise<DictionaryEntry | null> {
    try {
      const translation = await this.translateOnline(query);
      
      if (!translation) {
        return null;
      }

      // Create a complete DictionaryEntry with the translation
      const entry: DictionaryEntry = {
        id: `hf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        english: query.trim(),
        ibibio: translation,
        meaning: `AI-powered translation of "${query.trim()}"`,
        partOfSpeech: this.inferPartOfSpeech(query),
        examples: [],
        cultural: 'Translation provided by Hugging Face AI model',
        category: 'ai-translation'
      };

      return entry;

    } catch (error) {
      console.error('Failed to get dictionary entry from Hugging Face:', error);
      return null;
    }
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

    // Process words in smaller batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      
      // Process each word in the batch
      const batchPromises = batch.map(async (word) => {
        try {
          const translation = await this.translateOnline(word);
          return {
            english: word,
            ibibio: translation,
            confidence: 85, // Default confidence for HuggingFace translations
            found: true
          };
        } catch (error) {
          console.warn(`Failed to translate word "${word}":`, error);
          return {
            english: word,
            ibibio: `[${word}]`, // Mark as untranslated
            confidence: 0,
            found: false
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Extract successful results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });

      // Add small delay between batches to be respectful to the API
      if (i + batchSize < words.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Simple part of speech inference based on common patterns
   * @param text - The English text to analyze
   * @returns string - Inferred part of speech
   */
  private inferPartOfSpeech(text: string): string {
    const trimmed = text.trim().toLowerCase();
    
    // Multi-word phrases are likely sentences or phrases
    if (trimmed.includes(' ')) {
      return 'phrase';
    }

    // Common verb patterns
    if (trimmed.endsWith('ing') || trimmed.endsWith('ed') || 
        ['is', 'am', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had'].includes(trimmed)) {
      return 'verb';
    }

    // Common adjective patterns
    if (trimmed.endsWith('ly') || trimmed.endsWith('ful') || trimmed.endsWith('less') ||
        ['good', 'bad', 'big', 'small', 'hot', 'cold', 'new', 'old'].includes(trimmed)) {
      return 'adjective';
    }

    // Common prepositions and articles
    if (['the', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'to', 'from'].includes(trimmed)) {
      return 'preposition';
    }

    // Default to noun for most other cases
    return 'noun';
  }

  /**
   * Test the connection to Hugging Face Space
   * @returns Promise<boolean> - True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.translateOnline('hello');
      return true;
    } catch (error) {
      console.error('Hugging Face connection test failed:', error);
      return false;
    }
  }

  /**
   * Get service statistics and status
   * @returns Object with service information
   */
  getStats() {
    return {
      serviceName: 'Hugging Face Spaces',
      spaceUrl: this.config.spaceUrl,
      timeout: this.config.timeout,
      retryAttempts: this.config.retryAttempts,
      isConfigured: this.config.spaceUrl !== 'https://your-space-url.hf.space'
    };
  }
}

// Export singleton instance
export const huggingFaceService = new HuggingFaceService();

/**
 * Example usage:
 * 
 * // Basic translation
 * const translation = await huggingFaceService.translateOnline('hello');
 * console.log(translation); // Output: "nno" (or whatever the model returns)
 * 
 * // Get complete dictionary entry
 * const entry = await huggingFaceService.getDictionaryEntry('water');
 * console.log(entry.ibibio); // Output: "mmong" (or whatever the model returns)
 * 
 * // Batch translation
 * const results = await huggingFaceService.translateWordBatch(['hello', 'water', 'love']);
 * results.forEach(result => {
 *   console.log(`${result.english} -> ${result.ibibio} (${result.confidence}%)`);
 * });
 * 
 * // Test connection
 * const isConnected = await huggingFaceService.testConnection();
 * console.log('Service available:', isConnected);
 * 
 * // Configure custom space URL
 * huggingFaceService.setSpaceUrl('https://your-actual-space.hf.space');
 */