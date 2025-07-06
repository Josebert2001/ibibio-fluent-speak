import { DictionaryEntry } from '../types/dictionary';

interface SemanticScore {
  primaryMatch: number;
  positionScore: number;
  contextScore: number;
  definitionScore: number;
  completenessScore: number;
  categoryRelevanceScore: number;
  firstMentionBonus: number; // New: Bonus for first mention in comma-separated lists
  exactWordBonus: number; // New: Bonus for exact word matches in sentences
  totalScore: number;
}

interface AnalysisDetails {
  matchType: string;
  confidence: string;
  reasoning: string[];
  flags: string[];
}

class SemanticAnalyzer {
  private categoryKeywords = {
    'greeting': ['hello', 'hi', 'welcome', 'goodbye', 'bye', 'greet', 'salute'],
    'family': ['family', 'mother', 'father', 'parent', 'child', 'son', 'daughter', 'brother', 'sister', 'relative'],
    'food': ['food', 'eat', 'drink', 'meal', 'hungry', 'thirsty', 'cook', 'taste', 'delicious'],
    'emotion': ['love', 'hate', 'happy', 'sad', 'angry', 'joy', 'fear', 'feel', 'emotion', 'mood'],
    'action': ['go', 'come', 'walk', 'run', 'stop', 'start', 'move', 'sit', 'stand', 'work', 'play'],
    'description': ['big', 'small', 'good', 'bad', 'beautiful', 'ugly', 'hot', 'cold', 'fast', 'slow'],
    'nature': ['water', 'tree', 'flower', 'animal', 'bird', 'sun', 'moon', 'rain', 'wind', 'earth'],
    'spiritual': ['god', 'pray', 'church', 'spirit', 'soul', 'blessing', 'worship', 'faith', 'sacred'],
    'time': ['time', 'day', 'night', 'morning', 'afternoon', 'evening', 'week', 'month', 'year'],
    'body': ['body', 'head', 'eye', 'hand', 'foot', 'heart', 'face', 'hair', 'skin', 'blood']
  };

  /**
   * Enhanced analyze method with smart word detection in sentences and lists
   */
  analyzeMatch(query: string, entry: DictionaryEntry): SemanticScore {
    const normalizedQuery = query.toLowerCase().trim();
    const normalizedEnglish = entry.english?.toLowerCase().trim() || '';
    const normalizedMeaning = entry.meaning?.toLowerCase().trim() || '';

    console.log(`🔍 Enhanced analysis: "${query}" vs "${entry.english}"`);

    // 1. Enhanced Primary Match Analysis with smart word detection
    const primaryMatch = this.calculateSmartPrimaryMatch(normalizedQuery, normalizedEnglish);

    // 2. Enhanced Position Score
    const positionScore = this.calculateEnhancedPositionScore(normalizedQuery, normalizedMeaning);

    // 3. Enhanced Context Score
    const contextScore = this.calculateEnhancedContextScore(normalizedQuery, normalizedMeaning, normalizedEnglish);

    // 4. Enhanced Definition Structure Score
    const definitionScore = this.calculateEnhancedDefinitionScore(normalizedQuery, normalizedMeaning);

    // 5. Completeness Score
    const completenessScore = this.calculateCompletenessScore(entry);

    // 6. Category Relevance Score
    const categoryRelevanceScore = this.calculateCategoryRelevanceScore(normalizedQuery, entry);

    // 7. NEW: First Mention Bonus for comma-separated lists
    const firstMentionBonus = this.calculateFirstMentionBonus(normalizedQuery, normalizedEnglish);

    // 8. NEW: Exact Word Bonus for word boundaries in sentences
    const exactWordBonus = this.calculateExactWordBonus(normalizedQuery, normalizedEnglish);

    // Calculate enhanced weighted total score
    const totalScore = this.calculateEnhancedWeightedScore({
      primaryMatch,
      positionScore,
      contextScore,
      definitionScore,
      completenessScore,
      categoryRelevanceScore,
      firstMentionBonus,
      exactWordBonus
    });

    const result = {
      primaryMatch,
      positionScore,
      contextScore,
      definitionScore,
      completenessScore,
      categoryRelevanceScore,
      firstMentionBonus,
      exactWordBonus,
      totalScore
    };

    console.log(`📊 Enhanced semantic scores for "${entry.english}":`, {
      primary: primaryMatch.toFixed(3),
      position: positionScore.toFixed(3),
      context: contextScore.toFixed(3),
      definition: definitionScore.toFixed(3),
      completeness: completenessScore.toFixed(3),
      category: categoryRelevanceScore.toFixed(3),
      firstMention: firstMentionBonus.toFixed(3),
      exactWord: exactWordBonus.toFixed(3),
      total: totalScore.toFixed(3)
    });

    return result;
  }

  /**
   * NEW: Smart primary match that detects words in sentences and comma-separated lists
   */
  private calculateSmartPrimaryMatch(query: string, english: string): number {
    if (!query || !english) return 0;

    // Exact match (highest score)
    if (english === query) {
      console.log(`🎯 Exact match found: "${english}"`);
      return 1.0;
    }

    // NEW: Smart word detection in comma-separated lists
    const commaSeparatedScore = this.analyzeCommaSeparatedList(query, english);
    if (commaSeparatedScore > 0) {
      console.log(`📝 Found in comma-separated list: score ${commaSeparatedScore.toFixed(3)}`);
      return commaSeparatedScore;
    }

    // NEW: Smart word detection in sentences
    const sentenceWordScore = this.analyzeSentenceWordMatch(query, english);
    if (sentenceWordScore > 0) {
      console.log(`📖 Found as word in sentence: score ${sentenceWordScore.toFixed(3)}`);
      return sentenceWordScore;
    }

    // Enhanced word boundary analysis
    const queryWords = query.split(/\s+/);
    const englishWords = english.split(/\s+/);

    // Single word query matching multi-word entry
    if (queryWords.length === 1 && englishWords.includes(query)) {
      console.log(`🔸 Single word found in multi-word entry: "${query}" in "${english}"`);
      return 0.95;
    }

    // Multi-word query analysis
    if (queryWords.length > 1) {
      const matchingWords = queryWords.filter(qWord => 
        englishWords.some(eWord => eWord === qWord || eWord.includes(qWord) || qWord.includes(eWord))
      );
      
      if (matchingWords.length === queryWords.length) {
        console.log(`🔸 All query words found: ${matchingWords.length}/${queryWords.length}`);
        return 0.9;
      } else if (matchingWords.length > 0) {
        const ratio = matchingWords.length / queryWords.length;
        console.log(`🔹 Partial word match: ${matchingWords.length}/${queryWords.length} (${(ratio * 100).toFixed(1)}%)`);
        return 0.7 * ratio;
      }
    }

    // Enhanced prefix matching
    if (english.startsWith(query)) {
      const ratio = query.length / english.length;
      console.log(`🔸 Prefix match: "${query}" starts "${english}" (ratio: ${ratio.toFixed(2)})`);
      return 0.85 * Math.min(1, ratio + 0.2);
    }

    // Enhanced word boundary matching
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(query)}\\b`, 'i');
    if (wordBoundaryRegex.test(english)) {
      const position = english.search(wordBoundaryRegex);
      const positionScore = position === 0 ? 1.0 : Math.max(0.5, 1 - (position / english.length));
      console.log(`🔹 Word boundary match at position ${position}: score ${positionScore.toFixed(2)}`);
      return 0.8 * positionScore;
    }

    // Enhanced substring matching
    if (english.includes(query)) {
      const position = english.indexOf(query);
      const lengthRatio = query.length / english.length;
      const positionPenalty = position / english.length;
      const score = 0.6 * lengthRatio * (1 - positionPenalty * 0.5);
      console.log(`🔹 Substring match: position ${position}, length ratio ${lengthRatio.toFixed(2)}, score ${score.toFixed(2)}`);
      return score;
    }

    return 0;
  }

  /**
   * NEW: Analyze comma-separated lists to find the query word
   */
  private analyzeCommaSeparatedList(query: string, english: string): number {
    // Check if the english field contains commas (indicating a list)
    if (!english.includes(',')) return 0;

    const items = english.split(',').map(item => item.trim());
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Exact match in list item
      if (item === query) {
        // Higher score for earlier positions in the list
        const positionBonus = Math.max(0.1, 1 - (i * 0.1));
        console.log(`🎯 Exact match in comma list at position ${i + 1}: "${item}"`);
        return 0.98 * positionBonus;
      }
      
      // Word boundary match in list item
      const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(query)}\\b`, 'i');
      if (wordBoundaryRegex.test(item)) {
        const positionBonus = Math.max(0.1, 1 - (i * 0.1));
        console.log(`🔸 Word boundary match in comma list at position ${i + 1}: "${item}"`);
        return 0.92 * positionBonus;
      }
      
      // Starts with query in list item
      if (item.startsWith(query)) {
        const positionBonus = Math.max(0.1, 1 - (i * 0.1));
        console.log(`🔹 Starts with match in comma list at position ${i + 1}: "${item}"`);
        return 0.85 * positionBonus;
      }
    }
    
    return 0;
  }

  /**
   * NEW: Analyze sentence word matches with context awareness
   */
  private analyzeSentenceWordMatch(query: string, english: string): number {
    // Skip if it's clearly a list (contains commas)
    if (english.includes(',')) return 0;
    
    // Check for word boundary match in sentence
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(query)}\\b`, 'i');
    if (!wordBoundaryRegex.test(english)) return 0;
    
    const words = english.split(/\s+/);
    const queryIndex = words.findIndex(word => 
      word.toLowerCase().replace(/[^\w]/g, '') === query
    );
    
    if (queryIndex === -1) return 0;
    
    // Higher score for query appearing earlier in the sentence
    const positionScore = Math.max(0.3, 1 - (queryIndex / words.length));
    
    // Bonus for being the main verb or noun (simple heuristic)
    let contextBonus = 1.0;
    
    // Check if it's preceded by "to" (likely a verb)
    if (queryIndex > 0 && words[queryIndex - 1].toLowerCase() === 'to') {
      contextBonus = 1.1;
      console.log(`🔸 Found after "to": likely main verb`);
    }
    
    // Check if it's the first significant word
    if (queryIndex === 0 || (queryIndex === 1 && words[0].toLowerCase() === 'to')) {
      contextBonus = 1.15;
      console.log(`🔸 Found as first significant word`);
    }
    
    const finalScore = 0.88 * positionScore * contextBonus;
    console.log(`📖 Sentence word match: position ${queryIndex + 1}/${words.length}, score ${finalScore.toFixed(3)}`);
    
    return finalScore;
  }

  /**
   * NEW: Calculate bonus for first mention in comma-separated lists
   */
  private calculateFirstMentionBonus(query: string, english: string): number {
    if (!english.includes(',')) return 0;
    
    const items = english.split(',').map(item => item.trim());
    const firstItem = items[0];
    
    // Check if query appears in the first item
    if (firstItem === query) {
      console.log(`🥇 Query is the first item in comma list`);
      return 0.2;
    }
    
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(query)}\\b`, 'i');
    if (wordBoundaryRegex.test(firstItem)) {
      console.log(`🥇 Query found in first item of comma list: "${firstItem}"`);
      return 0.15;
    }
    
    return 0;
  }

  /**
   * NEW: Calculate bonus for exact word boundaries in sentences
   */
  private calculateExactWordBonus(query: string, english: string): number {
    // Skip lists
    if (english.includes(',')) return 0;
    
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(query)}\\b`, 'i');
    if (!wordBoundaryRegex.test(english)) return 0;
    
    const words = english.split(/\s+/);
    const totalWords = words.length;
    
    // Bonus based on sentence length (shorter sentences get higher bonus)
    if (totalWords <= 3) {
      console.log(`🎯 Exact word in short sentence (${totalWords} words)`);
      return 0.15;
    } else if (totalWords <= 5) {
      console.log(`🎯 Exact word in medium sentence (${totalWords} words)`);
      return 0.1;
    } else {
      console.log(`🎯 Exact word in long sentence (${totalWords} words)`);
      return 0.05;
    }
  }

  /**
   * Enhanced weighted score calculation with new factors
   */
  private calculateEnhancedWeightedScore(scores: {
    primaryMatch: number;
    positionScore: number;
    contextScore: number;
    definitionScore: number;
    completenessScore: number;
    categoryRelevanceScore: number;
    firstMentionBonus: number;
    exactWordBonus: number;
  }): number {
    // Enhanced weighting system with new factors
    const weights = {
      primaryMatch: 0.40,           // Increased weight for primary match
      contextScore: 0.20,           // Context importance
      positionScore: 0.15,          // Position in definition
      definitionScore: 0.08,        // Definition structure
      firstMentionBonus: 0.07,      // NEW: First mention bonus
      exactWordBonus: 0.05,         // NEW: Exact word bonus
      completenessScore: 0.03,      // Entry completeness
      categoryRelevanceScore: 0.02  // Category relevance
    };
    
    const weightedScore = 
      scores.primaryMatch * weights.primaryMatch +
      scores.positionScore * weights.positionScore +
      scores.contextScore * weights.contextScore +
      scores.definitionScore * weights.definitionScore +
      scores.completenessScore * weights.completenessScore +
      scores.categoryRelevanceScore * weights.categoryRelevanceScore +
      scores.firstMentionBonus * weights.firstMentionBonus +
      scores.exactWordBonus * weights.exactWordBonus;
    
    return Math.min(1.0, weightedScore);
  }

  // Keep all existing methods unchanged
  private calculateEnhancedPositionScore(query: string, meaning: string): number {
    if (!query || !meaning) return 0;

    const cleanMeaning = meaning.replace(/[()[\]]/g, '').trim();
    
    // Enhanced segment analysis
    const segments = cleanMeaning.split(/[;,.]/).map(s => s.trim()).filter(s => s.length > 0);
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentLower = segment.toLowerCase();
      
      // Check for various match types in this segment
      const matchTypes = this.analyzeSegmentMatch(query, segmentLower);
      
      if (matchTypes.score > 0) {
        const segmentWeight = Math.max(0.2, 1.0 - (i * 0.15)); // Gradual decrease for later segments
        const finalScore = matchTypes.score * segmentWeight;
        
        console.log(`📍 Position match in segment ${i + 1}: "${segment.substring(0, 50)}..." (${matchTypes.type}, score: ${finalScore.toFixed(3)})`);
        return finalScore;
      }
    }

    return 0;
  }

  private analyzeSegmentMatch(query: string, segment: string): { score: number; type: string } {
    // Exact match at start
    if (segment.startsWith(query)) {
      return { score: 1.0, type: 'starts_with' };
    }

    // "To [query]" pattern
    if (segment.startsWith(`to ${query}`)) {
      return { score: 1.0, type: 'to_verb' };
    }

    // Word boundary match
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(query)}\\b`, 'i');
    if (wordBoundaryRegex.test(segment)) {
      const position = segment.search(wordBoundaryRegex);
      const positionScore = position < 10 ? 0.9 : position < 20 ? 0.7 : 0.5;
      return { score: positionScore, type: 'word_boundary' };
    }

    // Contains match
    if (segment.includes(query)) {
      const position = segment.indexOf(query);
      const lengthRatio = query.length / segment.length;
      const positionPenalty = position / segment.length;
      const score = Math.max(0.3, 0.6 * lengthRatio * (1 - positionPenalty));
      return { score, type: 'contains' };
    }

    return { score: 0, type: 'no_match' };
  }

  private calculateEnhancedContextScore(query: string, meaning: string, english: string): number {
    if (!query || !meaning) return 0;

    const meaningLower = meaning.toLowerCase();
    const queryLower = query.toLowerCase();

    // Enhanced direct translation detection
    const directTranslationPatterns = [
      new RegExp(`^${this.escapeRegex(queryLower)}[,;.]`, 'i'),
      new RegExp(`^${this.escapeRegex(queryLower)}\\s`, 'i'),
      new RegExp(`^to\\s+${this.escapeRegex(queryLower)}[,;.]`, 'i'),
      new RegExp(`^${this.escapeRegex(queryLower)}$`, 'i')
    ];

    for (const pattern of directTranslationPatterns) {
      if (pattern.test(meaningLower)) {
        console.log(`🎯 Direct translation pattern matched: ${pattern.source}`);
        return 1.0;
      }
    }

    // Enhanced compound/contextual usage detection (penalty)
    const contextualPatterns = [
      new RegExp(`${this.escapeRegex(queryLower)}\\s+(from|something|someone|to|into|out|away)`, 'i'),
      new RegExp(`(prevent|make|cause|force|help).*${this.escapeRegex(queryLower)}`, 'i'),
      new RegExp(`${this.escapeRegex(queryLower)}.*from\\s+(happening|going|coming)`, 'i'),
      new RegExp(`to.*${this.escapeRegex(queryLower)}.*from`, 'i'),
      new RegExp(`${this.escapeRegex(queryLower)}\\s+(in|on|at|by|with)\\s+`, 'i')
    ];

    for (const pattern of contextualPatterns) {
      if (pattern.test(meaningLower)) {
        console.log(`⚠️ Contextual usage detected: ${pattern.source}`);
        return 0.25; // Heavy penalty for contextual usage
      }
    }

    // Enhanced list detection
    const listPatterns = [
      new RegExp(`[,;]\\s*${this.escapeRegex(queryLower)}[,;.]`, 'i'),
      new RegExp(`^[^,;]*,\\s*${this.escapeRegex(queryLower)}`, 'i')
    ];

    for (const pattern of listPatterns) {
      if (pattern.test(meaningLower)) {
        const position = meaningLower.search(pattern);
        const score = position < 20 ? 0.8 : 0.6;
        console.log(`📝 List item detected at position ${position}: score ${score}`);
        return score;
      }
    }

    // Enhanced word boundary with position weighting
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(queryLower)}\\b`, 'i');
    if (wordBoundaryRegex.test(meaningLower)) {
      const position = meaningLower.search(wordBoundaryRegex);
      let score = 0.6;
      
      if (position < 10) score = 0.8;
      else if (position < 25) score = 0.7;
      else if (position < 50) score = 0.6;
      else score = 0.4;
      
      console.log(`🔹 Word boundary match at position ${position}: score ${score}`);
      return score;
    }

    return 0.2;
  }

  private calculateEnhancedDefinitionScore(query: string, meaning: string): number {
    if (!query || !meaning) return 0;

    const meaningLower = meaning.toLowerCase();
    const queryLower = query.toLowerCase();

    // Enhanced primary definition detection
    const primaryPatterns = [
      new RegExp(`^${this.escapeRegex(queryLower)}[,;.]`, 'i'),
      new RegExp(`^to\\s+${this.escapeRegex(queryLower)}[,;.]`, 'i'),
      new RegExp(`^${this.escapeRegex(queryLower)}\\s+`, 'i'),
      new RegExp(`^${this.escapeRegex(queryLower)}$`, 'i')
    ];

    for (const pattern of primaryPatterns) {
      if (pattern.test(meaningLower)) {
        console.log(`🎯 Primary definition pattern: ${pattern.source}`);
        return 1.0;
      }
    }

    // Enhanced structured definition analysis
    const firstSegment = meaningLower.split(/[;,]/)[0].trim();
    
    if (firstSegment.length > 0) {
      // Check if query is the main concept in first segment
      if (firstSegment === queryLower || firstSegment === `to ${queryLower}`) {
        console.log(`🎯 Main concept in first segment: "${firstSegment}"`);
        return 0.95;
      }
      
      if (firstSegment.startsWith(`${queryLower} `)) {
        console.log(`🔸 Query starts first segment: "${firstSegment}"`);
        return 0.9;
      }
      
      // Word boundary in first segment
      const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(queryLower)}\\b`, 'i');
      if (wordBoundaryRegex.test(firstSegment)) {
        console.log(`🔹 Word boundary in first segment: "${firstSegment}"`);
        return 0.8;
      }
    }

    // Enhanced variant notation detection
    const variantPatterns = [
      new RegExp(`\\(var\\.?\\s*${this.escapeRegex(queryLower)}\\)`, 'i'),
      new RegExp(`\\(also\\s+${this.escapeRegex(queryLower)}\\)`, 'i'),
      new RegExp(`\\(see\\s+${this.escapeRegex(queryLower)}\\)`, 'i')
    ];

    for (const pattern of variantPatterns) {
      if (pattern.test(meaning)) {
        console.log(`🔄 Variant notation detected: ${pattern.source}`);
        return 0.7;
      }
    }

    // General word boundary match
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(queryLower)}\\b`, 'i');
    if (wordBoundaryRegex.test(meaningLower)) {
      console.log(`🔹 General word boundary match in definition`);
      return 0.4;
    }

    return 0.2;
  }

  private calculateCompletenessScore(entry: DictionaryEntry): number {
    let score = 0;
    
    // Base score for having required fields
    if (entry.english && entry.ibibio && entry.meaning) {
      score += 0.3;
    }
    
    // Bonus for additional fields
    if (entry.examples && entry.examples.length > 0) {
      score += 0.25;
      if (entry.examples.length > 1) score += 0.1;
    }
    
    if (entry.cultural && entry.cultural.length > 10) {
      score += 0.15;
    }
    
    if (entry.pronunciation && entry.pronunciation.length > 0) {
      score += 0.1;
    }
    
    if (entry.partOfSpeech && entry.partOfSpeech !== 'unknown') {
      score += 0.05;
    }
    
    if (entry.category && entry.category !== 'general') {
      score += 0.05;
    }
    
    // Bonus for detailed meaning
    if (entry.meaning && entry.meaning.length > 30) {
      score += 0.1;
    }
    
    return Math.min(1.0, score);
  }

  private calculateCategoryRelevanceScore(query: string, entry: DictionaryEntry): number {
    if (!entry.category || entry.category === 'general') return 0.5;
    
    const queryLower = query.toLowerCase();
    const categoryKeywords = this.categoryKeywords[entry.category as keyof typeof this.categoryKeywords];
    
    if (!categoryKeywords) return 0.5;
    
    // Check if query matches category keywords
    const matchingKeywords = categoryKeywords.filter(keyword => 
      queryLower.includes(keyword) || keyword.includes(queryLower)
    );
    
    if (matchingKeywords.length > 0) {
      const relevanceScore = 0.5 + (matchingKeywords.length / categoryKeywords.length) * 0.5;
      console.log(`🏷️ Category relevance for "${entry.category}": ${relevanceScore.toFixed(2)} (matched: ${matchingKeywords.join(', ')})`);
      return relevanceScore;
    }
    
    return 0.5; // Neutral score if no category match
  }

  /**
   * Enhanced escape method for regex
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Enhanced debug information with detailed analysis
   */
  getDebugInfo(query: string, entry: DictionaryEntry): string {
    const score = this.analyzeMatch(query, entry);
    const analysis = this.getDetailedAnalysis(query, entry, score);
    
    return `
=== ENHANCED SEMANTIC ANALYSIS DEBUG ===
Query: "${query}"
Entry: ${entry.english} → ${entry.ibibio}
Meaning: ${entry.meaning}
Category: ${entry.category || 'none'}

ENHANCED SCORES:
  Primary Match: ${score.primaryMatch.toFixed(3)} (${(score.primaryMatch * 40).toFixed(1)}% of total)
  Position Score: ${score.positionScore.toFixed(3)} (${(score.positionScore * 15).toFixed(1)}% of total)
  Context Score: ${score.contextScore.toFixed(3)} (${(score.contextScore * 20).toFixed(1)}% of total)
  Definition Score: ${score.definitionScore.toFixed(3)} (${(score.definitionScore * 8).toFixed(1)}% of total)
  First Mention Bonus: ${score.firstMentionBonus.toFixed(3)} (${(score.firstMentionBonus * 7).toFixed(1)}% of total)
  Exact Word Bonus: ${score.exactWordBonus.toFixed(3)} (${(score.exactWordBonus * 5).toFixed(1)}% of total)
  Completeness Score: ${score.completenessScore.toFixed(3)} (${(score.completenessScore * 3).toFixed(1)}% of total)
  Category Relevance: ${score.categoryRelevanceScore.toFixed(3)} (${(score.categoryRelevanceScore * 2).toFixed(1)}% of total)
  
TOTAL SCORE: ${score.totalScore.toFixed(3)} (${(score.totalScore * 100).toFixed(1)}%)

ANALYSIS:
  Match Type: ${analysis.matchType}
  Confidence: ${analysis.confidence}
  
REASONING:
${analysis.reasoning.map(r => `  • ${r}`).join('\n')}

${analysis.flags.length > 0 ? `FLAGS:\n${analysis.flags.map(f => `  ⚠️ ${f}`).join('\n')}` : ''}
    `.trim();
  }

  private getDetailedAnalysis(query: string, entry: DictionaryEntry, score: SemanticScore): AnalysisDetails {
    const reasoning: string[] = [];
    const flags: string[] = [];
    
    let matchType = 'No Match';
    let confidence = 'Very Low';
    
    if (score.totalScore >= 0.9) {
      matchType = 'Excellent Match';
      confidence = 'Very High';
    } else if (score.totalScore >= 0.7) {
      matchType = 'Good Match';
      confidence = 'High';
    } else if (score.totalScore >= 0.5) {
      matchType = 'Fair Match';
      confidence = 'Medium';
    } else if (score.totalScore >= 0.3) {
      matchType = 'Weak Match';
      confidence = 'Low';
    } else if (score.totalScore >= 0.1) {
      matchType = 'Poor Match';
      confidence = 'Very Low';
    }
    
    // Analyze primary match
    if (score.primaryMatch >= 0.9) {
      reasoning.push('Strong primary match - query closely matches English field');
    } else if (score.primaryMatch >= 0.5) {
      reasoning.push('Moderate primary match - partial correspondence with English field');
    } else if (score.primaryMatch > 0) {
      reasoning.push('Weak primary match - limited correspondence with English field');
    } else {
      reasoning.push('No primary match - query does not match English field');
      flags.push('NO_PRIMARY_MATCH');
    }
    
    // Analyze new bonuses
    if (score.firstMentionBonus > 0) {
      reasoning.push('First mention bonus applied - found early in comma-separated list');
    }
    
    if (score.exactWordBonus > 0) {
      reasoning.push('Exact word bonus applied - found as complete word in sentence');
    }
    
    // Analyze context
    if (score.contextScore >= 0.8) {
      reasoning.push('Excellent context match - appears to be direct translation');
    } else if (score.contextScore >= 0.5) {
      reasoning.push('Good context match - likely relevant translation');
    } else if (score.contextScore <= 0.3) {
      reasoning.push('Poor context match - may be contextual usage only');
      flags.push('CONTEXTUAL_USAGE');
    }
    
    // Analyze completeness
    if (score.completenessScore >= 0.8) {
      reasoning.push('Comprehensive entry with examples and cultural context');
    } else if (score.completenessScore <= 0.4) {
      reasoning.push('Basic entry with limited additional information');
      flags.push('LIMITED_INFO');
    }
    
    return {
      matchType,
      confidence,
      reasoning,
      flags
    };
  }

  /**
   * Batch analysis for comparing multiple entries
   */
  batchAnalyze(query: string, entries: DictionaryEntry[]): Array<{
    entry: DictionaryEntry;
    score: SemanticScore;
    rank: number;
  }> {
    console.log(`🔍 Enhanced batch analyzing ${entries.length} entries for query: "${query}"`);
    
    const results = entries.map(entry => ({
      entry,
      score: this.analyzeMatch(query, entry),
      rank: 0
    }));
    
    // Sort by total score and assign ranks
    results.sort((a, b) => b.score.totalScore - a.score.totalScore);
    results.forEach((result, index) => {
      result.rank = index + 1;
    });
    
    console.log(`📊 Enhanced batch analysis complete. Top 3 results:`);
    results.slice(0, 3).forEach(result => {
      console.log(`  ${result.rank}. ${result.entry.english} -> ${result.entry.ibibio} (${(result.score.totalScore * 100).toFixed(1)}%)`);
    });
    
    return results;
  }
}

export const semanticAnalyzer = new SemanticAnalyzer();
export type { SemanticScore, AnalysisDetails };