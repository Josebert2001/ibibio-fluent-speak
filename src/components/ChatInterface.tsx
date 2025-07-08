import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Volume2, Mic, Settings, BookOpen, Target } from 'lucide-react';
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
  const [showVoicePanel, setShowVoicePanel] = useState(false);
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
  const { toast } = useToast();

  useEffect(() => {
    initializeChat();
    initializeVoiceService();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    "How do you say 'good morning' in Ibibio?",
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
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-6xl mx-auto gap-4">
      {/* Learning Progress and Daily Challenge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LearningProgressBar stats={learningStats} />
        </div>
        <div>
          {dailyChallenge && (
            <DailyChallengeCard
              challenge={dailyChallenge}
              onComplete={handleChallengeComplete}
              onPlayPronunciation={handlePlayPronunciation}
            />
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 gap-4">
        {/* Chat Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white rounded-lg border">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onPlayPronunciation={handlePlayPronunciation}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Follow-up Suggestions */}
          {followUpSuggestions.length > 0 && (
            <div className="p-4 border-t bg-gray-50 rounded-b-lg">
              <QuickReplyButtons
                suggestions={followUpSuggestions}
                onReplyClick={handleQuickReply}
              />
            </div>
          )}

          {/* Quick Actions for New Users */}
          {messages.length === 1 && (
            <div className="p-4 border-t bg-blue-50 rounded-b-lg">
              <div className="text-sm text-blue-700 mb-3 font-medium">
                <BookOpen className="w-4 h-4 inline mr-2" />
                Try asking:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {conversationStarters.map((starter, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(starter)}
                    className="text-xs justify-start h-auto py-2 px-3 text-left whitespace-normal"
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
              <div className="flex-1">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about Ibibio language and culture..."
                  className="min-h-[60px] resize-none"
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="h-[60px] px-4"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowVoicePanel(!showVoicePanel)}
                  className="h-[60px] px-4"
                  title="Voice Controls"
                >
                  {isListening ? (
                    <Mic className="w-4 h-4 text-red-500" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Voice Control Panel */}
        {showVoicePanel && (
          <div className="w-80">
            <VoiceControlPanel
              isListening={isListening}
              onStartListening={handleStartListening}
              onStopListening={handleStopListening}
              onVoiceSettings={handleVoiceSettings}
              currentSettings={voiceSettings}
              supportedCommands={supportedCommands}
              lastTranscript={lastTranscript}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;