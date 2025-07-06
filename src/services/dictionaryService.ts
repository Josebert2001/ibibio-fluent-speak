import { DictionaryEntry, SearchResult } from '../types/dictionary';

class DictionaryService {
  private dictionary: DictionaryEntry[] = [];
  private isLoaded = false;
  private loadingStats = {
    totalRawEntries: 0,
    validEntries: 0,
    skippedEntries: 0,
    transformationErrors: 0
  };

  async loadDictionary(): Promise<void> {
    try {
      console.log('🔄 Starting dictionary loading process...');
      
      // First try to load from localStorage
      const stored = localStorage.getItem('ibibio-dictionary');
      if (stored) {
        const data = JSON.parse(stored);
        this.dictionary = this.transformDictionaryData(data, 'localStorage');
        this.isLoaded = true;
        console.log(`✅ Dictionary loaded from storage with ${this.dictionary.length} entries`);
        this.logLoadingStats();
        return;
      }

      // If no stored dictionary, try to load the default one
      try {
        console.log('📥 Fetching default dictionary from /ibibio_dictionary.json...');
        const response = await fetch('/ibibio_dictionary.json');
        if (response.ok) {
          const rawData = await response.json();
          console.log('📊 Raw dictionary data received:', {
            isArray: Array.isArray(rawData),
            length: rawData?.length || 0,
            sampleEntry: rawData?.[0] || null
          });
          
          if (Array.isArray(rawData) && rawData.length > 0) {
            this.dictionary = this.transformDictionaryData(rawData, 'ibibio_dictionary.json');
            this.isLoaded = true;
            
            // Save transformed data to localStorage for future use
            localStorage.setItem('ibibio-dictionary', JSON.stringify(this.dictionary));
            console.log(`✅ Dictionary loaded from ibibio_dictionary.json with ${this.dictionary.length} entries`);
            this.logLoadingStats();
            return;
          }
        }
      } catch (fetchError) {
        console.warn('⚠️ Could not load ibibio_dictionary.json:', fetchError);
      }

      // Create a basic fallback dictionary
      console.log('🔧 Creating enhanced fallback dictionary...');
      this.createEnhancedFallbackDictionary();
    } catch (error) {
      console.error('❌ Error loading dictionary:', error);
      this.createEnhancedFallbackDictionary();
    }
  }

  private transformDictionaryData(rawData: any[], source: string): DictionaryEntry[] {
    console.log(`🔄 Transforming dictionary data from ${source}...`);
    
    if (!Array.isArray(rawData)) {
      console.warn('⚠️ Dictionary data is not an array, using fallback');
      this.loadingStats.transformationErrors++;
      return [];
    }

    this.loadingStats.totalRawEntries = rawData.length;
    const transformedEntries: DictionaryEntry[] = [];

    rawData.forEach((item, index) => {
      try {
        // Enhanced field extraction with multiple fallbacks
        const english = this.extractField(item, [
          'english', 'English', 'english_definition', 'english_word', 'word', 'term'
        ]);
        
        const ibibio = this.extractField(item, [
          'ibibio', 'Ibibio', 'ibibio_word', 'ibibio_translation', 'translation', 'target'
        ]);
        
        const meaning = this.extractField(item, [
          'meaning', 'Meaning', 'definition', 'english_definition', 'description', 'gloss'
        ]) || english; // Fallback to english if no meaning

        // Validation with detailed logging
        const validationResult = this.validateEntry(english, ibibio, meaning, index);
        
        if (!validationResult.isValid) {
          console.log(`⚠️ Skipping entry ${index}: ${validationResult.reason}`, {
            english, ibibio, meaning
          });
          this.loadingStats.skippedEntries++;
          return;
        }

        // Create the transformed entry with enhanced data
        const entry: DictionaryEntry = {
          id: item.id || `entry-${index}-${Date.now()}`,
          english: this.normalizeText(english),
          ibibio: this.normalizeText(ibibio),
          meaning: this.normalizeText(meaning),
          partOfSpeech: this.extractField(item, [
            'partOfSpeech', 'part_of_speech', 'Part of Speech', 'pos', 'type'
          ]) || this.inferPartOfSpeech(english),
          examples: this.transformExamples(item.examples),
          pronunciation: this.extractField(item, [
            'pronunciation', 'Pronunciation', 'phonetic', 'ipa'
          ]) || '',
          cultural: this.extractField(item, [
            'cultural', 'Cultural', 'context', 'cultural_context', 'notes'
          ]) || '',
          category: this.extractField(item, [
            'category', 'Category', 'type', 'domain', 'field'
          ]) || this.inferCategory(english, meaning)
        };

        transformedEntries.push(entry);
        this.loadingStats.validEntries++;

      } catch (entryError) {
        console.error(`❌ Error transforming entry ${index}:`, entryError, item);
        this.loadingStats.transformationErrors++;
      }
    });

    console.log(`✅ Transformation complete: ${transformedEntries.length} valid entries from ${rawData.length} raw entries`);
    return transformedEntries;
  }

  private extractField(item: any, fieldNames: string[]): string {
    for (const fieldName of fieldNames) {
      const value = item[fieldName];
      if (value && typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return '';
  }

  private normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[""'']/g, '"') // Normalize quotes
      .replace(/[–—]/g, '-'); // Normalize dashes
  }

  private validateEntry(english: string, ibibio: string, meaning: string, index: number): {
    isValid: boolean;
    reason: string;
  } {
    // Enhanced validation with specific reasons
    if (!english || english.length === 0) {
      return { isValid: false, reason: 'Missing English field' };
    }
    
    if (!ibibio || ibibio.length === 0) {
      return { isValid: false, reason: 'Missing Ibibio field' };
    }
    
    if (!meaning || meaning.length === 0) {
      return { isValid: false, reason: 'Missing meaning field' };
    }

    // Check for suspicious patterns
    if (english.length > 200 || ibibio.length > 200) {
      return { isValid: false, reason: 'Text too long (possible data corruption)' };
    }

    if (english === ibibio) {
      return { isValid: false, reason: 'English and Ibibio are identical' };
    }

    // Check for common data quality issues
    if (/^\d+$/.test(english) || /^\d+$/.test(ibibio)) {
      return { isValid: false, reason: 'Contains only numbers' };
    }

    return { isValid: true, reason: 'Valid entry' };
  }

  private inferPartOfSpeech(english: string): string {
    const word = english.toLowerCase().trim();
    
    // Enhanced part of speech inference
    const patterns = {
      verb: [
        /ing$/, /ed$/, /^(to\s+)/, /^(is|am|are|was|were|be|been|have|has|had|do|does|did|will|would|can|could|should|shall|may|might)\s/
      ],
      adjective: [
        /ly$/, /ful$/, /less$/, /ous$/, /ive$/, /able$/, /ible$/,
        /^(good|bad|big|small|hot|cold|new|old|young|beautiful|ugly|fast|slow|high|low|long|short|wide|narrow|thick|thin|heavy|light|dark|bright|clean|dirty|rich|poor|happy|sad|angry|calm|easy|hard|soft|loud|quiet|sweet|bitter|sour|salty)/
      ],
      adverb: [
        /ly$/, /ward$/, /wise$/,
        /^(very|quite|really|extremely|completely|totally|absolutely|perfectly|exactly|almost|nearly|hardly|barely|just|only|even|still|already|yet|soon|late|early|often|always|never|sometimes|usually|rarely|frequently)/
      ],
      preposition: [
        /^(in|on|at|by|for|of|with|to|from|into|onto|upon|under|over|above|below|between|among|through|across|around|behind|before|after|during|within|without|against|toward|towards|beneath|beside|beyond|inside|outside|underneath|throughout)$/
      ],
      pronoun: [
        /^(i|you|he|she|it|we|they|me|him|her|us|them|my|your|his|her|its|our|their|mine|yours|hers|ours|theirs|this|that|these|those|who|whom|whose|which|what)$/
      ],
      conjunction: [
        /^(and|or|but|so|yet|for|nor|because|since|although|though|while|if|unless|until|when|where|why|how|that|whether)$/
      ],
      interjection: [
        /^(hello|hi|hey|goodbye|bye|yes|no|oh|ah|wow|ouch|hurray|alas|bravo)$/
      ]
    };

    for (const [pos, patternList] of Object.entries(patterns)) {
      if (patternList.some(pattern => pattern.test(word))) {
        return pos;
      }
    }

    // Default to noun if no pattern matches
    return 'noun';
  }

  private inferCategory(english: string, meaning: string): string {
    const text = `${english} ${meaning}`.toLowerCase();
    
    const categories = {
      'family': ['family', 'mother', 'father', 'parent', 'child', 'son', 'daughter', 'brother', 'sister', 'uncle', 'aunt', 'cousin', 'grandmother', 'grandfather'],
      'food': ['food', 'eat', 'drink', 'meal', 'breakfast', 'lunch', 'dinner', 'fruit', 'vegetable', 'meat', 'fish', 'rice', 'bread', 'water', 'milk'],
      'body': ['body', 'head', 'eye', 'nose', 'mouth', 'ear', 'hand', 'foot', 'arm', 'leg', 'finger', 'toe', 'hair', 'skin', 'heart'],
      'nature': ['tree', 'flower', 'plant', 'animal', 'bird', 'fish', 'water', 'river', 'mountain', 'forest', 'sky', 'sun', 'moon', 'star', 'rain'],
      'time': ['time', 'day', 'night', 'morning', 'afternoon', 'evening', 'week', 'month', 'year', 'today', 'tomorrow', 'yesterday', 'hour', 'minute'],
      'emotion': ['love', 'hate', 'happy', 'sad', 'angry', 'fear', 'joy', 'peace', 'worry', 'hope', 'dream', 'feel', 'emotion'],
      'action': ['go', 'come', 'walk', 'run', 'sit', 'stand', 'sleep', 'wake', 'work', 'play', 'speak', 'listen', 'see', 'look', 'hear'],
      'greeting': ['hello', 'goodbye', 'welcome', 'thank', 'please', 'sorry', 'excuse', 'greet', 'blessing'],
      'spiritual': ['god', 'pray', 'church', 'spirit', 'soul', 'heaven', 'blessing', 'worship', 'faith', 'believe', 'sacred', 'holy']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  private transformExamples(examples: any): Array<{ english: string; ibibio: string }> {
    if (!examples) return [];
    
    if (Array.isArray(examples)) {
      return examples.map(ex => ({
        english: this.extractField(ex, ['english', 'English', 'example', 'source']) || String(ex),
        ibibio: this.extractField(ex, ['ibibio', 'Ibibio', 'translation', 'target']) || ''
      })).filter(ex => ex.english && ex.english.length > 0);
    }
    
    return [];
  }

  private createEnhancedFallbackDictionary(): void {
    console.log('🔧 Creating enhanced fallback dictionary with improved entries...');
    
    this.dictionary = [
      {
        id: 'hello-1',
        english: 'hello',
        ibibio: 'nno',
        meaning: 'A greeting; expression of welcome used throughout the day',
        partOfSpeech: 'interjection',
        examples: [
          { english: 'Hello, how are you?', ibibio: 'Nno, afo ufok?' },
          { english: 'Hello everyone!', ibibio: 'Nno nyenyin!' }
        ],
        pronunciation: '/n̩.no/',
        cultural: 'In Ibibio culture, greetings are very important and show respect. "Nno" is used throughout the day and is often accompanied by inquiries about family and health.',
        category: 'greeting'
      },
      {
        id: 'water-1',
        english: 'water',
        ibibio: 'mmong',
        meaning: 'Clear liquid essential for life; H2O',
        partOfSpeech: 'noun',
        examples: [
          { english: 'I need water', ibibio: 'Nkpo mmong' },
          { english: 'The water is clean', ibibio: 'Mmong oro afiak' }
        ],
        pronunciation: '/m̩.moŋ/',
        cultural: 'Water holds sacred significance in Ibibio tradition. It is used in purification rituals and is considered a gift from the ancestors.',
        category: 'nature'
      },
      {
        id: 'love-1',
        english: 'love',
        ibibio: 'uduak',
        meaning: 'Deep affection or care for someone; strong emotional attachment',
        partOfSpeech: 'noun',
        examples: [
          { english: 'I love you', ibibio: 'Nkpo uduak fi' },
          { english: 'Love is important', ibibio: 'Uduak akpa ntak' }
        ],
        pronunciation: '/u.du.ak/',
        cultural: 'Love in Ibibio culture extends beyond romantic love to include deep respect for elders, community bonds, and spiritual connections.',
        category: 'emotion'
      },
      {
        id: 'stop-1',
        english: 'stop',
        ibibio: 'tịre',
        meaning: 'To cease; to end; to bring to a halt',
        partOfSpeech: 'verb',
        examples: [
          { english: 'Stop the car', ibibio: 'Tịre motor oro' },
          { english: 'Please stop', ibibio: 'Meyo tịre' }
        ],
        pronunciation: '/tɪ̃.re/',
        cultural: 'The concept of stopping in Ibibio has nuanced meanings - "tịre" implies completion or ending, while "tịbe" suggests prevention or blocking.',
        category: 'action'
      },
      {
        id: 'stop-2',
        english: 'stop',
        ibibio: 'tịbe',
        meaning: 'To prevent; to block; to halt something from happening',
        partOfSpeech: 'verb',
        examples: [
          { english: 'Stop him from going', ibibio: 'Tịbe enye ke okod' },
          { english: 'Stop the rain', ibibio: 'Tịbe usen' }
        ],
        pronunciation: '/tɪ̃.be/',
        cultural: 'This form of "stop" emphasizes prevention and blocking, reflecting the precision of Ibibio in expressing different types of cessation.',
        category: 'action'
      },
      {
        id: 'big-1',
        english: 'big',
        ibibio: 'akpa',
        meaning: 'Large in size; having great physical dimensions',
        partOfSpeech: 'adjective',
        examples: [
          { english: 'The house is big', ibibio: 'Ufok oro akpa' },
          { english: 'Big tree', ibibio: 'Eti akpa' }
        ],
        pronunciation: '/ak.pa/',
        cultural: 'Size and magnitude in Ibibio culture often relate to importance and respect. Large gatherings and celebrations are highly valued.',
        category: 'description'
      },
      {
        id: 'big-2',
        english: 'big',
        ibibio: 'eket',
        meaning: 'Important; significant; of great importance or influence',
        partOfSpeech: 'adjective',
        examples: [
          { english: 'He is a big man', ibibio: 'Enye eket ntak' },
          { english: 'Big decision', ibibio: 'Mkpọ eket' }
        ],
        pronunciation: '/e.ket/',
        cultural: 'When referring to people or abstract concepts, "eket" emphasizes social importance and influence rather than physical size.',
        category: 'description'
      },
      {
        id: 'good-1',
        english: 'good',
        ibibio: 'afiak',
        meaning: 'Of high quality; positive; pleasant; satisfactory',
        partOfSpeech: 'adjective',
        examples: [
          { english: 'This is good', ibibio: 'Oro afiak' },
          { english: 'Good food', ibibio: 'Ndidia afiak' }
        ],
        pronunciation: '/a.fi.ak/',
        cultural: 'The concept of goodness in Ibibio culture is tied to quality, beauty, and general positive attributes.',
        category: 'description'
      },
      {
        id: 'good-2',
        english: 'good',
        ibibio: 'emenere',
        meaning: 'Morally good; righteous; virtuous; ethically sound',
        partOfSpeech: 'adjective',
        examples: [
          { english: 'She is a good person', ibibio: 'Enye owo emenere' },
          { english: 'Good morning', ibibio: 'Emenere' }
        ],
        pronunciation: '/e.me.ne.re/',
        cultural: 'This form of "good" specifically relates to moral character, righteousness, and ethical behavior in Ibibio society.',
        category: 'description'
      },
      {
        id: 'god-1',
        english: 'god',
        ibibio: 'abasi',
        meaning: 'The supreme deity; creator and sustainer of all life; the Almighty',
        partOfSpeech: 'noun',
        examples: [
          { english: 'God is great', ibibio: 'Abasi akpa ntak' },
          { english: 'We pray to God', ibibio: 'Nyenyin kere Abasi' },
          { english: 'God bless you', ibibio: 'Abasi akpa afo' }
        ],
        pronunciation: '/a.ba.si/',
        cultural: 'Abasi is the supreme deity in Ibibio traditional religion, representing the creator and sustainer of all life. Abasi is considered omnipotent, omniscient, and benevolent.',
        category: 'spiritual'
      }
    ];
    
    this.isLoaded = true;
    this.loadingStats.validEntries = this.dictionary.length;
    console.log('✅ Enhanced fallback dictionary created with comprehensive entries');
    this.logLoadingStats();
  }

  private logLoadingStats(): void {
    console.log('📊 Dictionary Loading Statistics:', {
      totalRawEntries: this.loadingStats.totalRawEntries,
      validEntries: this.loadingStats.validEntries,
      skippedEntries: this.loadingStats.skippedEntries,
      transformationErrors: this.loadingStats.transformationErrors,
      successRate: this.loadingStats.totalRawEntries > 0 
        ? `${((this.loadingStats.validEntries / this.loadingStats.totalRawEntries) * 100).toFixed(1)}%`
        : 'N/A'
    });
  }

  async saveDictionary(entries: DictionaryEntry[]): Promise<void> {
    try {
      console.log('💾 Saving dictionary with validation...');
      
      // Validate entries before saving
      const validatedEntries = entries.filter((entry, index) => {
        const validation = this.validateEntry(entry.english, entry.ibibio, entry.meaning, index);
        if (!validation.isValid) {
          console.warn(`⚠️ Skipping invalid entry during save: ${validation.reason}`, entry);
          return false;
        }
        return true;
      });

      this.dictionary = validatedEntries;
      localStorage.setItem('ibibio-dictionary', JSON.stringify(validatedEntries));
      this.isLoaded = true;
      console.log(`✅ Dictionary saved with ${validatedEntries.length} valid entries (${entries.length - validatedEntries.length} entries filtered out)`);
    } catch (error) {
      console.error('❌ Error saving dictionary:', error);
      throw error;
    }
  }

  search(query: string): DictionaryEntry | null {
    if (!this.isLoaded || !query) return null;
    
    const normalizedQuery = String(query).toLowerCase().trim();
    if (!normalizedQuery) return null;
    
    console.log(`🔍 Searching for: "${normalizedQuery}" in ${this.dictionary.length} entries`);
    
    // Enhanced exact match with logging
    const exactMatches = this.dictionary.filter(entry => {
      if (!entry.english || typeof entry.english !== 'string') return false;
      const entryEnglish = String(entry.english).toLowerCase().trim();
      return entryEnglish === normalizedQuery;
    });
    
    if (exactMatches.length > 0) {
      console.log(`✅ Found ${exactMatches.length} exact match(es):`, exactMatches.map(e => `${e.english} -> ${e.ibibio}`));
      // Return the most complete entry (with examples, cultural context, etc.)
      const bestMatch = exactMatches.reduce((best, current) => {
        const bestScore = this.calculateCompletenessScore(best);
        const currentScore = this.calculateCompletenessScore(current);
        return currentScore > bestScore ? current : best;
      });
      return bestMatch;
    }
    
    // Enhanced partial match with better scoring
    const partialMatches = this.dictionary.filter(entry => {
      if (!entry.english || typeof entry.english !== 'string') return false;
      const entryEnglish = String(entry.english).toLowerCase().trim();
      
      // Word boundary matches (higher priority)
      const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(normalizedQuery)}\\b`, 'i');
      if (wordBoundaryRegex.test(entryEnglish)) return true;
      
      // Contains matches
      return entryEnglish.includes(normalizedQuery) || normalizedQuery.includes(entryEnglish);
    });
    
    if (partialMatches.length > 0) {
      console.log(`✅ Found ${partialMatches.length} partial match(es):`, partialMatches.map(e => `${e.english} -> ${e.ibibio}`));
      
      // Score and sort partial matches
      const scoredMatches = partialMatches.map(entry => ({
        entry,
        score: this.calculateMatchScore(normalizedQuery, entry)
      })).sort((a, b) => b.score - a.score);
      
      console.log('🏆 Top partial match scores:', scoredMatches.slice(0, 3).map(m => 
        `${m.entry.english} -> ${m.entry.ibibio} (score: ${m.score.toFixed(2)})`
      ));
      
      return scoredMatches[0].entry;
    }
    
    console.log(`❌ No match found for: "${normalizedQuery}"`);
    return null;
  }

  private calculateCompletenessScore(entry: DictionaryEntry): number {
    let score = 1; // Base score
    
    if (entry.examples && entry.examples.length > 0) score += 2;
    if (entry.cultural && entry.cultural.length > 0) score += 1;
    if (entry.pronunciation && entry.pronunciation.length > 0) score += 1;
    if (entry.category && entry.category !== 'general') score += 0.5;
    if (entry.meaning && entry.meaning.length > 20) score += 0.5; // Detailed meaning
    
    return score;
  }

  private calculateMatchScore(query: string, entry: DictionaryEntry): number {
    const english = entry.english.toLowerCase();
    let score = 0;
    
    // Exact match bonus
    if (english === query) score += 10;
    
    // Starts with query
    if (english.startsWith(query)) score += 5;
    
    // Word boundary match
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(query)}\\b`, 'i');
    if (wordBoundaryRegex.test(english)) score += 3;
    
    // Contains query
    if (english.includes(query)) score += 1;
    
    // Completeness bonus
    score += this.calculateCompletenessScore(entry) * 0.1;
    
    // Length penalty for very long entries (prefer concise matches)
    if (english.length > query.length * 3) score -= 0.5;
    
    return score;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  searchExact(query: string): DictionaryEntry | null {
    if (!this.isLoaded || !query) return null;
    
    const normalizedQuery = String(query).toLowerCase().trim();
    if (!normalizedQuery) return null;
    
    const exactMatch = this.dictionary.find(entry => 
      entry.english && typeof entry.english === 'string' && 
      String(entry.english).toLowerCase() === normalizedQuery
    );
    
    if (exactMatch) {
      console.log(`🎯 Exact match found: ${exactMatch.english} -> ${exactMatch.ibibio}`);
    }
    
    return exactMatch || null;
  }

  searchFuzzy(query: string, limit = 5): SearchResult[] {
    if (!this.isLoaded || !query) return [];
    
    const normalizedQuery = String(query).toLowerCase().trim();
    if (!normalizedQuery) return [];
    
    console.log(`🔍 Performing fuzzy search for: "${normalizedQuery}"`);
    
    const results: SearchResult[] = [];

    this.dictionary.forEach(entry => {
      if (!entry.english || typeof entry.english !== 'string') return;
      
      const englishLower = String(entry.english).toLowerCase();
      let confidence = 0;

      // Enhanced confidence calculation with detailed logging
      if (englishLower === normalizedQuery) {
        confidence = 1.0;
        console.log(`🎯 Exact match: ${entry.english} (confidence: 1.0)`);
      } else if (englishLower.startsWith(normalizedQuery)) {
        confidence = 0.9;
        console.log(`🔸 Starts with: ${entry.english} (confidence: 0.9)`);
      } else if (englishLower.includes(normalizedQuery)) {
        confidence = 0.7;
        console.log(`🔹 Contains: ${entry.english} (confidence: 0.7)`);
      } else if (normalizedQuery.includes(englishLower)) {
        confidence = 0.6;
        console.log(`🔸 Query contains word: ${entry.english} (confidence: 0.6)`);
      } else {
        // Enhanced word boundary matching
        const queryWords = normalizedQuery.split(/\s+/);
        const entryWords = englishLower.split(/\s+/);
        
        let wordMatches = 0;
        let totalPossibleMatches = Math.max(queryWords.length, entryWords.length);
        
        queryWords.forEach(qWord => {
          entryWords.forEach(eWord => {
            if (qWord === eWord) {
              wordMatches += 1.0; // Exact word match
            } else if (qWord.includes(eWord) || eWord.includes(qWord)) {
              wordMatches += 0.5; // Partial word match
            }
          });
        });
        
        if (wordMatches > 0) {
          confidence = (wordMatches / totalPossibleMatches) * 0.5;
          console.log(`🔹 Word match: ${entry.english} (matches: ${wordMatches}/${totalPossibleMatches}, confidence: ${confidence.toFixed(2)})`);
        }
      }

      // Apply completeness bonus
      if (confidence > 0) {
        const completenessBonus = this.calculateCompletenessScore(entry) * 0.02; // Small bonus for complete entries
        confidence = Math.min(1.0, confidence + completenessBonus);
        
        results.push({
          entry,
          confidence,
          source: 'dictionary'
        });
      }
    });

    const sortedResults = results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);

    console.log(`📊 Fuzzy search results (top ${Math.min(limit, sortedResults.length)}):`, 
      sortedResults.map(r => `${r.entry.english} -> ${r.entry.ibibio} (${(r.confidence * 100).toFixed(1)}%)`));

    return sortedResults;
  }

  getAllEntries(): DictionaryEntry[] {
    return [...this.dictionary];
  }

  getStats() {
    const categories = [...new Set(this.dictionary.map(e => e.category).filter(Boolean))];
    const partsOfSpeech = [...new Set(this.dictionary.map(e => e.partOfSpeech).filter(Boolean))];
    
    return {
      totalEntries: this.dictionary.length,
      isLoaded: this.isLoaded,
      categories: categories,
      partsOfSpeech: partsOfSpeech,
      loadingStats: this.loadingStats,
      entriesWithExamples: this.dictionary.filter(e => e.examples && e.examples.length > 0).length,
      entriesWithCultural: this.dictionary.filter(e => e.cultural && e.cultural.length > 0).length,
      entriesWithPronunciation: this.dictionary.filter(e => e.pronunciation && e.pronunciation.length > 0).length
    };
  }

  // Enhanced debug method
  debugDictionary(searchTerm?: string) {
    console.log('=== ENHANCED DICTIONARY DEBUG ===');
    console.log('📊 Statistics:', this.getStats());
    
    if (searchTerm) {
      console.log(`🔍 Debug search for: "${searchTerm}"`);
      
      // Test exact search
      const exactResult = this.searchExact(searchTerm);
      console.log('🎯 Exact search result:', exactResult);
      
      // Test fuzzy search
      const fuzzyResults = this.searchFuzzy(searchTerm, 5);
      console.log('🔍 Fuzzy search results:', fuzzyResults);
      
      // Test general search
      const generalResult = this.search(searchTerm);
      console.log('🔍 General search result:', generalResult);
    } else {
      console.log('📝 Sample entries by category:');
      const categories = [...new Set(this.dictionary.map(e => e.category).filter(Boolean))];
      categories.forEach(category => {
        const categoryEntries = this.dictionary.filter(e => e.category === category);
        console.log(`  ${category}: ${categoryEntries.length} entries`);
        if (categoryEntries.length > 0) {
          console.log(`    Example: ${categoryEntries[0].english} -> ${categoryEntries[0].ibibio}`);
        }
      });
    }
  }
}

export const dictionaryService = new DictionaryService();