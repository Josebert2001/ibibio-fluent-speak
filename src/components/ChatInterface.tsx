import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Volume2, Mic, Settings, BookOpen, Target, Sparkles, Menu } from 'lucide-react';
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

interface VoiceSettings {
  rate: number;
  pitch: number;
  volume: number;
  voiceIndex: number;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [followUpSuggestions, setFollowUpSuggestions] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);
  const [lastTranscript, setLastTranscript] = useState('');
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    rate: 0.8,
    pitch: 1.0,
    volume: 1.0,
    voiceIndex: 0
  });
  const [learningStats, setLearningStats] = useState({
    totalWordsLearned: 0,
    streakDays: 0,
    currentPath: undefined,
    pathProgress: 0,
    dailyChallengesCompleted: 0,
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    experiencePoints: 0,
    nextLevelXP: 100
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeChat();
    initializeVoiceService();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const initializeChat = async () => {
    const newSessionId = chatSessionManager.createSession();
    setSessionId(newSessionId);
    
    // Update daily streak
    enhancedMemoryService.updateDailyStreak();
    
    // Load daily challenge
    const challenge = learningPathService.generateDailyChallenge();
    setDailyChallenge(challenge);
    
    // Load user profile and update learning stats
    const userProfile = enhancedMemoryService.getUserProfile();
    setLearningStats({
      totalWordsLearned: userProfile.totalWordsLearned,
      streakDays: userProfile.streakDays,
      currentPath: undefined,
      pathProgress: 0,
      dailyChallengesCompleted: userProfile.dailyChallengesCompleted,
      level: userProfile.learningLevel,
      experiencePoints: userProfile.totalWordsLearned * 10,
      nextLevelXP: 100 + (userProfile.totalWordsLearned * 5)
    });
    
    // Add welcome message with personalization
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      content: `Nno! Welcome to Ibi-Voice, your Ibibio language learning assistant! 🌟

${userProfile.streakDays > 0 ? `🔥 Amazing! You're on a ${userProfile.streakDays}-day learning streak!` : ''}
${userProfile.totalWordsLearned > 0 ? `📚 You've learned ${userProfile.totalWordsLearned} Ibibio words so far.` : ''}

I'm here to help you:
• **Translate** English words and phrases to Ibibio
• **Learn** about Ibibio culture and traditions
• **Practice** pronunciation and conversation
• **Explore** the rich heritage of the Ibibio people

What would you like to learn today?`,
      sender: 'ai',
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
    
    // Generate initial suggestions
    const suggestions = enhancedMemoryService.generateFollowUpSuggestions('welcome', '');
    setFollowUpSuggestions(suggestions);
  };

  const initializeVoiceService = () => {
    if (enhancedVoiceService.isRecognitionSupported()) {
      enhancedVoiceService.setOnTranscript((result) => {
        setLastTranscript(result.transcript);
        if (result.isFinal) {
          setInput(result.transcript);
        }
      });

      enhancedVoiceService.setOnVoiceCommand((command, params) => {
        handleVoiceCommand(command, params);
      });
    }
  };

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
    const currentInput = input.trim();
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
      const response = await conversationalAI.processMessage(currentInput, sessionId);
      
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

      // Update learning progress if translation was provided
      if (response.translation) {
        enhancedMemoryService.recordWordLearned(currentInput);
        const updatedProfile = enhancedMemoryService.getUserProfile();
        setLearningStats(prev => ({
          ...prev,
          totalWordsLearned: updatedProfile.totalWordsLearned,
          experiencePoints: updatedProfile.totalWordsLearned * 10
        }));
      }

      // Generate follow-up suggestions
      const suggestions = enhancedMemoryService.generateFollowUpSuggestions(currentInput, response.content);
      setFollowUpSuggestions(suggestions);

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
    enhancedVoiceService.speak(text, 'en-US', {
      rate: voiceSettings.rate,
      pitch: voiceSettings.pitch,
      volume: voiceSettings.volume
    });
  };

  const handleQuickReply = (text: string) => {
    setInput(text);
    // Focus textarea after setting input
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleVoiceCommand = (command: string, params?: string[]) => {
    switch (command) {
      case 'translate':
        if (params && params[0]) {
          setInput(`Translate: ${params[0]}`);
          handleSend();
        }
        break;
      case 'cultural_info':
        if (params && params[0]) {
          setInput(`Tell me about ${params[0]}`);
          handleSend();
        }
        break;
      case 'repeat_last':
        // This is handled by the voice service directly
        break;
      default:
        console.log('Unknown voice command:', command);
    }
  };

  const handleStartListening = async () => {
    try {
      await enhancedVoiceService.startListening();
      setIsListening(true);
      toast({
        title: "Listening",
        description: "Speak now... I'm listening for your question.",
      });
    } catch (error) {
      toast({
        title: "Voice Error",
        description: "Could not start voice recognition. Please check your microphone.",
        variant: "destructive"
      });
    }
  };

  const handleStopListening = () => {
    enhancedVoiceService.stopListening();
    setIsListening(false);
  };

  const handleVoiceSettings = (settings: Partial<VoiceSettings>) => {
    setVoiceSettings(prev => ({ ...prev, ...settings }));
  };

  const handleChallengeComplete = (challengeId: string, answer?: string) => {
    learningPathService.completeDailyChallenge(challengeId);
    setDailyChallenge(prev => prev ? { ...prev, completed: true, userAnswer: answer } : null);
    
    // Update learning stats
    const updatedProfile = enhancedMemoryService.getUserProfile();
    setLearningStats(prev => ({
      ...prev,
      dailyChallengesCompleted: updatedProfile.dailyChallengesCompleted + 1,
      experiencePoints: prev.experiencePoints + (dailyChallenge?.reward || 10)
    }));

    toast({
      title: "Challenge Complete!",
      description: `You earned ${dailyChallenge?.reward || 10} XP! Keep up the great work!`,
    });
  };

  const conversationStarters = [
    "How do you say 'hello' in Ibibio?",
    "Tell me about Ibibio culture",
    "What are common Ibibio greetings?",
    "Translate: I love my family",
    "How do you pronounce 'abasi'?",
    "What is the significance of family in Ibibio culture?"
  ];

  const supportedCommands = [
    "translate [word]",
    "tell me about [topic]",
    "how do you say [phrase]",
    "repeat that",
    "slower",
    "faster"
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Ibi-Voice</h1>
                <p className="text-xs text-gray-600">Ibibio Learning Assistant</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(false)}
              className="lg:hidden"
            >
              ×
            </Button>
          </div>

          {/* Learning Progress */}
          <div className="p-4 border-b border-gray-200">
            <LearningProgressBar stats={learningStats} compact />
          </div>

          {/* Daily Challenge */}
          <div className="p-4 border-b border-gray-200">
            {dailyChallenge && (
              <DailyChallengeCard
                challenge={dailyChallenge}
                onComplete={handleChallengeComplete}
                onPlayPronunciation={handlePlayPronunciation}
                className="text-sm"
              />
            )}
          </div>

          {/* Voice Controls */}
          <div className="flex-1 p-4">
            <VoiceControlPanel
              isListening={isListening}
              onStartListening={handleStartListening}
              onStopListening={handleStopListening}
              onVoiceSettings={handleVoiceSettings}
              currentSettings={voiceSettings}
              supportedCommands={supportedCommands}
              lastTranscript={lastTranscript}
              className="h-full"
            />
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(true)}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Ibibio Language Assistant</h2>
              <p className="text-sm text-gray-600">Ask me anything about Ibibio language and culture</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartListening}
              className={isListening ? "text-red-600" : ""}
            >
              <Mic className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 space-y-6">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onPlayPronunciation={handlePlayPronunciation}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Follow-up Suggestions */}
        {followUpSuggestions.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 pb-2">
            <QuickReplyButtons
              suggestions={followUpSuggestions}
              onReplyClick={handleQuickReply}
            />
          </div>
        )}

        {/* Quick Actions for New Users */}
        {messages.length === 1 && (
          <div className="max-w-4xl mx-auto px-4 pb-4">
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="text-sm text-blue-700 mb-3 font-medium flex items-center">
                <BookOpen className="w-4 h-4 mr-2" />
                Try these conversation starters:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {conversationStarters.map((starter, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickReply(starter)}
                    className="text-xs justify-start h-auto py-2 px-3 text-left whitespace-normal bg-white hover:bg-blue-50 border-blue-300"
                  >
                    {starter}
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-4xl mx-auto p-4">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message Ibi-Voice..."
                  className="min-h-[50px] max-h-[120px] resize-none pr-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  rows={1}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span>{input.length}/2000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface;