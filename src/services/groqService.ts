
import { GroqResponse } from '../types/dictionary';

class GroqService {
  private baseUrl = 'https://api.groq.com/openai/v1/chat/completions';

  getApiKey(): string | null {
    const envKey = import.meta.env.VITE_GROQ_API_KEY;
    if (envKey) {
      return envKey;
    }

    console.warn('VITE_GROQ_API_KEY environment variable not set. Groq-dependent features will be disabled.');
    return null;
  }

  /**
   * Enhanced AI validation function - validates web-scraped results instead of generating translations
   */
  async validateTranslation(englishQuery: string, candidateTranslation: string, sources: string[]): Promise<{
    isValid: boolean;
    confidence: number;
    reasoning: string;
    culturalNotes?: string;
    alternatives?: string[];
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Groq API key not configured. Please set VITE_GROQ_API_KEY environment variable.');
    }

    const prompt = `You are an expert in Ibibio language validation. Your task is to validate whether a proposed translation is accurate, not to generate new translations.

English word/phrase: "${englishQuery}"
Proposed Ibibio translation: "${candidateTranslation}"
Sources: ${sources.join(', ')}

Please validate this translation and provide your assessment in JSON format:

{
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation of why this translation is or isn't valid",
  "culturalNotes": "any cultural context about usage",
  "linguisticNotes": "linguistic analysis of the translation",
  "alternatives": ["alternative1", "alternative2"] (only if the proposed translation is invalid)
}

Focus on:
1. Linguistic accuracy and proper Ibibio grammar
2. Cultural appropriateness and context
3. Common usage patterns
4. Potential regional variations

Be conservative in your validation - only mark as valid if you're confident.`;

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are an expert Ibibio language validator. Your role is to validate existing translations, not create new ones. Respond only with valid JSON containing your validation assessment.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        return {
          isValid: false,
          confidence: 0,
          reasoning: 'No validation response received'
        };
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          isValid: false,
          confidence: 0,
          reasoning: 'Invalid validation response format'
        };
      }

      const result = JSON.parse(jsonMatch[0]);
      
      return {
        isValid: result.isValid || false,
        confidence: result.confidence || 0,
        reasoning: result.reasoning || 'No reasoning provided',
        culturalNotes: result.culturalNotes,
        alternatives: result.alternatives || []
      };

    } catch (error) {
      console.error('Groq validation error:', error);
      throw new Error('Failed to validate translation with AI');
    }
  }

  /**
   * Legacy translation function - now used only as fallback when no other sources are available
   */
  async translateWithAI(englishQuery: string): Promise<GroqResponse | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Groq API key not configured. Please set VITE_GROQ_API_KEY environment variable.');
    }

    const prompt = `FALLBACK TRANSLATION - Use only when no other sources available.

Translate "${englishQuery}" from English to Ibibio.

Provide a JSON response with this exact structure:
{
  "ibibio": "the Ibibio translation",
  "meaning": "clear English definition",
  "confidence": 0.60,
  "examples": [
    {"english": "example sentence", "ibibio": "ibibio translation"}
  ],
  "cultural": "cultural context if relevant",
  "note": "This is a fallback AI translation - verify with native speakers"
}

IMPORTANT: Mark confidence as 0.60 maximum since this is AI-generated without validation.
If you cannot find a reliable translation, return:
{
  "ibibio": "",
  "meaning": "",
  "confidence": 0
}`;

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant providing FALLBACK English to Ibibio translations. This should only be used when no other sources are available. Always include a note about verification. Return only valid JSON responses.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 400,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        return null;
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const result = JSON.parse(jsonMatch[0]);
      
      if (!result.ibibio || !result.meaning || result.confidence === 0) {
        return null;
      }

      return {
        ibibio: result.ibibio,
        meaning: result.meaning,
        confidence: Math.min(result.confidence, 0.6), // Cap at 60% for AI fallback
        examples: result.examples || [],
        cultural: result.cultural || result.note || 'AI-generated fallback translation - verify with native speakers'
      };

    } catch (error) {
      console.error('Groq AI fallback translation error:', error);
      throw new Error('Failed to get AI fallback translation');
    }
  }

  /**
   * Analyze multiple translation candidates and provide linguistic insights
   */
  async analyzeCandidates(englishQuery: string, candidates: Array<{translation: string, source: string}>): Promise<{
    analysis: string;
    recommendation: string;
    confidence: number;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Groq API key not configured');
    }

    const candidatesList = candidates.map((c, i) => `${i + 1}. "${c.translation}" (from ${c.source})`).join('\n');

    const prompt = `Analyze these Ibibio translation candidates for the English word/phrase: "${englishQuery}"

Candidates:
${candidatesList}

Provide analysis in JSON format:
{
  "analysis": "linguistic analysis of each candidate",
  "recommendation": "which candidate is most accurate and why",
  "confidence": 0.0-1.0,
  "linguisticNotes": "technical linguistic observations"
}

Consider: grammar, phonetic patterns, cultural usage, regional variations.`;

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are an expert Ibibio linguistic analyst. Analyze translation candidates and provide recommendations based on linguistic accuracy.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        return {
          analysis: 'No analysis available',
          recommendation: 'Unable to analyze candidates',
          confidence: 0
        };
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          analysis: content,
          recommendation: 'See analysis above',
          confidence: 0.5
        };
      }

      const result = JSON.parse(jsonMatch[0]);
      
      return {
        analysis: result.analysis || 'No detailed analysis provided',
        recommendation: result.recommendation || 'No specific recommendation',
        confidence: result.confidence || 0.5
      };

    } catch (error) {
      console.error('Groq candidate analysis error:', error);
      return {
        analysis: 'Analysis failed',
        recommendation: 'Unable to analyze candidates due to error',
        confidence: 0
      };
    }
  }
}

export const groqService = new GroqService();
