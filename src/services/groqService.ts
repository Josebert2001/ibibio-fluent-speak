import { GroqResponse } from '../types/dictionary';

class GroqService {
  private baseUrl = 'https://api.groq.com/openai/v1/chat/completions';

  getApiKey(): string | null {
    // Use environment variable for production
    const envKey = import.meta.env.VITE_GROQ_API_KEY;
    if (envKey) {
      return envKey;
    }

    // No fallback to localStorage - environment variable only
    console.warn('VITE_GROQ_API_KEY environment variable not set. AI features will be disabled.');
    return null;
  }

  private extractJsonFromText(text: string): string {
    console.log('Raw response content:', text);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1];
    }

    const lines = text.split('\n');
    let jsonStart = -1;
    let jsonEnd = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('{') && jsonStart === -1) {
        jsonStart = i;
      }
      if (line.endsWith('}') && jsonStart !== -1) {
        jsonEnd = i;
        break;
      }
    }
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      return lines.slice(jsonStart, jsonEnd + 1).join('\n');
    }

    return text;
  }

  private validateAndParseJson(jsonText: string): GroqResponse {
    try {
      const parsed = JSON.parse(jsonText);
      
      return {
        ibibio: parsed.ibibio || '',
        meaning: parsed.meaning || '',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        examples: Array.isArray(parsed.examples) ? parsed.examples : [],
        cultural: parsed.cultural || null,
        alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : []
      };
    } catch (error) {
      console.error('JSON parsing failed:', error);
      console.error('Attempted to parse:', jsonText);
      throw new Error(`Invalid JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async translateWithAI(englishQuery: string): Promise<GroqResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Groq API key not configured. Please set VITE_GROQ_API_KEY environment variable.');
    }

    const prompt = `You are an expert English to Ibibio translator. Translate the following English word or phrase to Ibibio and provide detailed information including multiple alternative translations.

English: "${englishQuery}"

Please provide a JSON response with the following structure:
{
  "ibibio": "the primary Ibibio translation",
  "meaning": "detailed meaning in English",
  "confidence": 0.95,
  "examples": [
    {
      "english": "example sentence in English",
      "ibibio": "example sentence in Ibibio"
    }
  ],
  "cultural": "cultural context or notes (optional)",
  "alternatives": [
    {
      "ibibio": "alternative translation 1",
      "meaning": "meaning of alternative 1",
      "context": "when to use this alternative",
      "confidence": 0.85
    },
    {
      "ibibio": "alternative translation 2", 
      "meaning": "meaning of alternative 2",
      "context": "when to use this alternative",
      "confidence": 0.80
    }
  ]
}

Focus on providing multiple valid alternatives with different contexts, formality levels, or regional variations. Include confidence scores for each alternative.`;

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
              content: 'You are an expert Ibibio language translator with deep knowledge of regional variations, formality levels, and contextual usage. Always respond with valid JSON only, no additional text. Provide multiple alternative translations when possible.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.4, // Slightly higher for more creative alternatives
          max_tokens: 1500, // Increased for more alternatives
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from Groq API');
      }

      const jsonText = this.extractJsonFromText(content);
      return this.validateAndParseJson(jsonText);
    } catch (error) {
      console.error('Groq API error:', error);
      throw new Error('Failed to get AI translation');
    }
  }

  async getAlternativeTranslations(englishQuery: string, primaryTranslation: string): Promise<any[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Groq API key not configured');
    }

    const prompt = `Given the English word "${englishQuery}" with primary Ibibio translation "${primaryTranslation}", provide additional alternative translations with different contexts, formality levels, or regional variations.

Provide a JSON array of alternatives:
[
  {
    "ibibio": "alternative translation",
    "meaning": "specific meaning or nuance",
    "context": "when to use this (formal/informal/regional/etc)",
    "confidence": 0.85,
    "usage_notes": "additional usage information"
  }
]

Focus on providing 3-5 high-quality alternatives that offer different nuances or contexts.`;

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
              content: 'You are an expert in Ibibio language variations and contextual usage. Provide alternative translations as a JSON array only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        return [];
      }

      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const jsonString = jsonMatch ? jsonMatch[0] : content;
        return JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Failed to parse alternatives:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Alternative translations error:', error);
      return [];
    }
  }
}

export const groqService = new GroqService();