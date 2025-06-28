import React, { useState, useEffect, useRef } from 'react';
import { Search, Mic, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  placeholder: string;
}

const SearchBar = ({ onSearch, isLoading, placeholder }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect
  useEffect(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Only trigger debounced search if query is not empty and not currently loading
    if (query.trim() && !isLoading) {
      debounceTimeoutRef.current = setTimeout(() => {
        onSearch(query.trim());
      }, 500); // 500ms debounce delay
    }

    // Cleanup timeout on unmount or query change
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, onSearch, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any pending debounced search
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    
    // Trigger immediate search
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  };

  const handleVoiceInput = () => {
    setIsListening(true);
    
    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      // Fallback for browsers without speech recognition
      setTimeout(() => {
        setIsListening(false);
        console.log('Speech recognition not supported in this browser');
      }, 2000);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full h-12 sm:h-14 pl-10 sm:pl-12 pr-24 sm:pr-28 text-base sm:text-lg bg-white/90 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 rounded-xl shadow-lg transition-all duration-300 group-hover:shadow-xl"
            disabled={isLoading}
          />
          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {/* Clear button */}
            {query && !isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                title="Clear"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            )}
            
            {/* Voice input button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleVoiceInput}
              disabled={isLoading}
              className={`p-1.5 sm:p-2 rounded-lg transition-all duration-300 ${
                isListening 
                  ? 'bg-red-100 text-red-600 animate-pulse' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Voice input"
            >
              {isListening ? (
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <Mic className="w-3 h-3 sm:w-4 sm:h-4" />
              )}
            </Button>
            
            {/* Search button */}
            <Button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-300 disabled:opacity-50 text-xs sm:text-sm"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <span className="hidden sm:inline">Search</span>
              )}
            </Button>
          </div>
        </div>
      </form>
      
      {/* Debounce indicator - Mobile optimized */}
      {query.trim() && !isLoading && (
        <div className="text-center mt-2">
          <span className="text-xs text-gray-500">
            Auto-search in progress...
          </span>
        </div>
      )}
    </div>
  );
};

export default SearchBar;