import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { pull } from 'langchain/hub';
import { createGlosbeSearchTool } from './glosbeSearchTool';
import { 
  createCulturalContextTool, 
  createPronunciationTool, 
  createExampleSentenceTool,
  createComprehensiveSearchTool 
} from './langchainTools';
import { groqService } from './groqService';
import { DictionaryEntry } from '../types/dictionary';
import { cacheService } from './cacheService';

class LangchainAgentService {
  private agent: AgentExecutor | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const apiKey = groqService.getApiKey();
      if (!apiKey) {
        throw new Error('Groq API key not available');
      }

      // Use Groq API with OpenAI-compatible endpoint
      const llm = new ChatOpenAI({
        modelName: 'llama3-8b-8192',
        temperature: 0.1,
        openAIApiKey: apiKey,
        configuration: {
          baseURL: 'https://api.groq.com/openai/v1'
        }
      });

      // Get the prompt template
      const prompt = await pull<any>('hwchase17/react');

      // Create enhanced tools array
      const tools = [
        createGlosbeSearchTool(),
        createCulturalContextTool(),
        createPronunciationTool(),
        createExampleSentenceTool(),
        createComprehensiveSearchTool()
      ];

      // Create the agent
      const agentRunnable = await createReactAgent({
        llm,
        tools,
        prompt,
      });

      this.agent = new AgentExecutor({
        agent: agentRunnable,
        tools,
        verbose: false,
        maxIterations: 5,
      });

      this.isInitialized = true;
      console.log('Enhanced Langchain agent initialized successfully with', tools.length, 'tools');
    } catch (error) {
      console.error('Failed to initialize Langchain agent:', error);
      throw error;
    }
  }

  async searchWithAgent(query: string): Promise<{
    result: DictionaryEntry | null;
    source: string;
    confidence: number;
  }> {
    // Check cache first
    const cached = cacheService.get(query);
    if (cached) {
      console.log('Found cached result for:', query);
      return {
        result: cached,
        source: 'cache',
        confidence: 0.9
      };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.agent) {
      throw new Error('Agent not initialized');
    }

    try {
      const prompt = `You are an expert English to Ibibio translator. For the English word or phrase "${query}", please:

1. Use the comprehensive_search tool to find the primary Ibibio translation
2. Use the cultural_context tool to get cultural background information
3. Use the pronunciation_guide tool to get the phonetic pronunciation
4. Use the example_sentences tool to generate example sentences

After gathering all information, provide your final answer as a valid JSON object with this exact structure:
{
  "ibibio": "the primary Ibibio translation",
  "meaning": "detailed meaning and definition in English",
  "confidence": 0.95,
  "examples": [
    {
      "english": "example sentence in English",
      "ibibio": "example sentence in Ibibio"
    }
  ],
  "cultural": "cultural context and background information",
  "pronunciation": "phonetic pronunciation guide"
}

Make sure to return ONLY the JSON object as your final answer, no additional text.`;

      const result = await this.agent.invoke({
        input: prompt
      });

      // Parse the agent's response as JSON
      const agentOutput = result.output;
      console.log('Agent output:', agentOutput);

      try {
        // Try to extract JSON from the response
        const jsonMatch = agentOutput.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : agentOutput;
        
        const parsedResult = JSON.parse(jsonString);

        if (parsedResult.ibibio && parsedResult.meaning) {
          const entry: DictionaryEntry = {
            id: `langchain-enhanced-${Date.now()}`,
            english: query,
            ibibio: parsedResult.ibibio,
            meaning: parsedResult.meaning,
            partOfSpeech: 'unknown',
            examples: parsedResult.examples || [],
            cultural: parsedResult.cultural || 'Translation enhanced with AI and cultural context',
            pronunciation: parsedResult.pronunciation
          };

          const confidence = parsedResult.confidence || 0.8;

          // Cache the enriched result
          cacheService.set(query, entry, 'langchain-enhanced');

          return {
            result: entry,
            source: 'langchain-enhanced',
            confidence
          };
        }
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        
        // Fallback to regex parsing
        const ibibioMatch = agentOutput.match(/(?:ibibio|translation)["']?\s*:\s*["']([^"']+)["']/i);
        const meaningMatch = agentOutput.match(/(?:meaning|definition)["']?\s*:\s*["']([^"']+)["']/i);
        const culturalMatch = agentOutput.match(/(?:cultural|context)["']?\s*:\s*["']([^"']+)["']/i);
        const pronunciationMatch = agentOutput.match(/(?:pronunciation|phonetic)["']?\s*:\s*["']([^"']+)["']/i);

        if (ibibioMatch && meaningMatch) {
          const entry: DictionaryEntry = {
            id: `langchain-fallback-${Date.now()}`,
            english: query,
            ibibio: ibibioMatch[1].trim(),
            meaning: meaningMatch[1].trim(),
            partOfSpeech: 'unknown',
            examples: [],
            cultural: culturalMatch ? culturalMatch[1].trim() : 'Translation found via enhanced web search',
            pronunciation: pronunciationMatch ? pronunciationMatch[1].trim() : undefined
          };

          // Cache the result
          cacheService.set(query, entry, 'langchain-fallback');

          return {
            result: entry,
            source: 'langchain-fallback',
            confidence: 0.7
          };
        }
      }

      return {
        result: null,
        source: 'langchain-enhanced',
        confidence: 0
      };
    } catch (error) {
      console.error('Enhanced Langchain agent search error:', error);
      throw error;
    }
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      toolsAvailable: this.isInitialized ? 5 : 0,
      cacheStats: cacheService.getStats()
    };
  }
}

export const langchainAgentService = new LangchainAgentService();