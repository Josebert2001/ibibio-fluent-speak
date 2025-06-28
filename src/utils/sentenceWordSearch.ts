/**
 * Comprehensive sentence word search utility
 * Handles word splitting, cleaning, and searching within sentences
 */

export interface WordSearchOptions {
  caseSensitive?: boolean;
  matchWholeWords?: boolean;
  includePositions?: boolean;
  removePunctuation?: boolean;
}

export interface WordSearchResult {
  found: boolean;
  positions: number[];
  matchedWords: string[];
  cleanedSentence: string;
  originalWords: string[];
  cleanedWords: string[];
}

export interface WordPosition {
  word: string;
  startIndex: number;
  endIndex: number;
  wordIndex: number;
}

/**
 * Cleans a sentence by removing punctuation and normalizing whitespace
 */
export function cleanSentence(sentence: string, options: WordSearchOptions = {}): string {
  if (!sentence || typeof sentence !== 'string') {
    return '';
  }

  let cleaned = sentence;

  // Remove punctuation if requested (default: true)
  if (options.removePunctuation !== false) {
    // Remove common punctuation but preserve apostrophes in contractions
    cleaned = cleaned.replace(/[^\w\s']/g, ' ');
    // Clean up apostrophes that aren't part of contractions
    cleaned = cleaned.replace(/(?<!\w)'|'(?!\w)/g, ' ');
  }

  // Normalize whitespace (multiple spaces, tabs, newlines to single space)
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Handle case sensitivity
  if (!options.caseSensitive) {
    cleaned = cleaned.toLowerCase();
  }

  return cleaned;
}

/**
 * Splits a sentence into individual words
 */
export function splitSentenceIntoWords(sentence: string, options: WordSearchOptions = {}): string[] {
  if (!sentence || typeof sentence !== 'string') {
    return [];
  }

  const cleaned = cleanSentence(sentence, options);
  
  if (!cleaned) {
    return [];
  }

  // Split by whitespace and filter out empty strings
  return cleaned.split(/\s+/).filter(word => word.length > 0);
}

/**
 * Searches for a specific word or phrase within a sentence
 */
export function searchWordInSentence(
  sentence: string, 
  searchTerm: string, 
  options: WordSearchOptions = {}
): WordSearchResult {
  // Input validation
  if (!sentence || typeof sentence !== 'string') {
    return {
      found: false,
      positions: [],
      matchedWords: [],
      cleanedSentence: '',
      originalWords: [],
      cleanedWords: []
    };
  }

  if (!searchTerm || typeof searchTerm !== 'string') {
    return {
      found: false,
      positions: [],
      matchedWords: [],
      cleanedSentence: cleanSentence(sentence, options),
      originalWords: sentence.split(/\s+/).filter(w => w.length > 0),
      cleanedWords: splitSentenceIntoWords(sentence, options)
    };
  }

  const originalWords = sentence.split(/\s+/).filter(w => w.length > 0);
  const cleanedSentence = cleanSentence(sentence, options);
  const cleanedWords = splitSentenceIntoWords(sentence, options);
  const cleanedSearchTerm = cleanSentence(searchTerm, options);

  const result: WordSearchResult = {
    found: false,
    positions: [],
    matchedWords: [],
    cleanedSentence,
    originalWords,
    cleanedWords
  };

  if (!cleanedSearchTerm) {
    return result;
  }

  // Handle phrase search (multiple words)
  const searchWords = cleanedSearchTerm.split(/\s+/).filter(w => w.length > 0);
  
  if (searchWords.length === 1) {
    // Single word search
    const searchWord = searchWords[0];
    
    cleanedWords.forEach((word, index) => {
      let isMatch = false;
      
      if (options.matchWholeWords) {
        // Exact word match
        isMatch = word === searchWord;
      } else {
        // Partial match (word contains search term)
        isMatch = word.includes(searchWord);
      }
      
      if (isMatch) {
        result.found = true;
        result.positions.push(index);
        result.matchedWords.push(word);
      }
    });
  } else {
    // Phrase search (multiple words)
    for (let i = 0; i <= cleanedWords.length - searchWords.length; i++) {
      let phraseMatch = true;
      
      for (let j = 0; j < searchWords.length; j++) {
        const wordToCheck = cleanedWords[i + j];
        const searchWord = searchWords[j];
        
        let wordMatch = false;
        if (options.matchWholeWords) {
          wordMatch = wordToCheck === searchWord;
        } else {
          wordMatch = wordToCheck.includes(searchWord);
        }
        
        if (!wordMatch) {
          phraseMatch = false;
          break;
        }
      }
      
      if (phraseMatch) {
        result.found = true;
        for (let j = 0; j < searchWords.length; j++) {
          const position = i + j;
          if (!result.positions.includes(position)) {
            result.positions.push(position);
            result.matchedWords.push(cleanedWords[position]);
          }
        }
      }
    }
  }

  return result;
}

/**
 * Gets detailed word positions with character indices
 */
export function getWordPositions(sentence: string, options: WordSearchOptions = {}): WordPosition[] {
  if (!sentence || typeof sentence !== 'string') {
    return [];
  }

  const positions: WordPosition[] = [];
  const cleanedSentence = cleanSentence(sentence, options);
  const words = splitSentenceIntoWords(sentence, options);
  
  let currentIndex = 0;
  let wordIndex = 0;
  
  for (const word of words) {
    // Find the word in the cleaned sentence starting from current position
    const wordStart = cleanedSentence.indexOf(word, currentIndex);
    
    if (wordStart !== -1) {
      positions.push({
        word,
        startIndex: wordStart,
        endIndex: wordStart + word.length - 1,
        wordIndex
      });
      
      currentIndex = wordStart + word.length;
      wordIndex++;
    }
  }
  
  return positions;
}

/**
 * Searches for multiple words/phrases in a sentence
 */
export function searchMultipleWords(
  sentence: string, 
  searchTerms: string[], 
  options: WordSearchOptions = {}
): Record<string, WordSearchResult> {
  const results: Record<string, WordSearchResult> = {};
  
  for (const term of searchTerms) {
    results[term] = searchWordInSentence(sentence, term, options);
  }
  
  return results;
}

/**
 * Utility function to check if any words from a list exist in a sentence
 */
export function containsAnyWord(
  sentence: string, 
  words: string[], 
  options: WordSearchOptions = {}
): boolean {
  for (const word of words) {
    const result = searchWordInSentence(sentence, word, options);
    if (result.found) {
      return true;
    }
  }
  return false;
}

/**
 * Utility function to check if all words from a list exist in a sentence
 */
export function containsAllWords(
  sentence: string, 
  words: string[], 
  options: WordSearchOptions = {}
): boolean {
  for (const word of words) {
    const result = searchWordInSentence(sentence, word, options);
    if (!result.found) {
      return false;
    }
  }
  return true;
}

/**
 * Highlights found words in a sentence with HTML markup
 */
export function highlightWordsInSentence(
  sentence: string, 
  searchTerm: string, 
  options: WordSearchOptions = {},
  highlightClass: string = 'highlight'
): string {
  const result = searchWordInSentence(sentence, searchTerm, options);
  
  if (!result.found) {
    return sentence;
  }

  const words = sentence.split(/(\s+)/); // Keep whitespace
  let highlightedSentence = '';
  let wordIndex = 0;
  
  for (const part of words) {
    if (/\s/.test(part)) {
      // This is whitespace, add as-is
      highlightedSentence += part;
    } else {
      // This is a word
      const cleanedPart = cleanSentence(part, options);
      const shouldHighlight = result.positions.includes(wordIndex);
      
      if (shouldHighlight) {
        highlightedSentence += `<span class="${highlightClass}">${part}</span>`;
      } else {
        highlightedSentence += part;
      }
      
      wordIndex++;
    }
  }
  
  return highlightedSentence;
}