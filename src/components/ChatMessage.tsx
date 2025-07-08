import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, Loader2, Copy, BookOpen, Globe, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

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
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  if (message.isTyping) {
    return (
      <div className="flex justify-start">
        <Card className="p-4 max-w-xs bg-gray-100 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Thinking...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-2xl space-y-3", isUser ? "w-full" : "w-full")}>
        {/* Main Message */}
        <Card className={cn(
          "p-4 relative group",
          isUser 
            ? "bg-blue-500 text-white border-blue-600" 
            : "bg-white border border-gray-200 shadow-sm"
        )}>
          <div className="space-y-3">
            {/* Message Content */}
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>

            {/* Message Actions */}
            <div className={cn(
              "flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity",
              isUser ? "text-blue-100" : "text-gray-500"
            )}>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(message.content)}
                  className={cn(
                    "h-6 px-2 text-xs",
                    isUser ? "hover:bg-blue-400 text-blue-100" : "hover:bg-gray-100"
                  )}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
              
              <div className={cn(
                "text-xs",
                isUser ? "text-blue-100" : "text-gray-400"
              )}>
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Translation Card */}
        {message.translation && (
          <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-l-purple-500 shadow-sm">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                  <Globe className="w-3 h-3 mr-1" />
                  Translation
                </Badge>
                {onPlayPronunciation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPlayPronunciation(message.translation!.ibibio)}
                    className="h-8 px-2 hover:bg-purple-100"
                  >
                    <Volume2 className="w-4 h-4 text-purple-600" />
                  </Button>
                )}
              </div>

              {/* Ibibio Translation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xl text-gray-800">
                    {message.translation.ibibio}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(message.translation!.ibibio)}
                    className="h-6 px-2 text-xs hover:bg-purple-100"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>Meaning:</strong> {message.translation.meaning}
                </div>
              </div>

              {/* Pronunciation */}
              {message.translation.pronunciation && (
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="text-sm">
                    <strong className="text-blue-700">Pronunciation:</strong>
                    <span className="ml-2 font-mono text-blue-800">
                      {message.translation.pronunciation}
                    </span>
                  </div>
                </div>
              )}

              {/* Cultural Context */}
              {message.translation.cultural && (
                <div className="p-3 bg-amber-50 rounded border border-amber-200">
                  <div className="flex items-start gap-2">
                    <Heart className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <strong className="text-amber-700">Cultural Note:</strong>
                      <p className="mt-1 text-amber-800 leading-relaxed">
                        {message.translation.cultural}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(`${message.translation!.ibibio} - ${message.translation!.meaning}`)}
                  className="h-7 px-3 text-xs bg-white hover:bg-purple-50 border-purple-200"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Translation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs bg-white hover:bg-purple-50 border-purple-200"
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  Learn More
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;