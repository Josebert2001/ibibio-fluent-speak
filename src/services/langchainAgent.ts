
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
  createComprehensiveSearchTool,
  createDisambiguationTool,
  createContextAnalyzerTool,
  createValidationTool
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
        console.warn('Groq API key not available. Langchain agent will be disabled.');
        this.initializationFailed = true;
        return;
      }

      // Use Groq API with optimized settings for intelligent coordination
      const llm = new ChatOpenAI({
        modelName: 'llama3-8b-8192',
        temperature: 0.1, // Low temperature for consistent, focused responses
        openAIApiKey: apiKey,
        configuration: {
          baseURL: 'https://api.groq.com/openai/v1'
        }
      });

      const prompt = await pull<any>('hwchase17/react');

      // Create intelligent tool suite with strategic ordering
      const tools = [
        createHuggingFaceBackendTool(),
        createLocalDictionaryTool(),
        createDisambiguationTool(),
        createContextAnalyzerTool(),
        createValidationTool(),
        createCulturalContextTool(),
        createPronunciationTool(),
        createExampleSentenceTool(),
        createGlosbeSearchTool(),
        createComprehensiveSearchTool()
      ];

      const agentRunnable = await createReactAgent({
        llm,
        tools,
        prompt,
      });

      this.agent = new AgentExecutor({
        agent: agentRunnable,
        tools,
        verbose: false,
        maxIterations: 4, // Optimized for intelligent coordination
      });

      this.isInitialized = true;
      console.log('Enhanced Langchain agent initialized with intelligent coordination system');
    } catch (error) {
      console.error('Failed to initialize Langchain agent:', error);
      this.initializationFailed = true;
    }
  }

  async searchWithAgent(query: string): Promise<{
    result: DictionaryEntry | null;
    source: string;
    confidence: number;
  }> {
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
      // Enhanced intelligent prompt with Ibibio linguistic knowledge
      const prompt = `You are an expert English-to-Ibibio translation coordinator with deep knowledge of Ibibio language patterns and cultural context.

TRANSLATION QUERY: "${query}"

LINGUISTIC INTELLIGENCE RULES:
1. Ibibio is a tonal language from southeastern Nigeria with complex semantic relationships
2. Many English words have multiple Ibibio translations depending on context:
   - "stop" → "tịre" (cease/end) vs "tịbe" (halt/prevent)
   - "big" → "akpa" (size) vs "eket" (importance)
   - "good" → "afiak" (quality) vs "emenere" (moral goodness)
3. Direct translations are preferred over contextual usage
4. Cultural context affects translation choices

SEARCH STRATEGY (Execute in this order):
1. Use huggingface_backend_search for AI-powered multi-source analysis
2. Use local_dictionary_search for verified direct translations
3. If multiple options exist, use disambiguation_tool to choose the best translation
4. Use context_analyzer_tool to understand query intent
5. Use validation_tool to cross-check results
6. Only use other tools if needed for cultural context or examples

RESPONSE REQUIREMENTS:
- Provide ONLY valid JSON in this exact format:
{
  "ibibio": "primary_translation",
  "meaning": "clear_definition",
  "confidence": 0.95,
  "source": "primary_source",
  "reasoning": "why_this_translation_was_chosen",
  "alternatives": ["alt1", "alt2"],
  "cultural_note": "relevant_cultural_context"
}

Focus on accuracy and cultural appropriateness. Prioritize direct translations over compound phrases.`;

      const result = await this.agent.invoke({
        input: prompt
      });

      const agentOutput = result.output;
      console.log('Intelligent agent output:', agentOutput);

      // Enhanced JSON parsing with better error handling
      const parsedResult = this.parseAgentResponse(agentOutput);
      
      if (parsedResult && parsedResult.ibibio && parsedResult.meaning) {
        const entry: DictionaryEntry = {
          id: `langchain-intelligent-${Date.now()}`,
          english: query,
          ibibio: parsedResult.ibibio,
          meaning: parsedResult.meaning,
          partOfSpeech: 'unknown',
          examples: parsedResult.examples || [],
          cultural: parsedResult.cultural_note || 'Translation verified with AI and cultural context',
          pronunciation: parsedResult.pronunciation
        };

        const confidence = parsedResult.confidence || 0.85;

        // Cache the intelligent result
        cacheService.set(query, entry, 'langchain-intelligent');

        return {
          result: entry,
          source: 'langchain-intelligent',
          confidence
        };
      }

      return {
        result: null,
        source: 'langchain-intelligent',
        confidence: 0
      };
    } catch (error) {
      console.error('Intelligent Langchain agent search error:', error);
      return {
        result: null,
        source: 'langchain-error',
        confidence: 0
      };
    }
  }

  private parseAgentResponse(output: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback to regex parsing for structured data
      const ibibioMatch = output.match(/(?:ibibio|translation)["']?\s*:\s*["']([^"']+)["']/i);
      const meaningMatch = output.match(/(?:meaning|definition)["']?\s*:\s*["']([^"']+)["']/i);
      const confidenceMatch = output.match(/(?:confidence)["']?\s*:\s*([\d.]+)/i);
      const reasoningMatch = output.match(/(?:reasoning)["']?\s*:\s*["']([^"']+)["']/i);

      if (ibibioMatch && meaningMatch) {
        return {
          ibibio: ibibioMatch[1].trim(),
          meaning: meaningMatch[1].trim(),
          confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.8,
          reasoning: reasoningMatch ? reasoningMatch[1].trim() : 'Parsed from agent response'
        };
      }

      return null;
    } catch (parseError) {
      console.error('Failed to parse agent response:', parseError);
      return null;
    }
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      initializationFailed: this.initializationFailed,
      toolsAvailable: this.isInitialized ? 10 : 0,
      cacheStats: cacheService.getStats(),
      intelligentMode: true
    };
  }

  isAvailable(): boolean {
    return this.isInitialized && !this.initializationFailed;
  }
}

export const langchainAgentService = new LangchainAgentService();
