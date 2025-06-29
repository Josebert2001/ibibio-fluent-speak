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
    console.warn('VITE_GROQ_API_KEY environment variable not set. Groq-dependent features will be disabled.');
    return null;
  }

  async translateWithAI(englishQuery: string): Promise<GroqResponse | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Groq API key not configured. Please set VITE_GROQ_API_KEY environment variable.');
    }

    const prompt = `Translate "${englishQuery}" from English to Ibibio.

Provide a JSON response with this exact structure:
{
  "ibibio": "the Ibibio translation",
  "meaning": "clear English definition",
  "confidence": 0.85,
  "examples": [
    {"english": "example sentence", "ibibio": "ibibio translation"}
  ],
  "cultural": "cultural context if relevant"
}

If you cannot find a reliable translation, return:
{
  "ibibio": "",
  "meaning": "",
  "confidence": 0
}

Focus on accuracy and cultural appropriateness.`;

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
              content: 'You are a helpful assistant that provides accurate English to Ibibio translations. Return only valid JSON responses with accurate translations.'
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

      // Extract JSON from response
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
        confidence: result.confidence,
        examples: result.examples || [],
        cultural: result.cultural
      };

    } catch (error) {
      console.error('Groq AI translation error:', error);
      throw new Error('Failed to get AI translation');
    }
  }
}

export const groqService = new GroqService();