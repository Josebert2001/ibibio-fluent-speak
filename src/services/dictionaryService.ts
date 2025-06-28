import { DictionaryEntry, SearchResult } from '../types/dictionary';

class DictionaryService {
  private dictionary: DictionaryEntry[] = [];
  private isLoaded = false;

  async loadDictionary(): Promise<void> {
    try {
      // First try to load from localStorage
      const stored = localStorage.getItem('ibibio-dictionary');
      if (stored) {
        this.dictionary = JSON.parse(stored);
        this.isLoaded = true;
        console.log(`Dictionary loaded from storage with ${this.dictionary.length} entries`);
        return;
      }

      // If no stored dictionary, try to load the default one
      try {
        const response = await fetch('/src/lib/ibibio_dictionary.json');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            this.dictionary = data;
            this.isLoaded = true;
            // Save to localStorage for future use
            localStorage.setItem('ibibio-dictionary', JSON.stringify(data));
            console.log(`Default dictionary loaded with ${data.length} entries`);
            return;
          }
        }
      } catch (fetchError) {
        console.warn('Could not load default dictionary:', fetchError);
      }

      // Create a basic fallback dictionary
      this.createFallbackDictionary();
    } catch (error) {
      console.error('Error loading dictionary:', error);
      this.createFallbackDictionary();
    }
  }

  private createFallbackDictionary(): void {
    this.dictionary = [
      {
        id: 'hello-1',
        english: 'hello',
        ibibio: 'nno',
        meaning: 'A greeting; expression of welcome',
        partOfSpeech: 'interjection',
        examples: [
          { english: 'Hello, how are you?', ibibio: 'Nno, afo ufok?' }
        ]
      },
      {
        id: 'water-1',
        english: 'water',
        ibibio: 'mmong',
        meaning: 'Clear liquid essential for life',
        partOfSpeech: 'noun',
        examples: [
          { english: 'I need water', ibibio: 'Nkpo mmong' }
        ]
      },
      {
        id: 'love-1',
        english: 'love',
        ibibio: 'uduak',
        meaning: 'Deep affection or care for someone',
        partOfSpeech: 'noun',
        examples: [
          { english: 'I love you', ibibio: 'Nkpo uduak fi' }
        ]
      },
      {
        id: 'family-1',
        english: 'family',
        ibibio: 'ufok',
        meaning: 'A group of related people',
        partOfSpeech: 'noun',
        examples: [
          { english: 'My family is big', ibibio: 'Ufok mi akpa' }
        ]
      },
      {
        id: 'house-1',
        english: 'house',
        ibibio: 'ufok',
        meaning: 'A building for human habitation',
        partOfSpeech: 'noun',
        examples: [
          { english: 'This is my house', ibibio: 'Oro ufok mi' }
        ]
      },
      {
        id: 'food-1',
        english: 'food',
        ibibio: 'ndidia',
        meaning: 'Substance consumed for nutrition',
        partOfSpeech: 'noun',
        examples: [
          { english: 'The food is good', ibibio: 'Ndidia oro afiak' }
        ]
      },
      {
        id: 'good-1',
        english: 'good',
        ibibio: 'afiak',
        meaning: 'Of high quality; positive',
        partOfSpeech: 'adjective',
        examples: [
          { english: 'This is good', ibibio: 'Oro afiak' }
        ]
      },
      {
        id: 'thank-you-1',
        english: 'thank you',
        ibibio: 'sosongo',
        meaning: 'Expression of gratitude',
        partOfSpeech: 'interjection',
        examples: [
          { english: 'Thank you very much', ibibio: 'Sosongo ntak' }
        ]
      },
      {
        id: 'good-morning-1',
        english: 'good morning',
        ibibio: 'emenere',
        meaning: 'Morning greeting',
        partOfSpeech: 'interjection',
        examples: [
          { english: 'Good morning everyone', ibibio: 'Emenere nyenyin' }
        ]
      },
      {
        id: 'big-1',
        english: 'big',
        ibibio: 'akpa',
        meaning: 'Large in size',
        partOfSpeech: 'adjective',
        examples: [
          { english: 'The house is big', ibibio: 'Ufok oro akpa' }
        ]
      },
      {
        id: 'god-1',
        english: 'god',
        ibibio: 'abasi',
        meaning: 'The supreme deity; creator and sustainer of all life',
        partOfSpeech: 'noun',
        examples: [
          { english: 'God is great', ibibio: 'Abasi akpa ntak' },
          { english: 'We pray to God', ibibio: 'Nyenyin kere Abasi' }
        ],
        pronunciation: '/a.ba.si/',
        cultural: 'Abasi is the supreme deity in Ibibio traditional religion, representing the creator and sustainer of all life. Abasi is considered omnipotent, omniscient, and benevolent.'
      }
    ];
    this.isLoaded = true;
    console.log('Fallback dictionary created with basic entries including God/Abasi');
  }

  async saveDictionary(entries: DictionaryEntry[]): Promise<void> {
    try {
      this.dictionary = entries;
      localStorage.setItem('ibibio-dictionary', JSON.stringify(entries));
      this.isLoaded = true;
      console.log(`Dictionary saved with ${entries.length} entries`);
    } catch (error) {
      console.error('Error saving dictionary:', error);
      throw error;
    }
  }

  search(query: string): DictionaryEntry | null {
    if (!this.isLoaded) return null;
    
    const normalizedQuery = (query || '').toLowerCase().trim();
    if (!normalizedQuery) return null;
    
    // First try exact match
    const exactMatch = this.dictionary.find(entry => 
      entry.english && typeof entry.english === 'string' && entry.english.toLowerCase() === normalizedQuery
    );
    
    if (exactMatch) return exactMatch;
    
    // Try partial match
    const partialMatch = this.dictionary.find(entry => 
      entry.english && typeof entry.english === 'string' && (
        entry.english.toLowerCase().includes(normalizedQuery) ||
        normalizedQuery.includes(entry.english.toLowerCase())
      )
    );
    
    return partialMatch || null;
  }

  searchExact(query: string): DictionaryEntry | null {
    if (!this.isLoaded) return null;
    
    const normalizedQuery = (query || '').toLowerCase().trim();
    if (!normalizedQuery) return null;
    
    return this.dictionary.find(entry => 
      entry.english && typeof entry.english === 'string' && entry.english.toLowerCase() === normalizedQuery
    ) || null;
  }

  searchFuzzy(query: string, limit = 5): SearchResult[] {
    if (!this.isLoaded) return [];
    
    const normalizedQuery = (query || '').toLowerCase().trim();
    if (!normalizedQuery) return [];
    
    const results: SearchResult[] = [];

    this.dictionary.forEach(entry => {
      if (!entry.english || typeof entry.english !== 'string') return;
      
      const englishLower = entry.english.toLowerCase();
      let confidence = 0;

      // Exact match
      if (englishLower === normalizedQuery) {
        confidence = 1.0;
      }
      // Starts with query
      else if (englishLower.startsWith(normalizedQuery)) {
        confidence = 0.8;
      }
      // Contains query
      else if (englishLower.includes(normalizedQuery)) {
        confidence = 0.6;
      }
      // Check if query contains the word
      else if (normalizedQuery.includes(englishLower)) {
        confidence = 0.4;
      }
      // Word boundary matches
      else {
        const queryWords = normalizedQuery.split(/\s+/);
        const entryWords = englishLower.split(/\s+/);
        
        let wordMatches = 0;
        queryWords.forEach(qWord => {
          entryWords.forEach(eWord => {
            if (qWord === eWord || qWord.includes(eWord) || eWord.includes(qWord)) {
              wordMatches++;
            }
          });
        });
        
        if (wordMatches > 0) {
          confidence = (wordMatches / Math.max(queryWords.length, entryWords.length)) * 0.5;
        }
      }

      if (confidence > 0) {
        results.push({
          entry,
          confidence,
          source: 'dictionary'
        });
      }
    });

    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  getAllEntries(): DictionaryEntry[] {
    return [...this.dictionary];
  }

  getStats() {
    return {
      totalEntries: this.dictionary.length,
      isLoaded: this.isLoaded,
      categories: [...new Set(this.dictionary.map(e => e.category).filter(Boolean))]
    };
  }
}

export const dictionaryService = new DictionaryService();