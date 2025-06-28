import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface QuickActionsProps {
  onQuickSearch: (query: string) => void;
}

const QuickActions = ({ onQuickSearch }: QuickActionsProps) => {
  const quickSearches = [
    { text: 'hello', label: 'Greetings' },
    { text: 'thank you', label: 'Gratitude' },
    { text: 'love', label: 'Emotions' },
    { text: 'family', label: 'Relations' },
    { text: 'water', label: 'Nature' },
    { text: 'food', label: 'Daily' },
    { text: 'god', label: 'Spiritual' },
    { text: 'good morning', label: 'Time' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center space-x-2 mb-3 sm:mb-4">
        <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
        <h3 className="text-xs sm:text-sm font-medium text-gray-700">Quick Translations</h3>
      </div>
      
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        {quickSearches.map((item, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onQuickSearch(item.text)}
            className="bg-white/60 backdrop-blur-sm border-gray-200 hover:bg-white hover:border-blue-300 hover:text-blue-700 transition-all duration-300 text-xs sm:text-sm p-2 sm:p-3 h-auto flex-col sm:flex-row items-center justify-center"
          >
            <span className="font-medium">{item.text}</span>
            <span className="text-xs text-gray-500 mt-0.5 sm:mt-0 sm:ml-2">({item.label})</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;