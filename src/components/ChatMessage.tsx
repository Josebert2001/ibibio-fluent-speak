import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Copy, User, Bot } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../hooks/use-toast';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser, timestamp }) => {
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  return (
    <div className={cn("flex items-start space-x-3", isUser && "flex-row-reverse space-x-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser 
          ? "bg-primary" 
          : "bg-secondary"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-secondary-foreground" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn("flex-1 space-y-3", isUser ? "max-w-2xl" : "max-w-3xl")}>
        <Card className={cn(
          "p-4 relative group",
          isUser 
            ? "bg-primary text-primary-foreground ml-auto" 
            : "bg-card border shadow-sm"
        )}>
          <div className="space-y-3">
            {/* Message Content */}
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message}
            </div>

            {/* Message Actions */}
            <div className={cn(
              "flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity",
              isUser ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(message)}
                  className={cn(
                    "h-6 px-2 text-xs",
                    isUser ? "hover:bg-primary/20 text-primary-foreground/70" : "hover:bg-muted"
                  )}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
              
              <div className={cn(
                "text-xs",
                isUser ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ChatMessage;