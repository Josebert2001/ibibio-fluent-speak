import { DictionaryEntry } from '../types/dictionary';

interface SemanticScore {
  primaryMatch: number;
  positionScore: number;
  contextScore: number;
  definitionScore: number;
  totalScore: number;
}

class SemanticAnalyzer {
  /**
   * Analyze how well a search query matches a dictionary entry
   */
  analyzeMatch(query: string, entry: DictionaryEntry): SemanticScore {
    const normalizedQuery = query.toLowerCase().trim();
    const normalizedEnglish = entry.english?.toLowerCase().trim() || '';
    const normalizedMeaning = entry.meaning?.toLowerCase().trim() || '';

    // 1. Primary Match Analysis - exact match with the english field
    const primaryMatch = this.calculatePrimaryMatch(normalizedQuery, normalizedEnglish);

    // 2. Position Score - where does the query appear in the meaning/definition
    const positionScore = this.calculatePositionScore(normalizedQuery, normalizedMeaning);

    // 3. Context Score - is this a direct translation or contextual usage
    const contextScore = this.calculateContextScore(normalizedQuery, normalizedMeaning, normalizedEnglish);

    // 4. Definition Structure Score - analyze the structure of the definition
    const definitionScore = this.calculateDefinitionScore(normalizedQuery, normalizedMeaning);

    // Calculate weighted total score
    const totalScore = (
      primaryMatch * 0.4 +      // 40% weight for exact english match
      positionScore * 0.25 +    // 25% weight for position in definition
      contextScore * 0.20 +     // 20% weight for context analysis
      definitionScore * 0.15    // 15% weight for definition structure
    );

    return {
      primaryMatch,
      positionScore,
      contextScore,
      definitionScore,
      totalScore
    };
  }

  private calculatePrimaryMatch(query: string, english: string): number {
    if (!query || !english) return 0;

    // Exact match
    if (english === query) return 1.0;

    // Word boundary exact match
    const queryWords = query.split(/\s+/);
    const englishWords = english.split(/\s+/);

    // If query is a single word and appears as a complete word in english
    if (queryWords.length === 1 && englishWords.includes(query)) {
      return 0.95;
    }

    // Starts with query followed by word boundary
    const startsWithPattern = new RegExp(`^${this.escapeRegex(query)}\\b`, 'i');
    if (startsWithPattern.test(english)) return 0.9;

    // Contains query as word boundary at start of phrase
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(query)}\\b`, 'i');
    if (wordBoundaryRegex.test(english)) {
      // Higher score if at the beginning
      if (english.toLowerCase().startsWith(query.toLowerCase())) {
        return 0.85;
      }
      return 0.7;
    }

    // Contains query
    if (english.includes(query)) return 0.4;

    return 0;
  }

  private calculatePositionScore(query: string, meaning: string): number {
    if (!query || !meaning) return 0;

    // Clean the meaning text
    const cleanMeaning = meaning.replace(/[()[\]]/g, '').trim();
    
    // Split by common separators to find primary vs secondary meanings
    const segments = cleanMeaning.split(/[;,]/).map(s => s.trim());
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const position = segment.toLowerCase().indexOf(query.toLowerCase());
      
      if (position !== -1) {
        // Found in this segment
        const segmentWeight = 1.0 - (i * 0.2); // First segment gets full weight, later segments get less
        
        // Position within the segment
        const segmentLength = segment.length;
        const positionWeight = position === 0 ? 1.0 : 
                              position < segmentLength * 0.25 ? 0.8 :
                              position < segmentLength * 0.5 ? 0.6 : 0.4;
        
        return Math.max(0.2, segmentWeight * positionWeight);
      }
    }

    return 0;
  }

  private calculateContextScore(query: string, meaning: string, english: string): number {
    if (!query || !meaning) return 0;

    const meaningLower = meaning.toLowerCase();
    const queryLower = query.toLowerCase();

    // First check if it starts with query (highest priority for direct translations)
    if (meaningLower.startsWith(queryLower + ',') || 
        meaningLower.startsWith(queryLower + ';') ||
        meaningLower.startsWith(queryLower + ' ') ||
        meaningLower === queryLower) {
      return 1.0;
    }

    // Check for "to [query]" pattern at the start
    if (meaningLower.startsWith(`to ${queryLower}`)) {
      return 1.0;
    }

    // Check for direct translation indicators (but penalize if in compound phrases)
    const directIndicators = [
      `${queryLower},`,
      `${queryLower};`,
      `${queryLower}.`,
      `, ${queryLower},`,
      `, ${queryLower};`,
      `, ${queryLower}.`
    ];

    for (const indicator of directIndicators) {
      if (meaningLower.includes(indicator)) {
        // If it's at the very beginning, it's a primary translation
        if (meaningLower.indexOf(indicator) === 0) {
          return 1.0;
        }
        // If it's in a list but not compound, still good
        return 0.9;
      }
    }

    // Penalize compound/contextual usage heavily
    const contextualPatterns = [
      `${queryLower} from`,
      `${queryLower} something`,
      `${queryLower} someone`,
      `${queryLower} (something|someone|from)`,
      `prevent.*${queryLower}`,
      `make.*${queryLower}`,
      `cause.*${queryLower}`,
      `${queryLower}.*from happening`,
      `to.*${queryLower}.*from`
    ];

    for (const pattern of contextualPatterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(meaningLower)) {
        return 0.3; // Much lower score for contextual usage
      }
    }

    // Word boundary check with position consideration
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(queryLower)}\\b`, 'i');
    if (wordBoundaryRegex.test(meaningLower)) {
      const position = meaningLower.search(wordBoundaryRegex);
      // Earlier position gets higher score
      if (position < 10) return 0.8;
      if (position < 20) return 0.7;
      return 0.6;
    }

    return 0.2;
  }

  private calculateDefinitionScore(query: string, meaning: string): number {
    if (!query || !meaning) return 0;

    const meaningLower = meaning.toLowerCase();
    const queryLower = query.toLowerCase();

    // Check if this appears to be a primary definition
    // Primary definitions usually start with the word or "to [word]"
    if (meaningLower.startsWith(queryLower + ',') || 
        meaningLower.startsWith(queryLower + ';') || 
        meaningLower.startsWith(queryLower + ' ') ||
        meaningLower === queryLower) {
      return 1.0;
    }

    if (meaningLower.startsWith(`to ${queryLower}`)) {
      return 1.0;
    }

    // Parse the first segment more carefully
    const firstSegment = meaningLower.split(/[;,]/)[0].trim();
    
    // Check if query is the main word in the first segment
    if (firstSegment === queryLower || 
        firstSegment === `to ${queryLower}` ||
        firstSegment.startsWith(`${queryLower} `)) {
      return 0.95;
    }

    // Check for definition structure patterns
    if (meaningLower.match(/^(to\s+)?\w+[;,]/)) {
      // This looks like a structured definition with primary meaning first
      const firstPart = meaningLower.split(/[;,]/)[0];
      if (firstPart.includes(queryLower)) {
        // Check if it's a word boundary match
        const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(queryLower)}\\b`, 'i');
        if (wordBoundaryRegex.test(firstPart)) {
          return 0.8;
        }
        return 0.6;
      }
    }

    // Check for variant notations like "(var. word)"
    const variantPattern = new RegExp(`\\(var\\.?\\s*${this.escapeRegex(queryLower)}\\)`, 'i');
    if (variantPattern.test(meaning)) {
      return 0.7;
    }

    // Check if query appears anywhere with word boundaries
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(queryLower)}\\b`, 'i');
    if (wordBoundaryRegex.test(meaningLower)) {
      return 0.4;
    }

    return 0.2;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get debug information about the scoring
   */
  getDebugInfo(query: string, entry: DictionaryEntry): string {
    const score = this.analyzeMatch(query, entry);
    return `
      Entry: ${entry.english} → ${entry.ibibio}
      Meaning: ${entry.meaning}
      Primary Match: ${score.primaryMatch.toFixed(2)}
      Position Score: ${score.positionScore.toFixed(2)}
      Context Score: ${score.contextScore.toFixed(2)}
      Definition Score: ${score.definitionScore.toFixed(2)}
      Total Score: ${score.totalScore.toFixed(2)}
    `.trim();
  }
}

export const semanticAnalyzer = new SemanticAnalyzer();
export type { SemanticScore };