import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, BookOpen, Globe, Lightbulb, Volume2, Users, Sparkles } from 'lucide-react';

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
        return 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300';
      case 'linguistic':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300';
      case 'practical':
        return 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300';
      case 'related':
        return 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300';
    }
  };

  const getTypeLabel = (type: QuickReply['type']) => {
    switch (type) {
      case 'cultural':
        return 'Cultural';
      case 'linguistic':
        return 'Language';
      case 'practical':
        return 'Practical';
      case 'related':
        return 'Related';
      default:
        return 'General';
    }
  };

  if (suggestions.length === 0) return null;

  // Group suggestions by type
  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.type]) {
      acc[suggestion.type] = [];
    }
    acc[suggestion.type].push(suggestion);
    return acc;
  }, {} as Record<string, QuickReply[]>);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="w-4 h-4 text-blue-500" />
        <span className="font-medium">Suggested questions:</span>
      </div>
      
      {/* Render suggestions by type */}
      {Object.entries(groupedSuggestions).map(([type, typeSuggestions]) => (
        <div key={type} className="space-y-2">
          <div className="flex items-center gap-2">
            {getIcon(type as QuickReply['type'])}
            <span className="text-xs font-medium text-gray-600">
              {getTypeLabel(type as QuickReply['type'])}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {typeSuggestions.map((suggestion) => (
              <Button
                key={suggestion.id}
                variant="outline"
                size="sm"
                onClick={() => onReplyClick(suggestion.text)}
                className={`
                  flex items-center gap-2 text-xs transition-all hover:scale-105 h-auto py-2 px-3
                  ${getTypeColor(suggestion.type)}
                `}
              >
                {getIcon(suggestion.type)}
                <span className="max-w-[200px] truncate">{suggestion.text}</span>
                <Badge 
                  variant="secondary" 
                  className="ml-1 px-1 py-0 text-xs bg-white/50 text-gray-600"
                >
                  {Math.round(suggestion.priority * 100)}%
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      ))}
      
      {/* Type legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t border-gray-200">
        <div className="flex items-center gap-1">
          <Globe className="w-3 h-3 text-purple-600" />
          <span>Cultural insights</span>
        </div>
        <div className="flex items-center gap-1">
          <BookOpen className="w-3 h-3 text-blue-600" />
          <span>Language learning</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageCircle className="w-3 h-3 text-green-600" />
          <span>Practical usage</span>
        </div>
        <div className="flex items-center gap-1">
          <Lightbulb className="w-3 h-3 text-orange-600" />
          <span>Related topics</span>
        </div>
      </div>
    </div>
  );
};

export default QuickReplyButtons;