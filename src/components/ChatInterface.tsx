import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Send, Volume2 } from 'lucide-react';
import ChatMessage from './ChatMessage';
import { ibibioModelService, type ChatMessage as Message } from '../services/ibibioModelService';
import { voiceService } from '../services/voiceService';
import { useToast } from '../hooks/use-toast';

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load chat history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('ibibio-chat-history');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ibibio-chat-history', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await ibibioModelService.chat(inputText, messages);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const speakText = (text: string) => {
    if (voiceService.isSupported()) {
      voiceService.speak(text, 'en-US');
    } else {
      toast({
        title: "Voice not supported",
        description: "Speech synthesis is not supported in your browser.",
        variant: "destructive",
      });
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('ibibio-chat-history');
    toast({
      title: "Chat cleared",
      description: "Your conversation history has been cleared.",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 shadow-sm">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ibibio Language Assistant</h1>
            <p className="text-muted-foreground">Practice and learn Ibibio with AI assistance</p>
          </div>
          <Button variant="outline" onClick={clearChat}>
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <Card className="p-6 text-center bg-card/50">
              <h3 className="text-lg font-semibold mb-2">Welcome to your Ibibio Learning Assistant!</h3>
              <p className="text-muted-foreground">
                Start a conversation to practice Ibibio. Ask for translations, cultural context, or practice conversations.
              </p>
            </Card>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className="group">
              <ChatMessage 
                message={message.text}
                isUser={message.isUser}
                timestamp={message.timestamp}
              />
              {!message.isUser && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => speakText(message.text)}
                >
                  <Volume2 className="h-4 w-4 mr-1" />
                  Speak
                </Button>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <Card className="p-4 bg-card animate-pulse">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-card border-t border-border p-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className="px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {!ibibioModelService.isConfigured() && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Ready for your fine-tuned Ibibio model integration
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;