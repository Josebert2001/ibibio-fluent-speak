import { DictionaryEntry } from '../types/dictionary';

interface DisambiguationRule {
  primaryTranslation: string;
  priority: number;
  context: string;
  usage: string;
  alternatives: Array<{
    translation: string;
    priority: number;
    context: string;
    usage: string;
  }>;
}

interface DisambiguationResult {
  primaryEntry: DictionaryEntry;
  alternatives: DictionaryEntry[];
  reasoning: string;
  confidence: number;
}

class DisambiguationService {
  private disambiguationRules: Record<string, DisambiguationRule> = {
    'stop': {
      primaryTranslation: 'tịre',
      priority: 1,
      context: 'to cease, end, finish an action',
      usage: 'most common usage for stopping an action',
      alternatives: [
        {
          translation: 'tịbe',
          priority: 2,
          context: 'to halt, prevent, block something from happening',
          usage: 'used when preventing or blocking'
        }
      ]
    },
    'big': {
      primaryTranslation: 'akpa',
      priority: 1,
      context: 'large in physical size or dimension',
      usage: 'primary meaning for physical size',
      alternatives: [
        {
          translation: 'eket',
          priority: 2,
          context: 'important, significant in status or influence',
          usage: 'used for abstract importance or social status'
        }
      ]
    },
    'good': {
      primaryTranslation: 'afiak',
      priority: 1,
      context: 'of high quality, pleasant, satisfactory',
      usage: 'general goodness, quality, positive attributes',
      alternatives: [
        {
          translation: 'emenere',
          priority: 2,
          context: 'morally good, righteous, virtuous',
          usage: 'specifically for moral or ethical goodness'
        }
      ]
    },
    'water': {
      primaryTranslation: 'mmong',
      priority: 1,
      context: 'clear liquid essential for life',
      usage: 'primary and only common translation',
      alternatives: []
    },
    'love': {
      primaryTranslation: 'uduak',
      priority: 1,
      context: 'deep affection, care, emotional attachment',
      usage: 'primary translation for all forms of love',
      alternatives: []
    },
    'hello': {
      primaryTranslation: 'nno',
      priority: 1,
      context: 'greeting used throughout the day',
      usage: 'standard greeting in Ibibio',
      alternatives: []
    },
    'god': {
      primaryTranslation: 'abasi',
      priority: 1,
      context: 'supreme deity, creator',
      usage: 'the supreme deity in Ibibio tradition',
      alternatives: []
    },
    'family': {
      primaryTranslation: 'ufok',
      priority: 1,
      context: 'family unit, household, relatives',
      usage: 'primary translation for family',
      alternatives: []
    },
    'food': {
      primaryTranslation: 'ndidia',
      priority: 1,
      context: 'nourishment, meal, sustenance',
      usage: 'primary translation for food',
      alternatives: []
    },
    'house': {
      primaryTranslation: 'ufok',
      priority: 1,
      context: 'dwelling, home, building',
      usage: 'primary translation for house/home',
      alternatives: []
    }
  };

  /**
   * Disambiguate between multiple dictionary entries for the same English word
   */
  disambiguate(englishWord: string, candidates: DictionaryEntry[]): DisambiguationResult | null {
    if (!candidates || candidates.length === 0) {
      return null;
    }

    // If only one candidate, return it
    if (candidates.length === 1) {
      return {
        primaryEntry: candidates[0],
        alternatives: [],
        reasoning: 'Single match found',
        confidence: 1.0
      };
    }

    const normalizedWord = englishWord.toLowerCase().trim();
    const rule = this.disambiguationRules[normalizedWord];

    if (!rule) {
      // No specific rule - return the first candidate
      console.log(`No disambiguation rule for "${englishWord}", returning first candidate`);
      return {
        primaryEntry: candidates[0],
        alternatives: candidates.slice(1),
        reasoning: 'No specific disambiguation rule available',
        confidence: 0.7
      };
    }

    console.log(`Applying disambiguation rule for "${englishWord}"`);

    // Find the primary translation based on the rule
    const primaryCandidate = candidates.find(entry => 
      entry.ibibio.toLowerCase().trim() === rule.primaryTranslation.toLowerCase()
    );

    if (!primaryCandidate) {
      console.warn(`Primary translation "${rule.primaryTranslation}" not found in candidates for "${englishWord}"`);
      return {
        primaryEntry: candidates[0],
        alternatives: candidates.slice(1),
        reasoning: `Primary translation "${rule.primaryTranslation}" not available in dictionary`,
        confidence: 0.6
      };
    }

    // Find alternative translations
    const alternatives = candidates.filter(entry => 
      entry.id !== primaryCandidate.id
    );

    // Sort alternatives based on rule priorities
    alternatives.sort((a, b) => {
      const aPriority = rule.alternatives.find(alt => 
        alt.translation.toLowerCase() === a.ibibio.toLowerCase()
      )?.priority || 999;
      
      const bPriority = rule.alternatives.find(alt => 
        alt.translation.toLowerCase() === b.ibibio.toLowerCase()
      )?.priority || 999;
      
      return aPriority - bPriority;
    });

    return {
      primaryEntry: primaryCandidate,
      alternatives,
      reasoning: `Primary meaning: ${rule.context}`,
      confidence: 0.95
    };
  }

  /**
   * Check if a word has disambiguation rules
   */
  hasDisambiguationRule(englishWord: string): boolean {
    const normalizedWord = englishWord.toLowerCase().trim();
    return this.disambiguationRules.hasOwnProperty(normalizedWord);
  }

  /**
   * Get disambiguation rule for a word
   */
  getDisambiguationRule(englishWord: string): DisambiguationRule | null {
    const normalizedWord = englishWord.toLowerCase().trim();
    return this.disambiguationRules[normalizedWord] || null;
  }

  /**
   * Add or update a disambiguation rule
   */
  addDisambiguationRule(englishWord: string, rule: DisambiguationRule): void {
    const normalizedWord = englishWord.toLowerCase().trim();
    this.disambiguationRules[normalizedWord] = rule;
    console.log(`Added disambiguation rule for "${englishWord}"`);
  }

  /**
   * Get all available disambiguation rules
   */
  getAllRules(): Record<string, DisambiguationRule> {
    return { ...this.disambiguationRules };
  }

  /**
   * Get statistics about disambiguation rules
   */
  getStats() {
    const totalRules = Object.keys(this.disambiguationRules).length;
    const rulesWithAlternatives = Object.values(this.disambiguationRules)
      .filter(rule => rule.alternatives.length > 0).length;
    
    return {
      totalRules,
      rulesWithAlternatives,
      rulesWithoutAlternatives: totalRules - rulesWithAlternatives,
      availableWords: Object.keys(this.disambiguationRules)
    };
  }
}

export const disambiguationService = new DisambiguationService();
export type { DisambiguationRule, DisambiguationResult };