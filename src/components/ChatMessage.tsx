
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: {
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
  };
  onPlayPronunciation?: (text: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onPlayPronunciation }) => {
  const isUser = message.sender === 'user';

  if (message.isTyping) {
    return (
      <div className="flex justify-start">
        <Card className="p-4 max-w-xs bg-gray-100">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-gray-600">Thinking...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <Card className={cn(
        "p-4 max-w-2xl",
        isUser 
          ? "bg-blue-500 text-white" 
          : "bg-white border border-gray-200"
      )}>
        <div className="space-y-3">
          {/* Main content */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>

          {/* Translation card */}
          {message.translation && (
            <Card className="p-3 bg-gray-50 border-l-4 border-l-blue-500">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-lg text-gray-800">
                    {message.translation.ibibio}
                  </div>
                  {onPlayPronunciation && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPlayPronunciation(message.translation!.ibibio)}
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>Meaning:</strong> {message.translation.meaning}
                </div>

                {message.translation.pronunciation && (
                  <div className="text-sm text-gray-600">
                    <strong>Pronunciation:</strong> {message.translation.pronunciation}
                  </div>
                )}

                {message.translation.cultural && (
                  <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                    <strong>Cultural Note:</strong> {message.translation.cultural}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Timestamp */}
          <div className={cn(
            "text-xs opacity-70",
            isUser ? "text-right" : "text-left"
          )}>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChatMessage;
