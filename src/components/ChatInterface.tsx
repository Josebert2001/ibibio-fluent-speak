
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Volume2, Mic } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ChatMessage from './ChatMessage';
import QuickReplyButtons from './QuickReplyButtons';
import LearningProgressBar from './LearningProgressBar';
import DailyChallengeCard from './DailyChallengeCard';
import VoiceControlPanel from './VoiceControlPanel';
import { conversationalAI } from '../services/conversationalAI';
import { chatSessionManager } from '../services/chatSessionManager';
import { voiceService } from '../services/voiceService';
import { enhancedMemoryService } from '../services/enhancedMemoryService';
import { learningPathService } from '../services/learningPathService';
import { enhancedVoiceService } from '../services/enhancedVoiceService';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isTyping?: boolean;
  translation?: {
    ibibio: string;
    meaning: string;
    pronunciation?: string;
    cultural?: string;
  };
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [followUpSuggestions, setFollowUpSuggestions] = useState<any[]>([]);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize chat session
    const initializeChat = async () => {
      const newSessionId = chatSessionManager.createSession();
      setSessionId(newSessionId);
      
      // Update daily streak
      enhancedMemoryService.updateDailyStreak();
      
      // Load daily challenge
      const challenge = learningPathService.generateDailyChallenge();
      setDailyChallenge(challenge);
      
      // Add welcome message with personalization
      const userProfile = enhancedMemoryService.getUserProfile();
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        content: `Nno! Welcome back to your Ibibio learning journey! 🌟

${userProfile.streakDays > 0 ? `Great job on your ${userProfile.streakDays}-day streak! 🔥` : ''}
You've learned ${userProfile.totalWordsLearned} words so far.

I can help you with:
• Translations and pronunciation
• Cultural insights and traditions  
• Structured learning paths
• Daily challenges and practice

What would you like to explore today?`,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
      
      // Generate initial suggestions
      const suggestions = enhancedMemoryService.generateFollowUpSuggestions('welcome', '');
      setFollowUpSuggestions(suggestions);
    };

    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: ChatMessage = {
      id: 'typing',
      content: '',
      sender: 'ai',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const response = await conversationalAI.processMessage(input.trim(), sessionId);
      
      // Remove typing indicator and add actual response
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => msg.id !== 'typing');
        const aiMessage: ChatMessage = {
          id: Date.now().toString(),
          content: response.content,
          sender: 'ai',
          timestamp: new Date(),
          translation: response.translation
        };
        return [...withoutTyping, aiMessage];
      });

      // Save conversation to session
      chatSessionManager.addMessage(sessionId, userMessage);
      chatSessionManager.addMessage(sessionId, {
        ...userMessage,
        id: Date.now().toString(),
        content: response.content,
        sender: 'ai'
      });

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePlayPronunciation = (text: string) => {
    voiceService.speak(text);
  };

  const conversationStarters = [
    "How do you say 'good morning' in Ibibio?",
    "Tell me about Ibibio culture",
    "What are common Ibibio greetings?",
    "Translate: I love my family"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onPlayPronunciation={handlePlayPronunciation}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="p-4 border-t">
          <div className="text-sm text-gray-600 mb-2">Try asking:</div>
          <div className="flex flex-wrap gap-2">
            {conversationStarters.map((starter, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInput(starter)}
                className="text-xs"
              >
                {starter}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <Card className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about Ibibio language and culture..."
            className="flex-1 min-h-[60px] resize-none"
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="self-end"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ChatInterface;
