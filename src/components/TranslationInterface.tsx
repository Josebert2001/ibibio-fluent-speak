
import React, { useState } from 'react';
import SearchBar from './SearchBar';
import TranslationResult from './TranslationResult';
import QuickActions from './QuickActions';
import RecentSearches from './RecentSearches';

const TranslationInterface = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTranslation, setCurrentTranslation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([
    { english: 'hello', ibibio: 'nno', meaning: 'A greeting; expression of welcome' },
    { english: 'love', ibibio: 'uduak', meaning: 'Deep affection or care for someone' },
    { english: 'water', ibibio: 'mmong', meaning: 'Clear liquid essential for life' },
  ]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setSearchQuery(query);
    
    // Simulate AI translation process
    setTimeout(() => {
      const mockTranslation = {
        english: query,
        ibibio: query === 'thank you' ? 'sosongo' : query === 'good morning' ? 'emem owo' : 'uduak',
        meaning: query === 'thank you' ? 'Expression of gratitude' : query === 'good morning' ? 'Morning greeting' : 'Deep affection or care',
        partOfSpeech: 'phrase',
        examples: [
          { english: `"${query}" she said warmly`, ibibio: `"${query === 'thank you' ? 'sosongo' : 'uduak'}" akwa edeme` },
        ],
        pronunciation: query === 'thank you' ? 'so-son-go' : 'u-du-ak',
        cultural: query === 'love' ? 'In Ibibio culture, "uduak" represents not just romantic love, but deep care and connection within community and family bonds.' : null
      };
      
      setCurrentTranslation(mockTranslation);
      setIsLoading(false);
      
      // Add to recent searches
      setRecentSearches(prev => {
        const newSearch = { english: query, ibibio: mockTranslation.ibibio, meaning: mockTranslation.meaning };
        return [newSearch, ...prev.filter(item => item.english !== query)].slice(0, 5);
      });
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Discover Ibibio
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Intelligent English to Ibibio translation powered by AI. Explore language, culture, and meaning.
        </p>
      </div>

      {/* Search Interface */}
      <SearchBar 
        onSearch={handleSearch}
        isLoading={isLoading}
        placeholder="Enter English word or phrase..."
      />

      {/* Quick Actions */}
      <QuickActions onQuickSearch={handleSearch} />

      {/* Translation Result */}
      {currentTranslation && (
        <TranslationResult 
          translation={currentTranslation}
          isLoading={isLoading}
        />
      )}

      {/* Recent Searches */}
      {!currentTranslation && recentSearches.length > 0 && (
        <RecentSearches 
          searches={recentSearches}
          onSearchSelect={handleSearch}
        />
      )}
    </div>
  );
};

export default TranslationInterface;
