import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, Book } from 'lucide-react';

interface QuickActionsProps {
  onQuickSearch: (query: string) => void;
}

const QuickActions = ({ onQuickSearch }: QuickActionsProps) => {
  const quickSearches = [
    { text: 'hello', label: 'Greetings' },
    { text: 'thank you', label: 'Gratitude' },
    { text: 'good morning', label: 'Time' },
    { text: 'love', label: 'Emotions' },
    { text: 'family', label: 'Relationships' },
    { text: 'water', label: 'Nature' },
    { text: 'god', label: 'Spiritual' },
    { text: 'food', label: 'Daily Life' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center space-x-2 mb-4">
        <Sparkles className="w-4 h-4 text-purple-600" />
        <h3 className="text-sm font-medium text-gray-700">Quick Translations</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {quickSearches.map((item, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onQuickSearch(item.text)}
            className="bg-white/60 backdrop-blur-sm border-gray-200 hover:bg-white hover:border-blue-300 hover:text-blue-700 transition-all duration-300"
          >
            <span className="font-medium">{item.text}</span>
            <span className="ml-2 text-xs text-gray-500">({item.label})</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;