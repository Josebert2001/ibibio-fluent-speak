import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, Clock, Target, BookOpen, RefreshCw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SearchBar from './SearchBar';
import TranslationResult from './TranslationResult';
import QuickActions from './QuickActions';
import RecentSearches from './RecentSearches';
import DictionaryUpload from './DictionaryUpload';
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
  const [showDictionaryUpload, setShowDictionaryUpload] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<DictionaryEntry[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [responseTime, setResponseTime] = useState<number>(0);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  
  // New state for enhanced sentence processing
  const [isMultiWord, setIsMultiWord] = useState(false);
  const [localResult, setLocalResult] = useState<DictionaryEntry | null>(null);
  const [onlineResult, setOnlineResult] = useState<DictionaryEntry | null>(null);
  const [wordBreakdown, setWordBreakdown] = useState<any[]>([]);
  
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
        console.log('Initializing services...');
        
        // Initialize dictionary services
        await dictionaryService.loadDictionary();
        await enhancedDictionaryService.loadDictionary();
        
        // Initialize parallel search service
        await parallelSearchService.initialize();
        
        console.log('Services initialized successfully');
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
    
    // Reset enhanced state
    setIsMultiWord(false);
    setLocalResult(null);
    setOnlineResult(null);
    setWordBreakdown([]);
    
    const startTime = performance.now();
    
    try {
      console.log('Searching for:', safeQuery);
      
      // Use parallel search service with enhanced sentence processing
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
        
        // Set enhanced sentence processing data
        setIsMultiWord(searchResult.isMultiWord || false);
        setLocalResult(searchResult.localResult || null);
        setOnlineResult(searchResult.onlineResult || null);
        setWordBreakdown(searchResult.wordBreakdown || []);
        
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
        
        console.log('Search completed successfully from source:', searchResult.source);
        
        // Log enhanced results if available
        if (searchResult.isMultiWord) {
          console.log('Multi-word search results:');
          console.log('- Local result:', searchResult.localResult ? 'Found' : 'Not found');
          console.log('- Online result:', searchResult.onlineResult ? 'Found' : 'Not found');
          console.log('- Word breakdown:', searchResult.wordBreakdown?.length || 0, 'words');
        }
      } else {
        setCurrentTranslation(null);
        setSearchError(`No translation found for "${safeQuery}". Try a different word or phrase.`);
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
      case 'local_dictionary': return 'Local Dictionary';
      case 'local_dictionary_exact': return 'Local Dictionary (Exact)';
      case 'local_sentence': return 'Local Dictionary (Sentence)';
      case 'online_search': return 'Online Search';
      case 'online_sentence': return 'Online Search (Sentence)';
      case 'local_fallback': return 'Local Dictionary (Fallback)';
      case 'cache': return 'Cached Result';
      default: return source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const stats = dictionaryService.getStats();
  const hasApiKey = !!groqService.getApiKey();

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Hero Section - Mobile Optimized */}
      <div className="text-center space-y-3 sm:space-y-4 py-4 sm:py-6 lg:py-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
          Ibi-Voice
        </h2>
        <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-2">
          English to Ibibio translation with local dictionary and online search
        </p>
        
        {/* Search Mode Badge - Mobile Friendly */}
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-green-100 px-3 py-2 rounded-full border border-blue-200 text-xs sm:text-sm">
          <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
          <span className="font-medium text-blue-700">
            {hasApiKey ? 'Dictionary + Online + Sentences' : 'Dictionary Only'}
          </span>
        </div>
      </div>

      {/* Dictionary Status - Mobile Optimized */}
      {stats.isLoaded && (
        <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg mx-2 sm:mx-0">
          <p className="text-xs sm:text-sm text-green-700">
            <span className="font-semibold">{stats.totalEntries} entries loaded</span>
            {hasApiKey && <span className="block sm:inline sm:ml-2">• Online search & sentence processing available</span>}
          </p>
        </div>
      )}

      {/* Search Interface */}
      <div className="px-2 sm:px-0">
        <SearchBar 
          onSearch={handleSearch}
          isLoading={isLoading}
          placeholder="Enter English word or sentence..."
        />
      </div>

      {/* Quick Actions - Mobile Optimized */}
      <div className="px-2 sm:px-0">
        <QuickActions onQuickSearch={handleSearch} />
      </div>

      {/* Search Error - Mobile Friendly */}
      {searchError && (
        <div className="flex items-start space-x-2 text-red-600 bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 mx-2 sm:mx-0">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p>{searchError}</p>
          </div>
        </div>
      )}

      {/* Translation Result */}
      {currentTranslation && (
        <div className="space-y-3 sm:space-y-4">
          {/* Result Metadata - Mobile Optimized */}
          <div className="text-center px-2 sm:px-0">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 text-xs bg-gray-100 px-3 py-2 rounded-full">
              <span>{getSourceLabel(searchSource)}</span>
              <span className="hidden sm:inline">•</span>
              <span>{(confidence * 100).toFixed(0)}% confidence</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{responseTime.toFixed(1)}ms</span>
              {isMultiWord && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="text-purple-600 font-medium">Sentence Mode</span>
                </>
              )}
            </div>
          </div>
          
          <div className="px-2 sm:px-0">
            <TranslationResult 
              translation={currentTranslation}
              isLoading={isLoading}
              isMultiWord={isMultiWord}
              localResult={localResult}
              onlineResult={onlineResult}
              wordBreakdown={wordBreakdown}
              source={searchSource}
            />
          </div>

          {/* Dictionary Alternative Results - Mobile Optimized */}
          {alternatives.length > 0 && (
            <div className="mt-4 sm:mt-6 px-2 sm:px-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Similar Words</h3>
              <div className="grid gap-2 sm:gap-3">
                {alternatives.slice(0, 3).map((alt, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                      <span className="font-medium text-blue-700 text-sm sm:text-base">{alt.ibibio}</span>
                      <span className="hidden sm:inline text-gray-600">•</span>
                      <span className="text-gray-700 text-xs sm:text-sm">{alt.meaning}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Searches - Mobile Optimized */}
      {!currentTranslation && recentSearches.length > 0 && (
        <div className="px-2 sm:px-0">
          <RecentSearches 
            searches={recentSearches}
            onSearchSelect={handleSearch}
          />
        </div>
      )}

      {/* Advanced Options - Collapsible on Mobile */}
      <div className="px-2 sm:px-0">
        <Button 
          variant="outline" 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full sm:w-auto flex items-center justify-center space-x-2"
          size="sm"
        >
          <span>Advanced Options</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
            {/* Performance Metrics - Mobile Layout */}
            {performanceMetrics && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-medium text-gray-700">Success</span>
                  </div>
                  <p className="text-lg font-bold text-green-600">
                    {performanceMetrics.successRate.toFixed(0)}%
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span className="text-xs font-medium text-gray-700">Speed</span>
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    {performanceMetrics.averageResponseTime.toFixed(0)}ms
                  </p>
                </div>
                
                <div className="col-span-2 sm:col-span-1 bg-white rounded-lg p-3 border border-gray-200">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={runPerformanceTest}
                    disabled={isLoading}
                    className="w-full text-xs"
                  >
                    Run Test
                  </Button>
                </div>
              </div>
            )}

            {/* Dictionary Upload Toggle */}
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => setShowDictionaryUpload(!showDictionaryUpload)}
                size="sm"
                className="w-full sm:w-auto"
              >
                {showDictionaryUpload ? 'Hide Upload' : 'Upload Dictionary'}
              </Button>
            </div>

            {/* Dictionary Upload */}
            {showDictionaryUpload && (
              <div className="space-y-4">
                <DictionaryUpload />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslationInterface;