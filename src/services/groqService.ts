import { GroqResponse } from '../types/dictionary';

class GroqService {
  private baseUrl = 'https://api.groq.com/openai/v1/chat/completions';

  getApiKey(): string | null {
    // First check environment variable (production)
    const envKey = import.meta.env.VITE_GROQ_API_KEY;
    if (envKey) {
      return envKey;
    }

    // Fallback to localStorage for development/testing
    const localKey = localStorage.getItem('groq-api-key');
    return localKey;
  }

  setApiKey(key: string) {
    // Only save to localStorage for development/testing purposes
    localStorage.setItem('groq-api-key', key);
    console.log('API key saved for development. For production, set VITE_GROQ_API_KEY environment variable.');
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
        cultural: parsed.cultural || null
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
      throw new Error('Groq API key not configured. Please set VITE_GROQ_API_KEY environment variable or configure it in the setup section.');
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
              content: 'You are an expert Ibibio language translator. Always respond with valid JSON only, no additional text.'
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

      const jsonText = this.extractJsonFromText(content);
      return this.validateAndParseJson(jsonText);
    } catch (error) {
      console.error('Groq API error:', error);
      throw new Error('Failed to get AI translation');
    }
  }
}

export const groqService = new GroqService();