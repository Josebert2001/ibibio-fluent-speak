
import { GroqResponse } from '../types/dictionary';

class GroqService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.groq.com/openai/v1/chat/completions';

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('groq-api-key', key);
  }

  getApiKey(): string | null {
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem('groq-api-key');
    }
    return this.apiKey;
  }

  async translateWithAI(englishQuery: string): Promise<GroqResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Groq API key not set');
    }

    const prompt = `You are an expert English to Ibibio translator. Translate the following English word or phrase to Ibibio and provide detailed information.

English: "${englishQuery}"

Please provide a JSON response with the following structure:
{
  "ibibio": "the Ibibio translation",
  "meaning": "detailed meaning in English",
  "confidence": 0.95,
  "examples": [
    {
      "english": "example sentence in English",
      "ibibio": "example sentence in Ibibio"
    }
  ],
  "cultural": "cultural context or notes (optional)"
}

Focus on accuracy and cultural appropriateness. If you're not confident about the translation, indicate it in the confidence score.`;

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
              content: 'You are an expert Ibibio language translator. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
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

      // Parse the JSON response
      const parsed = JSON.parse(content);
      return {
        ibibio: parsed.ibibio || '',
        meaning: parsed.meaning || '',
        confidence: parsed.confidence || 0.5,
        examples: parsed.examples || [],
        cultural: parsed.cultural || null
      };
    } catch (error) {
      console.error('Groq API error:', error);
      throw new Error('Failed to get AI translation');
    }
  }
}

export const groqService = new GroqService();
