import React, { useState, useEffect, useRef } from 'react';
import { Search, Mic, Loader2 } from 'lucide-react';
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
            className="w-full h-14 pl-12 pr-20 text-lg bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 rounded-xl shadow-lg transition-all duration-300 group-hover:shadow-xl"
            disabled={isLoading}
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleVoiceInput}
              disabled={isLoading}
              className={`p-2 rounded-lg transition-all duration-300 ${
                isListening 
                  ? 'bg-red-100 text-red-600 animate-pulse' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Voice input"
            >
              {isListening ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Translate'
              )}
            </Button>
          </div>
        </div>
      </form>
      
      {/* Debounce indicator */}
      {query.trim() && !isLoading && (
        <div className="text-center mt-2">
          <span className="text-xs text-gray-500">
            Search will trigger automatically after you stop typing...
          </span>
        </div>
      )}
    </div>
  );
};

export default SearchBar;