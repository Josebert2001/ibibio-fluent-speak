
import { SourceResult } from './multiSourceSearchService';

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reasoning: string[];
  flags: string[];
  recommendations: string[];
}

interface CrossValidationReport {
  query: string;
  sourceResults: SourceResult[];
  validationResult: ValidationResult;
  consensusAnalysis: {
    agreementLevel: number;
    majorityTranslation: string | null;
    conflictingTranslations: string[];
    sourceReliabilityScores: { [source: string]: number };
  };
  finalRecommendation: {
    recommendedTranslation: string;
    confidence: number;
    reasoning: string;
  };
}

class ValidationEngine {
  private sourceReliabilityScores = {
    'local_dictionary': 0.95,
    'enhanced_backend_local': 0.90,
    'enhanced_backend_ai': 0.80,
    'enhanced_backend_web': 0.75,
    'web_glosbe': 0.70,
    'web_wiktionary': 0.85,
    'ai_groq': 0.65
  };

  private linguisticPatterns = {
    // Common Ibibio linguistic patterns for validation
    vowelHarmony: /^[aeiou]*$|^[aeioụọịẹ]*$/i,
    commonPrefixes: ['a', 'e', 'i', 'o', 'u', 'ke', 'se', 'me'],
    commonSuffixes: ['o', 'e', 'a', 'ke', 'mi'],
    suspiciousPatterns: [
      /^[A-Z]+$/, // All caps (likely not Ibibio)
      /\d/, // Contains numbers
      /[!@#$%^&*()]/,  // Special characters
      /^(the|and|or|but|in|on|at|to|for|of|with|by)$/i // English words
    ]
  };

  validateTranslation(query: string, sourceResults: SourceResult[]): CrossValidationReport {
    console.log(`Starting validation for query: "${query}" with ${sourceResults.length} source results`);

    const validationResult = this.performValidation(sourceResults);
    const consensusAnalysis = this.analyzeConsensus(sourceResults);
    const finalRecommendation = this.generateFinalRecommendation(query, sourceResults, consensusAnalysis);

    return {
      query,
      sourceResults,
      validationResult,
      consensusAnalysis,
      finalRecommendation
    };
  }

  private performValidation(sourceResults: SourceResult[]): ValidationResult {
    const reasoning: string[] = [];
    const flags: string[] = [];
    const recommendations: string[] = [];

    const foundResults = sourceResults.filter(r => r.found && r.translation);
    
    if (foundResults.length === 0) {
      return {
        isValid: false,
        confidence: 0,
        reasoning: ['No valid translations found from any source'],
        flags: ['NO_RESULTS'],
        recommendations: ['Try a different query or check spelling']
      };
    }

    // Check for linguistic validity
    let linguisticScore = 0;
    foundResults.forEach(result => {
      const translation = result.translation;
      const linguisticCheck = this.validateLinguisticPatterns(translation);
      
      if (linguisticCheck.isValid) {
        linguisticScore += result.confidence * 0.01;
        reasoning.push(`"${translation}" passes linguistic validation (${result.source})`);
      } else {
        flags.push(`LINGUISTIC_ISSUE: ${translation} - ${linguisticCheck.issues.join(', ')}`);
        reasoning.push(`"${translation}" has linguistic concerns: ${linguisticCheck.issues.join(', ')}`);
      }
    });

    // Check for source diversity
    const uniqueSources = new Set(foundResults.map(r => r.source.split('_')[0]));
    const sourceDiversityScore = Math.min(uniqueSources.size * 20, 100);
    
    if (uniqueSources.size >= 3) {
      reasoning.push(`Good source diversity: ${uniqueSources.size} different source types`);
    } else if (uniqueSources.size === 2) {
      reasoning.push(`Moderate source diversity: ${uniqueSources.size} different source types`);
      recommendations.push('Consider additional sources for higher confidence');
    } else {
      flags.push('LIMITED_SOURCE_DIVERSITY');
      reasoning.push(`Limited source diversity: only ${uniqueSources.size} source type(s)`);
      recommendations.push('Results from single source type - consider with caution');
    }

    // Check for confidence consistency
    const confidenceValues = foundResults.map(r => r.confidence);
    const avgConfidence = confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length;
    const confidenceVariance = this.calculateVariance(confidenceValues);
    
    if (confidenceVariance < 100) {
      reasoning.push(`Consistent confidence levels across sources (variance: ${confidenceVariance.toFixed(1)})`);
    } else {
      flags.push('HIGH_CONFIDENCE_VARIANCE');
      reasoning.push(`High confidence variance across sources (${confidenceVariance.toFixed(1)})`);
      recommendations.push('Review individual source reliability');
    }

    // Overall validation score
    const overallConfidence = Math.min(
      (linguisticScore / foundResults.length) * 40 + // 40% weight for linguistic validity
      sourceDiversityScore * 0.3 + // 30% weight for source diversity
      avgConfidence * 0.3, // 30% weight for average confidence
      100
    );

    const isValid = overallConfidence >= 50 && flags.filter(f => f.startsWith('LINGUISTIC_ISSUE')).length === 0;

    if (!isValid) {
      recommendations.push('Consider manual verification of this translation');
    }

    return {
      isValid,
      confidence: overallConfidence,
      reasoning,
      flags,
      recommendations
    };
  }

  private validateLinguisticPatterns(translation: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for suspicious patterns
    for (const pattern of this.linguisticPatterns.suspiciousPatterns) {
      if (pattern.test(translation)) {
        issues.push('Contains suspicious characters or patterns');
        break;
      }
    }

    // Check length
    if (translation.length < 2) {
      issues.push('Translation too short');
    } else if (translation.length > 50) {
      issues.push('Translation unusually long');
    }

    // Check for reasonable character composition
    const hasValidChars = /^[a-zụọịẹ\s'-]+$/i.test(translation);
    if (!hasValidChars) {
      issues.push('Contains invalid characters for Ibibio');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  private analyzeConsensus(sourceResults: SourceResult[]): {
    agreementLevel: number;
    majorityTranslation: string | null;
    conflictingTranslations: string[];
    sourceReliabilityScores: { [source: string]: number };
  } {
    const foundResults = sourceResults.filter(r => r.found && r.translation);
    
    if (foundResults.length === 0) {
      return {
        agreementLevel: 0,
        majorityTranslation: null,
        conflictingTranslations: [],
        sourceReliabilityScores: {}
      };
    }

    // Group similar translations (case-insensitive, trimmed)
    const translationGroups: { [key: string]: SourceResult[] } = {};
    
    foundResults.forEach(result => {
      const normalizedTranslation = result.translation.toLowerCase().trim();
      if (!translationGroups[normalizedTranslation]) {
        translationGroups[normalizedTranslation] = [];
      }
      translationGroups[normalizedTranslation].push(result);
    });

    // Calculate weighted agreement
    const weightedGroups = Object.entries(translationGroups).map(([translation, sources]) => {
      const totalWeight = sources.reduce((sum, source) => {
        const reliability = this.sourceReliabilityScores[source.source] || 0.5;
        return sum + (source.confidence * reliability);
      }, 0);
      
      return {
        translation,
        sources,
        totalWeight,
        sourceCount: sources.length
      };
    }).sort((a, b) => b.totalWeight - a.totalWeight);

    const majorityGroup = weightedGroups[0];
    const totalWeight = weightedGroups.reduce((sum, group) => sum + group.totalWeight, 0);
    const agreementLevel = totalWeight > 0 ? (majorityGroup.totalWeight / totalWeight) * 100 : 0;

    const conflictingTranslations = weightedGroups.slice(1).map(group => group.translation);

    // Calculate source reliability scores based on agreement with majority
    const sourceReliabilityScores: { [source: string]: number } = {};
    foundResults.forEach(result => {
      const isInMajority = majorityGroup.sources.some(s => s.source === result.source);
      const baseReliability = this.sourceReliabilityScores[result.source] || 0.5;
      const agreementBonus = isInMajority ? 0.1 : -0.1;
      sourceReliabilityScores[result.source] = Math.max(0, Math.min(1, baseReliability + agreementBonus));
    });

    return {
      agreementLevel,
      majorityTranslation: majorityGroup.translation,
      conflictingTranslations,
      sourceReliabilityScores
    };
  }

  private generateFinalRecommendation(
    query: string,
    sourceResults: SourceResult[],
    consensusAnalysis: any
  ): { recommendedTranslation: string; confidence: number; reasoning: string } {
    
    if (!consensusAnalysis.majorityTranslation) {
      return {
        recommendedTranslation: '',
        confidence: 0,
        reasoning: 'No valid translation found from any source'
      };
    }

    const foundResults = sourceResults.filter(r => r.found && r.translation);
    const avgConfidence = foundResults.reduce((sum, r) => sum + r.confidence, 0) / foundResults.length;
    
    // Adjust confidence based on consensus
    const consensusAdjustment = consensusAnalysis.agreementLevel * 0.2; // Up to 20% bonus for high agreement
    const sourceCountBonus = Math.min(foundResults.length * 5, 15); // Up to 15% bonus for multiple sources
    
    const finalConfidence = Math.min(avgConfidence + consensusAdjustment + sourceCountBonus, 100);

    let reasoning = '';
    if (consensusAnalysis.agreementLevel >= 80) {
      reasoning = `High consensus (${consensusAnalysis.agreementLevel.toFixed(1)}%) across ${foundResults.length} sources`;
    } else if (consensusAnalysis.agreementLevel >= 60) {
      reasoning = `Moderate consensus (${consensusAnalysis.agreementLevel.toFixed(1)}%) with some conflicting results`;
    } else {
      reasoning = `Low consensus (${consensusAnalysis.agreementLevel.toFixed(1)}%) - results vary significantly across sources`;
    }

    if (consensusAnalysis.conflictingTranslations.length > 0) {
      reasoning += `. Alternative translations found: ${consensusAnalysis.conflictingTranslations.join(', ')}`;
    }

    return {
      recommendedTranslation: consensusAnalysis.majorityTranslation,
      confidence: finalConfidence,
      reasoning
    };
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  updateSourceReliability(source: string, performance: number): void {
    if (this.sourceReliabilityScores[source] !== undefined) {
      // Exponential moving average for reliability updates
      const alpha = 0.1;
      this.sourceReliabilityScores[source] = 
        (1 - alpha) * this.sourceReliabilityScores[source] + alpha * performance;
    }
  }

  getReliabilityScores(): { [source: string]: number } {
    return { ...this.sourceReliabilityScores };
  }
}

export const validationEngine = new ValidationEngine();
export type { ValidationResult, CrossValidationReport };
