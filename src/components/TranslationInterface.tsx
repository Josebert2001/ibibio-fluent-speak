import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, Clock, Target, BookOpen, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SearchBar from './SearchBar';
import TranslationResult from './TranslationResult';
import QuickActions from './QuickActions';
import RecentSearches from './RecentSearches';
import ApiKeySetup from './ApiKeySetup';
import { enhancedDictionaryService } from '../services/enhancedDictionaryService';
import { dictionaryService } from '../services/dictionaryService';
import { parallelSearchService } from '../services/parallelSearchService';
import { groqService } from '../services/groqService';
import { DictionaryEntry } from '../types/dictionary';

const TranslationInterface = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTranslation, setCurrentTranslation] = useState<DictionaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchSource, setSearchSource] = useState<string>('dictionary');
  const [confidence, setConfidence] = useState(1.0);
  const [showSetup, setShowSetup] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<DictionaryEntry[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [responseTime, setResponseTime] = useState<number>(0);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [recentSearches, setRecentSearches] = useState([
    { english: 'hello', ibibio: 'nno', meaning: 'A greeting; expression of welcome' },
    { english: 'love', ibibio: 'uduak', meaning: 'Deep affection or care for someone' },
    { english: 'water', ibibio: 'mmong', meaning: 'Clear liquid essential for life' },
    { english: 'god', ibibio: 'abasi', meaning: 'The supreme deity; creator and sustainer of all life' },
  ]);

  useEffect(() => {
    // Initialize services on component mount
    const initializeServices = async () => {
      try {
        console.log('Initializing production services...');
        
        // Initialize dictionary services
        await dictionaryService.loadDictionary();
        await enhancedDictionaryService.loadDictionary();
        
        // Initialize parallel search service for enhanced capabilities
        await parallelSearchService.initialize();
        
        console.log('Production services initialized successfully');
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };
    
    initializeServices();
  }, []);

  const handleSearch = async (query: string) => {
    if (!query || typeof query !== 'string' || !query.trim()) {
      console.warn('Invalid search query:', query);
      return;
    }
    
    const safeQuery = String(query).trim();
    if (!safeQuery) {
      console.warn('Empty search query after trimming');
      return;
    }
    
    setIsLoading(true);
    setSearchQuery(safeQuery);
    setCurrentTranslation(null);
    setSearchError(null);
    setAlternatives([]);
    setSources([]);
    
    const startTime = performance.now();
    
    try {
      console.log('Searching for:', safeQuery);
      
      // Use parallel search service for comprehensive results
      const searchResult = await parallelSearchService.search(safeQuery);
      
      const endTime = performance.now();
      const searchTime = endTime - startTime;
      
      if (searchResult.result) {
        setCurrentTranslation(searchResult.result);
        setSearchSource(searchResult.source);
        setConfidence(searchResult.confidence / 100); // Convert to 0-1 scale
        setAlternatives(searchResult.alternatives);
        setSources(searchResult.sources);
        setResponseTime(searchTime);
        
        // Add to recent searches
        setRecentSearches(prev => {
          const newSearch = { 
            english: safeQuery, 
            ibibio: searchResult.result!.ibibio || '', 
            meaning: searchResult.result!.meaning || '' 
          };
          return [newSearch, ...prev.filter(item => 
            item.english && typeof item.english === 'string' && 
            item.english.toLowerCase() !== safeQuery.toLowerCase()
          )].slice(0, 5);
        });
        
        console.log('Search completed successfully');
      } else {
        setCurrentTranslation(null);
        setSearchError(`No translation found for "${safeQuery}". Try a different word or check if you have an API key configured for enhanced search.`);
        setResponseTime(searchTime);
        console.log('No translation found');
      }

    } catch (error) {
      console.error('Search error:', error);
      setCurrentTranslation(null);
      setSearchError('An unexpected error occurred during search. Please try again.');
      setResponseTime(performance.now() - startTime);
    } finally {
      setIsLoading(false);
    }
  };

  const runPerformanceTest = async () => {
    setIsLoading(true);
    try {
      const testQueries = ['hello', 'water', 'love', 'family', 'house', 'food', 'good', 'thank you', 'god'];
      const testResults = await enhancedDictionaryService.performanceTest(testQueries);
      console.log('Performance test results:', testResults);
      
      setPerformanceMetrics({
        averageResponseTime: testResults.averageTime,
        successRate: (testResults.results.filter(r => r.found).length / testResults.results.length) * 100,
        totalSearches: testResults.results.length
      });
    } catch (error) {
      console.error('Performance test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'local_primary': return 'Local Dictionary';
      case 'enhanced_local': return 'Enhanced Dictionary';
      case 'ai_enhanced': return 'AI Enhanced';
      case 'online_primary': return 'Online Sources';
      case 'cache': return 'Cached Result';
      default: return source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const stats = dictionaryService.getStats();
  const hasApiKey = !!groqService.getApiKey();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Ibibio Translation Platform
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Professional English to Ibibio translation with local dictionary and AI-powered enhancements.
        </p>
      </div>

      {/* Performance Metrics */}
      {performanceMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Success Rate</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {performanceMetrics.successRate.toFixed(1)}%
            </p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Avg Response</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {performanceMetrics.averageResponseTime.toFixed(1)}ms
            </p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={runPerformanceTest}
              disabled={isLoading}
              className="w-full"
            >
              Run Test
            </Button>
          </div>
        </div>
      )}
      
      {/* Setup Toggle */}
      <div className="text-center">
        <Button 
          variant="outline" 
          onClick={() => setShowSetup(!showSetup)}
          className="mt-4"
        >
          {showSetup ? 'Hide Configuration' : 'API Configuration'}
        </Button>
      </div>

      {/* API Key Configuration */}
      {showSetup && (
        <div className="space-y-6">
          <ApiKeySetup />
        </div>
      )}

      {/* API Key Status */}
      {!hasApiKey && (
        <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Local dictionary search is active</p>
            <p>Configure Groq API key for enhanced AI-powered translations and online search capabilities.</p>
          </div>
        </div>
      )}

      {/* Dictionary Status */}
      {stats.isLoaded && (
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700">
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
        placeholder="Enter English word or phrase to translate to Ibibio..."
      />

      {/* Quick Actions */}
      <QuickActions onQuickSearch={handleSearch} />

      {/* Search Error */}
      {searchError && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">
            <p>{searchError}</p>
          </div>
        </div>
      )}

      {/* Translation Result */}
      {currentTranslation && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center space-x-4 text-xs bg-gray-100 px-4 py-2 rounded-full">
              <span>Source: {getSourceLabel(searchSource)}</span>
              <span>•</span>
              <span>Confidence: {(confidence * 100).toFixed(0)}%</span>
              <span>•</span>
              <span>Response: {responseTime.toFixed(1)}ms</span>
              {sources.length > 0 && (
                <>
                  <span>•</span>
                  <span>Sources: {sources.join(', ')}</span>
                </>
              )}
            </div>
          </div>
          
          <TranslationResult 
            translation={currentTranslation}
            isLoading={isLoading}
          />

          {/* Alternative Results */}
          {alternatives.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Alternative Translations</h3>
              <div className="grid gap-3">
                {alternatives.map((alt, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-blue-700">{alt.ibibio}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-700">{alt.meaning}</span>
                    </div>
                    {alt.cultural && (
                      <p className="text-xs text-gray-500 mt-1">{alt.cultural}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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