import { groqService } from './groqService';
import { langchainAgentService } from './langchainAgent';
import { dictionaryService } from './dictionaryService';
import { culturalKnowledgeBase } from './culturalKnowledgeBase';
import { enhancedMemoryService } from './enhancedMemoryService';

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
      // Initialize langchain agent if not already done
      await langchainAgentService.initialize();

      // Get or initialize conversation history
      if (!this.conversationHistory.has(sessionId)) {
        this.conversationHistory.set(sessionId, []);
      }
      
      const history = this.conversationHistory.get(sessionId)!;
      
      // Add user message to history
      history.push({ role: 'user', content: message });
      
      // Record topic discussion for memory service
      enhancedMemoryService.recordTopicDiscussion(this.extractTopic(message));
      
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
      'mean in ibibio', 'ibibio for', 'say in ibibio', 'how to say',
      'what\'s the ibibio word', 'ibibio word for', 'in ibibio'
    ];
    
    const lowerMessage = message.toLowerCase();
    return translationKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async handleTranslationRequest(message: string, history: Array<{role: string, content: string}>): Promise<ConversationResponse> {
    // Extract the word/phrase to translate
    const extractedQuery = this.extractTranslationQuery(message);
    
    console.log(`🔍 Translation request for: "${extractedQuery}"`);
    
    // STEP 1: Try local dictionary search FIRST (fastest and most reliable)
    console.log(`📚 Checking local dictionary for: "${extractedQuery}"`);
    const localResult = dictionaryService.search(extractedQuery);
    
    if (localResult) {
      console.log(`✅ Found in local dictionary: ${localResult.english} -> ${localResult.ibibio}`);
      
      const translation = {
        ibibio: localResult.ibibio,
        meaning: localResult.meaning,
        pronunciation: localResult.pronunciation,
        cultural: localResult.cultural
      };
      
      // Record word learned with high confidence (local dictionary is authoritative)
      enhancedMemoryService.recordWordLearned(extractedQuery, 0.95);
      
      const contextualContent = await this.generateContextualResponse(message, translation, history, 'local_dictionary');
      
      return {
        content: contextualContent,
        translation
      };
    }
    
    console.log(`❌ Not found in local dictionary, trying online search...`);
    
    // STEP 2: If not found locally, try intelligent online search
    // Try intelligent search first using langchain agent
    const searchResult = await langchainAgentService.searchWithAgent(extractedQuery);
    
    if (searchResult.result) {
      console.log(`✅ Found via online search: ${searchResult.result.english} -> ${searchResult.result.ibibio}`);
      
      const translation = {
        ibibio: searchResult.result.ibibio,
        meaning: searchResult.result.meaning,
        pronunciation: searchResult.result.pronunciation,
        cultural: searchResult.result.cultural
      };
      
      // Record word learned with online search confidence
      enhancedMemoryService.recordWordLearned(extractedQuery, searchResult.confidence);
      
      const contextualContent = await this.generateContextualResponse(message, translation, history, 'online_search');
      
      return {
        content: contextualContent,
        translation
      };
    }
    
    console.log(`❌ No translation found in any source for: "${extractedQuery}"`);
    
    // STEP 3: Final fallback response when no translation is found
    return {
      content: `I'd be happy to help you translate "${extractedQuery}" to Ibibio! However, I couldn't find a definitive translation in my current knowledge base. 

Let me search for related terms or try a different approach. Could you provide more context about how you plan to use this word? For example:
• Is it for a greeting or conversation?
• Are you looking for a formal or informal usage?
• Is there a specific situation where you'd use this word?

This will help me provide you with the most accurate and culturally appropriate translation! 🌟`
    };
  }

  private async handleGeneralConversation(message: string, history: Array<{role: string, content: string}>): Promise<ConversationResponse> {
    // Check for cultural knowledge first
    const culturalResponse = culturalKnowledgeBase.getCulturalInfo(message);
    if (culturalResponse) {
      // Record cultural concept discussion
      enhancedMemoryService.recordCulturalConcept(this.extractTopic(message), 0.8);
      
      return { 
        content: culturalResponse + "\n\nWould you like to know more about any specific aspect of this topic?" 
      };
    }
    
    // Use Groq for conversational AI if available
    const apiKey = groqService.getApiKey();
    if (apiKey) {
      try {
        const conversationalPrompt = this.buildConversationalPrompt(message, history);
        
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
                content: this.getSystemPrompt()
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
          const content = data.choices[0]?.message?.content || this.getFallbackResponse(message);
          return { content };
        }
      } catch (error) {
        console.error('Groq conversational AI error:', error);
      }
    }
    
    // Fallback response
    return {
      content: this.getFallbackResponse(message)
    };
  }

  private buildConversationalPrompt(message: string, history: Array<{role: string, content: string}>): string {
    const userProfile = enhancedMemoryService.getUserProfile();
    const recentHistory = history.slice(-6);
    
    return `You are an expert Ibibio language and culture assistant having a friendly conversation with a learner.

User Profile:
- Learning Level: ${userProfile.learningLevel}
- Words Learned: ${userProfile.totalWordsLearned}
- Streak Days: ${userProfile.streakDays}
- Preferred Topics: ${userProfile.preferredTopics.join(', ') || 'General'}

Recent Conversation:
${recentHistory.map(h => `${h.role}: ${h.content}`).join('\n')}

Current Message: ${message}

Please respond in a conversational, helpful manner. If the user asks about:
- Ibibio language: Provide clear explanations with examples
- Ibibio culture: Share interesting cultural insights and context
- Language learning: Give practical tips and encouragement
- General questions: Be helpful and redirect to language/culture topics when appropriate

Keep responses natural, engaging, and educational. Use emojis sparingly but appropriately. Always encourage continued learning and cultural exploration.`;
  }

  private getSystemPrompt(): string {
    return `You are a friendly, knowledgeable Ibibio language and culture assistant. Your role is to:

1. Help users learn Ibibio language through translations, explanations, and cultural context
2. Share insights about Ibibio culture, traditions, and customs
3. Provide encouragement and support for language learners
4. Make learning engaging and culturally enriching

Guidelines:
- Be warm, encouraging, and culturally sensitive
- Provide accurate information about Ibibio language and culture
- Use examples and context to make learning memorable
- Encourage questions and curiosity about Ibibio heritage
- Keep responses conversational and accessible
- Include cultural context when relevant
- Support learners at all levels with patience and enthusiasm`;
  }

  private extractTranslationQuery(message: string): string {
    // Enhanced extraction patterns
    const patterns = [
      /how do you say ["']([^"']+)["']/i,
      /translate ["']([^"']+)["']/i,
      /what is ["']([^"']+)["'] in ibibio/i,
      /ibibio for ["']([^"']+)["']/i,
      /say ["']([^"']+)["'] in ibibio/i,
      /what's the ibibio word for ["']([^"']+)["']/i,
      /ibibio word for ["']([^"']+)["']/i,
      /translate:?\s*(.+)/i,
      /how to say (.+) in ibibio/i,
      /what does (.+) mean in ibibio/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Fallback: clean up the message
    return message
      .replace(/^(how do you say|translate|what is|what does|ibibio for|say|what's the ibibio word for)/i, '')
      .replace(/(in ibibio|to ibibio)$/i, '')
      .trim();
  }

  private extractTopic(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Topic extraction based on keywords
    const topicKeywords = {
      'greetings': ['hello', 'hi', 'greeting', 'good morning', 'good evening'],
      'family': ['family', 'mother', 'father', 'parent', 'child', 'brother', 'sister'],
      'food': ['food', 'eat', 'drink', 'meal', 'hungry', 'cooking'],
      'culture': ['culture', 'tradition', 'custom', 'ceremony', 'festival'],
      'religion': ['god', 'pray', 'church', 'spirit', 'worship', 'faith'],
      'emotions': ['love', 'happy', 'sad', 'angry', 'feel', 'emotion'],
      'actions': ['go', 'come', 'walk', 'run', 'stop', 'work', 'play'],
      'nature': ['water', 'tree', 'animal', 'sun', 'moon', 'rain']
    };
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return topic;
      }
    }
    
    return 'general';
  }

  private async generateContextualResponse(
    originalQuery: string, 
    translation: any, 
    history: Array<{role: string, content: string}>,
    source: string = 'unknown'
  ): Promise<string> {
    const examples = translation.examples || [];
    const cultural = translation.cultural || '';
    
    // Add source information to build user confidence
    let response = '';
    
    if (source === 'local_dictionary') {
      response = `Great question! I found this in our verified Ibibio dictionary:`;
    } else if (source === 'online_search') {
      response = `Great question! I found this through our AI-powered search:`;
    } else {
      response = `Great question! Here's the Ibibio translation:`;
    }
    
    if (cultural) {
      response += `\n\n💡 **Cultural Context:**\n${cultural}`;
    }
    
    if (examples.length > 0) {
      response += `\n\n📝 **Usage Examples:**`;
      examples.slice(0, 2).forEach((example: any, index: number) => {
        response += `\n${index + 1}. "${example.english}" → "${example.ibibio}"`;
      });
    }
    
    // Add learning encouragement
    const userProfile = enhancedMemoryService.getUserProfile();
    if (userProfile.totalWordsLearned > 0 && userProfile.totalWordsLearned % 10 === 0) {
      response += `\n\n🎉 Congratulations! You've now learned ${userProfile.totalWordsLearned} Ibibio words! Keep up the excellent work!`;
    }
    
    // Add source attribution for transparency
    if (source === 'local_dictionary') {
      response += `\n\n📚 *Source: Verified Local Dictionary*`;
    }
    
    response += `\n\nWould you like to know more about this word, learn related terms, or explore other aspects of Ibibio language and culture?`;
    
    return response;
  }

  private getFallbackResponse(message: string): string {
    const responses = [
      "That's an interesting question! While I specialize in Ibibio language and culture, I'm here to help you learn. Feel free to ask me about Ibibio translations, cultural practices, or language learning tips! 🌟",
      
      "I'd love to help you with that! My expertise is in Ibibio language and culture. Would you like to learn some Ibibio words related to your question, or explore Ibibio cultural traditions? 📚",
      
      "Great question! Let me help you explore this through the lens of Ibibio language and culture. Would you like to know how to express this concept in Ibibio, or learn about related cultural practices? 🎯",
      
      "I'm here to help you discover the beautiful Ibibio language and culture! While I focus on these areas, I can help you learn relevant Ibibio vocabulary or cultural insights related to your question. What would you like to explore? ✨"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  clearConversation(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }
}

export const conversationalAI = new ConversationalAI();