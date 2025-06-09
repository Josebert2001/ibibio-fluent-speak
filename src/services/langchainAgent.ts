
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { pull } from 'langchain/hub';
import { createGlosbeSearchTool } from './glosbeSearchTool';
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
        temperature: 0.3,
        openAIApiKey: apiKey,
        configuration: {
          baseURL: 'https://api.groq.com/openai/v1'
        }
      });

      // Get the prompt template
      const prompt = await pull<any>('hwchase17/react');

      // Create tools
      const tools = [createGlosbeSearchTool()];

      // Create the agent
      const agentRunnable = await createReactAgent({
        llm,
        tools,
        prompt,
      });

      this.agent = new AgentExecutor({
        agent: agentRunnable,
        tools,
        verbose: true,
        maxIterations: 3,
      });

      this.isInitialized = true;
      console.log('Langchain agent initialized successfully');
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
      const prompt = `Find the Ibibio translation for the English word or phrase: "${query}". 
      Use the glosbe_search tool to find accurate translations. 
      Return the result in this format:
      - Ibibio translation: [translation]
      - Meaning: [detailed meaning]
      - Confidence: [0.0-1.0]`;

      const result = await this.agent.invoke({
        input: prompt
      });

      // Parse the agent's response
      const agentOutput = result.output;
      console.log('Agent output:', agentOutput);

      // Extract information from agent response
      const ibibioMatch = agentOutput.match(/Ibibio translation:\s*(.+)/i);
      const meaningMatch = agentOutput.match(/Meaning:\s*(.+)/i);
      const confidenceMatch = agentOutput.match(/Confidence:\s*([\d.]+)/i);

      if (ibibioMatch && meaningMatch) {
        const entry: DictionaryEntry = {
          id: `langchain-${Date.now()}`,
          english: query,
          ibibio: ibibioMatch[1].trim(),
          meaning: meaningMatch[1].trim(),
          partOfSpeech: 'unknown',
          examples: [],
          cultural: 'Translation found via web search'
        };

        const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7;

        // Cache the result
        cacheService.set(query, entry, 'langchain-web');

        return {
          result: entry,
          source: 'langchain-web',
          confidence
        };
      }

      return {
        result: null,
        source: 'langchain-web',
        confidence: 0
      };
    } catch (error) {
      console.error('Langchain agent search error:', error);
      throw error;
    }
  }
}

export const langchainAgentService = new LangchainAgentService();
