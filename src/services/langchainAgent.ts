import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { pull } from 'langchain/hub';
import { createGlosbeSearchTool } from './glosbeSearchTool';
import { 
  createCulturalContextTool, 
  createPronunciationTool, 
  createExampleSentenceTool,
  createHuggingFaceBackendTool,
  createLocalDictionaryTool,
  createComprehensiveSearchTool 
} from './langchainTools';
import { groqService } from './groqService';
import { DictionaryEntry } from '../types/dictionary';
import { cacheService } from './cacheService';

class LangchainAgentService {
  private agent: AgentExecutor | null = null;
  private isInitialized = false;
  private initializationFailed = false;

  async initialize(): Promise<void> {
    if (this.isInitialized || this.initializationFailed) return;

    try {
      const apiKey = groqService.getApiKey();
      if (!apiKey) {
        console.warn('Groq API key not available. Langchain agent will be disabled. Online search features will not be available.');
        this.initializationFailed = true;
        return; // Don't throw error, just mark as failed and continue
      }

      // Use Groq API with OpenAI-compatible endpoint - optimized settings
      const llm = new ChatOpenAI({
        modelName: 'llama3-8b-8192',
        temperature: 0.05, // Reduced for faster, more consistent responses
        openAIApiKey: apiKey,
        configuration: {
          baseURL: 'https://api.groq.com/openai/v1'
        }
      });

      // Get the prompt template
      const prompt = await pull<any>('hwchase17/react');

      // Create enhanced tools array - prioritize Hugging Face backend
      const tools = [
        createHuggingFaceBackendTool(),
        createLocalDictionaryTool(),
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
        maxIterations: 3, // Reduced from 5 for faster responses
      });

      this.isInitialized = true;
      console.log('Enhanced Langchain agent initialized successfully with', tools.length, 'tools - prioritizing Hugging Face backend');
    } catch (error) {
      console.error('Failed to initialize Langchain agent:', error);
      this.initializationFailed = true;
      // Don't throw error - just mark as failed and continue without agent
    }
  }

  async searchWithAgent(query: string): Promise<{
    result: DictionaryEntry | null;
    source: string;
    confidence: number;
  }> {
    // Check if agent is available
    if (this.initializationFailed || !this.isInitialized) {
      console.warn('Langchain agent not available. Skipping agent search.');
      return {
        result: null,
        source: 'agent_unavailable',
        confidence: 0
      };
    }

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

    if (!this.agent) {
      console.warn('Agent not initialized. Skipping agent search.');
      return {
        result: null,
        source: 'agent_not_initialized',
        confidence: 0
      };
    }

    try {
      // Enhanced prompt for intelligent coordination
      const prompt = `You are an intelligent coordinator for English to Ibibio translation. Your task is to find the most accurate translation for "${query}".

SEARCH STRATEGY:
1. First, use huggingface_backend_search tool - this accesses a multi-source backend with AI, local dictionary, and web search
2. If backend unavailable, use local_dictionary_search tool for direct translations
3. For context disambiguation (like "stop" → "tịre" vs "tịbe"), prioritize direct translations over contextual usage

RESPONSE FORMAT (JSON only):
{
  "ibibio": "primary_translation",
  "meaning": "clear definition", 
  "confidence": 0.95,
  "source": "primary_source_used",
  "reasoning": "why this translation was chosen"
}

Focus on accuracy. For ambiguous words, choose the most common/direct translation.`;

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
      return {
        result: null,
        source: 'langchain-error',
        confidence: 0
      };
    }
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      initializationFailed: this.initializationFailed,
      toolsAvailable: this.isInitialized ? 5 : 0,
      cacheStats: cacheService.getStats()
    };
  }

  isAvailable(): boolean {
    return this.isInitialized && !this.initializationFailed;
  }
}

export const langchainAgentService = new LangchainAgentService();