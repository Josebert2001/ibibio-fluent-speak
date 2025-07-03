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
      return 0.9;
    }

    // Starts with query
    if (english.startsWith(query)) return 0.8;

    // Contains query as word boundary
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(query)}\\b`, 'i');
    if (wordBoundaryRegex.test(english)) return 0.7;

    // Contains query
    if (english.includes(query)) return 0.5;

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

    // Check for direct translation indicators
    const directIndicators = [
      `to ${queryLower}`,
      `${queryLower} `,
      ` ${queryLower}`,
      `${queryLower};`,
      `${queryLower},`,
      `${queryLower}.`
    ];

    // Check if the query appears as a direct translation (not in a phrase)
    for (const indicator of directIndicators) {
      if (meaningLower.includes(indicator)) {
        return 1.0;
      }
    }

    // Check for compound/contextual usage
    const contextualPatterns = [
      `${queryLower} from`,
      `${queryLower} something`,
      `${queryLower} someone`,
      `to prevent.*${queryLower}`,
      `to make.*${queryLower}`,
      `cause.*${queryLower}`
    ];

    for (const pattern of contextualPatterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(meaningLower)) {
        return 0.6; // Lower score for contextual usage
      }
    }

    // Simple word boundary check
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(queryLower)}\\b`, 'i');
    if (wordBoundaryRegex.test(meaningLower)) {
      return 0.8;
    }

    return 0.4;
  }

  private calculateDefinitionScore(query: string, meaning: string): number {
    if (!query || !meaning) return 0;

    const meaningLower = meaning.toLowerCase();
    const queryLower = query.toLowerCase();

    // Check if this appears to be a primary definition
    // Primary definitions usually start with the word or "to [word]"
    if (meaningLower.startsWith(queryLower) || meaningLower.startsWith(`to ${queryLower}`)) {
      return 1.0;
    }

    // Check for definition structure patterns
    if (meaningLower.match(/^(to\s+)?\w+[;,]/)) {
      // This looks like a structured definition with primary meaning first
      const firstPart = meaningLower.split(/[;,]/)[0];
      if (firstPart.includes(queryLower)) {
        return 0.9;
      }
    }

    // Check for variant notations like "(var. word)"
    const variantPattern = new RegExp(`\\(var\\.?\\s*${this.escapeRegex(queryLower)}\\)`, 'i');
    if (variantPattern.test(meaning)) {
      return 0.7;
    }

    return 0.5;
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