import { groqService } from './groqService';
import { langchainAgentService } from './langchainAgent';
import { dictionaryService } from './dictionaryService';
import { culturalKnowledgeBase } from './culturalKnowledgeBase';

interface ConversationResponse {
  content: string;
  translation?: {
    ibibio: string;
    meaning: string;
    pronunciation?: string;
    cultural?: string;
  };
}

class ConversationalAI {
  private conversationHistory: Map<string, Array<{role: string, content: string}>> = new Map();

  async processMessage(message: string, sessionId: string): Promise<ConversationResponse> {
    try {
      // Get or initialize conversation history
      if (!this.conversationHistory.has(sessionId)) {
        this.conversationHistory.set(sessionId, []);
      }
      
      const history = this.conversationHistory.get(sessionId)!;
      
      // Add user message to history
      history.push({ role: 'user', content: message });
      
      // Determine if this is a translation request
      const isTranslationRequest = this.isTranslationRequest(message);
      
      let response: ConversationResponse;
      
      if (isTranslationRequest) {
        response = await this.handleTranslationRequest(message, history);
      } else {
        response = await this.handleGeneralConversation(message, history);
      }
      
      // Add AI response to history
      history.push({ role: 'assistant', content: response.content });
      
      // Keep only last 10 exchanges to manage context
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }
      
      return response;
    } catch (error) {
      console.error('Conversational AI error:', error);
      return {
        content: "I apologize, but I'm having trouble processing your request right now. Please try again or rephrase your question."
      };
    }
  }

  private isTranslationRequest(message: string): boolean {
    const translationKeywords = [
      'translate', 'translation', 'how do you say', 'what is', 'what does',
      'mean in ibibio', 'ibibio for', 'say in ibibio', 'how to say'
    ];
    
    const lowerMessage = message.toLowerCase();
    return translationKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async handleTranslationRequest(message: string, history: Array<{role: string, content: string}>): Promise<ConversationResponse> {
    // Extract the word/phrase to translate
    const extractedQuery = this.extractTranslationQuery(message);
    
    // Try intelligent search first
    const searchResult = await langchainAgentService.searchWithAgent(extractedQuery);
    
    if (searchResult.result) {
      const translation = {
        ibibio: searchResult.result.ibibio,
        meaning: searchResult.result.meaning,
        pronunciation: searchResult.result.pronunciation,
        cultural: searchResult.result.cultural
      };
      
      const contextualContent = await this.generateContextualResponse(message, translation, history);
      
      return {
        content: contextualContent,
        translation
      };
    }
    
    // Fallback to conversational response
    return {
      content: `I'd be happy to help you translate "${extractedQuery}" to Ibibio! However, I couldn't find a definitive translation in my current knowledge base. Let me search for related terms or try a different approach. Could you provide more context about how you plan to use this word?`
    };
  }

  private async handleGeneralConversation(message: string, history: Array<{role: string, content: string}>): Promise<ConversationResponse> {
    // Check for cultural knowledge
    const culturalResponse = culturalKnowledgeBase.getCulturalInfo(message);
    if (culturalResponse) {
      return { content: culturalResponse };
    }
    
    // Use Groq for conversational AI
    const conversationalPrompt = `You are an expert Ibibio language and culture assistant. You're having a friendly conversation with someone learning about Ibibio language and culture.

Conversation history:
${history.slice(-6).map(h => `${h.role}: ${h.content}`).join('\n')}

Current message: ${message}

Please respond in a conversational, helpful manner. If the user asks about:
- Ibibio language: Provide clear explanations and examples
- Ibibio culture: Share interesting cultural insights
- Language learning: Give practical tips and encouragement
- General questions: Be helpful and redirect to language/culture topics when appropriate

Keep responses natural, engaging, and educational. Use emojis sparingly but appropriately.`;

    try {
      const apiKey = groqService.getApiKey();
      if (!apiKey) {
        return {
          content: "I'm sorry, but I need to be configured properly to have conversations. However, I can still help with basic translations and cultural information!"
        };
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
              content: 'You are a friendly, knowledgeable Ibibio language and culture assistant. Provide helpful, conversational responses that educate and engage users about Ibibio language and culture.'
            },
            {
              role: 'user',
              content: conversationalPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content || "I'm here to help with Ibibio language and culture questions!";
        return { content };
      }
    } catch (error) {
      console.error('Conversational AI error:', error);
    }
    
    // Fallback response
    return {
      content: "That's an interesting question! While I specialize in Ibibio language and culture, I'm here to help you learn. Feel free to ask me about Ibibio translations, cultural practices, or language learning tips! 🌟"
    };
  }

  private extractTranslationQuery(message: string): string {
    // Simple extraction logic - can be enhanced
    const patterns = [
      /how do you say ["']([^"']+)["']/i,
      /translate ["']([^"']+)["']/i,
      /what is ["']([^"']+)["'] in ibibio/i,
      /ibibio for ["']([^"']+)["']/i,
      /say ["']([^"']+)["'] in ibibio/i,
      /translate:?\s*(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Fallback: return the whole message cleaned up
    return message.replace(/^(how do you say|translate|what is|what does)/i, '').trim();
  }

  private async generateContextualResponse(
    originalQuery: string, 
    translation: any, 
    history: Array<{role: string, content: string}>
  ): Promise<string> {
    const examples = translation.examples || [];
    const cultural = translation.cultural || '';
    
    let response = `Great question! The Ibibio translation for your query is shown above.`;
    
    if (cultural) {
      response += `\n\n${cultural}`;
    }
    
    if (examples.length > 0) {
      response += `\n\nHere are some examples of how to use it:`;
      examples.slice(0, 2).forEach((example: any, index: number) => {
        response += `\n${index + 1}. "${example.english}" → "${example.ibibio}"`;
      });
    }
    
    response += `\n\nWould you like to know more about this word, or do you have other questions about Ibibio language and culture?`;
    
    return response;
  }

  clearConversation(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }
}

export const conversationalAI = new ConversationalAI();
