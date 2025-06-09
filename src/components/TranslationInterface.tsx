import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import SearchBar from './SearchBar';
import TranslationResult from './TranslationResult';
import QuickActions from './QuickActions';
import RecentSearches from './RecentSearches';
import DictionaryUpload from './DictionaryUpload';
import ApiKeySetup from './ApiKeySetup';
import { dictionaryService } from '../services/dictionaryService';
import { intelligentSearchService } from '../services/intelligentSearch';
import { DictionaryEntry } from '../types/dictionary';

const TranslationInterface = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTranslation, setCurrentTranslation] = useState<DictionaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchSource, setSearchSource] = useState<'dictionary' | 'ai' | 'langchain-web' | 'cache'>('dictionary');
  const [confidence, setConfidence] = useState(1.0);
  const [showSetup, setShowSetup] = useState(false);
  const [recentSearches, setRecentSearches] = useState([
    { english: 'hello', ibibio: 'nno', meaning: 'A greeting; expression of welcome' },
    { english: 'love', ibibio: 'uduak', meaning: 'Deep affection or care for someone' },
    { english: 'water', ibibio: 'mmong', meaning: 'Clear liquid essential for life' },
  ]);

  useEffect(() => {
    // Load dictionary on component mount
    dictionaryService.loadDictionary();
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setSearchQuery(query);
    setCurrentTranslation(null);
    
    try {
      const result = await intelligentSearchService.search(query);
      
      if (result.result) {
        setCurrentTranslation(result.result);
        setSearchSource(result.source);
        setConfidence(result.confidence);
        
        // Add to recent searches
        setRecentSearches(prev => {
          const newSearch = { 
            english: query, 
            ibibio: result.result!.ibibio, 
            meaning: result.result!.meaning 
          };
          return [newSearch, ...prev.filter(item => item.english !== query)].slice(0, 5);
        });
      } else {
        // No result found
        setCurrentTranslation(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      setCurrentTranslation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'dictionary': return 'Dictionary';
      case 'ai': return 'AI';
      case 'langchain-web': return 'Web Search';
      case 'cache': return 'Cached Web';
      default: return source;
    }
  };

  const stats = dictionaryService.getStats();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Discover Ibibio
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Intelligent English to Ibibio translation powered by AI, web search, and your dictionary. Explore language, culture, and meaning.
        </p>
        
        {/* Setup Toggle */}
        <Button 
          variant="outline" 
          onClick={() => setShowSetup(!showSetup)}
          className="mt-4"
        >
          {showSetup ? 'Hide Setup' : 'Setup Dictionary & API'}
        </Button>
      </div>

      {/* Setup Section */}
      {showSetup && (
        <div className="space-y-6">
          <DictionaryUpload />
          <ApiKeySetup />
        </div>
      )}

      {/* Dictionary Stats */}
      {stats.isLoaded && (
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            Dictionary loaded: <span className="font-semibold">{stats.totalEntries} entries</span>
            {stats.categories.length > 0 && (
              <span className="ml-2">• Categories: {stats.categories.join(', ')}</span>
            )}
          </p>
        </div>
      )}

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
        <div className="space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-xs bg-gray-100 px-3 py-1 rounded-full">
              <span>Source: {getSourceLabel(searchSource)}</span>
              <span>•</span>
              <span>Confidence: {(confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
          <TranslationResult 
            translation={currentTranslation}
            isLoading={isLoading}
          />
        </div>
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
