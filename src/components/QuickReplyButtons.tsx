import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, BookOpen, Globe, Lightbulb, Volume2, Users } from 'lucide-react';

interface QuickReply {
  id: string;
  text: string;
  type: 'cultural' | 'linguistic' | 'practical' | 'related';
  priority: number;
  context: string;
  icon?: React.ReactNode;
}

interface QuickReplyButtonsProps {
  suggestions: QuickReply[];
  onReplyClick: (text: string) => void;
  className?: string;
}

const QuickReplyButtons: React.FC<QuickReplyButtonsProps> = ({
  suggestions,
  onReplyClick,
  className = ''
}) => {
  const getIcon = (type: QuickReply['type']) => {
    switch (type) {
      case 'cultural':
        return <Globe className="w-3 h-3" />;
      case 'linguistic':
        return <BookOpen className="w-3 h-3" />;
      case 'practical':
        return <MessageCircle className="w-3 h-3" />;
      case 'related':
        return <Lightbulb className="w-3 h-3" />;
      default:
        return <MessageCircle className="w-3 h-3" />;
    }
  };

  const getTypeColor = (type: QuickReply['type']) => {
    switch (type) {
      case 'cultural':
        return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
      case 'linguistic':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'practical':
        return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'related':
        return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
      default:
        return 'bg-muted text-muted-foreground hover:bg-accent';
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lightbulb className="w-4 h-4" />
        <span>Quick suggestions:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.id}
            variant="outline"
            size="sm"
            onClick={() => onReplyClick(suggestion.text)}
            className={`
              flex items-center gap-2 text-xs transition-all hover:scale-105
              ${getTypeColor(suggestion.type)}
            `}
          >
            {getIcon(suggestion.type)}
            <span>{suggestion.text}</span>
            <Badge 
              variant="secondary" 
              className="ml-1 px-1 py-0 text-xs bg-background/50"
            >
              {Math.round(suggestion.priority * 100)}%
            </Badge>
          </Button>
        ))}
      </div>
      
      {/* Type legend */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Globe className="w-3 h-3 text-purple-600" />
          <span>Cultural</span>
        </div>
        <div className="flex items-center gap-1">
          <BookOpen className="w-3 h-3 text-blue-600" />
          <span>Language</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageCircle className="w-3 h-3 text-green-600" />
          <span>Practical</span>
        </div>
        <div className="flex items-center gap-1">
          <Lightbulb className="w-3 h-3 text-orange-600" />
          <span>Related</span>
        </div>
      </div>
    </div>
  );
};

export default QuickReplyButtons;