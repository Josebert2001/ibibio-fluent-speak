import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, Clock, Target } from 'lucide-react';
import SearchBar from './SearchBar';
import TranslationResult from './TranslationResult';
import QuickActions from './QuickActions';
import RecentSearches from './RecentSearches';
import DictionaryUpload from './DictionaryUpload';
import ApiKeySetup from './ApiKeySetup';
import { enhancedDictionaryService } from '../services/enhancedDictionaryService';
import { intelligentSearchV2 } from '../services/intelligentSearchV2';
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
  ]);

  useEffect(() => {
    // Load enhanced dictionary on component mount
    enhancedDictionaryService.loadDictionary();
    
    // Load performance metrics
    const metrics = intelligentSearchV2.getPerformanceMetrics();
    setPerformanceMetrics(metrics);
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setSearchQuery(query);
    setCurrentTranslation(null);
    setSearchError(null);
    setAlternatives([]);
    setSources([]);
    
    try {
      const result = await intelligentSearchV2.search(query);
      
      if (result.result) {
        setCurrentTranslation(result.result);
        setSearchSource(result.source);
        setConfidence(result.confidence / 100);
        setAlternatives(result.alternatives);
        setSources(result.sources);
        setResponseTime(result.responseTime);
        
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
        setCurrentTranslation(null);
        setSearchError(result.error || 'No translation found');
        setResponseTime(result.responseTime);
      }

      // Update performance metrics
      const updatedMetrics = intelligentSearchV2.getPerformanceMetrics();
      setPerformanceMetrics(updatedMetrics);
    } catch (error) {
      console.error('Search error:', error);
      setCurrentTranslation(null);
      setSearchError('An unexpected error occurred during search.');
    } finally {
      setIsLoading(false);
    }
  };

  const runPerformanceTest = async () => {
    setIsLoading(true);
    try {
      const testResults = await intelligentSearchV2.runPerformanceTest();
      console.log('Performance test results:', testResults);
      
      // Update metrics after test
      const updatedMetrics = intelligentSearchV2.getPerformanceMetrics();
      setPerformanceMetrics(updatedMetrics);
    } catch (error) {
      console.error('Performance test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'local_primary': return 'Local Dictionary (Verified)';
      case 'online_primary': return 'Online Sources';
      case 'fallback': return 'Fallback Search';
      case 'cache': return 'Cached Result';
      default: return source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const stats = enhancedDictionaryService.getStats();
  const hasApiKey = !!groqService.getApiKey();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Enhanced Ibibio Search
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Intelligent parallel search with local dictionary, online sources, and AI-powered translations. 
          Optimized for speed and accuracy.
        </p>
        
        {/* Performance Metrics */}
        {performanceMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
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
                {performanceMetrics.averageResponseTime.toFixed(0)}ms
              </p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Total Searches</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {performanceMetrics.totalSearches}
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
        <Button 
          variant="outline" 
          onClick={() => setShowSetup(!showSetup)}
          className="mt-4"
        >
          {showSetup ? 'Hide Setup' : 'Setup Dictionary & API'}
        </Button>
      </div>

      {/* API Key Warning */}
      {!hasApiKey && (
        <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 p-4 rounded-lg border border-orange-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Enhanced features available with API key</p>
            <p>Local dictionary search is active. Add Groq API key for online search and AI translations.</p>
          </div>
        </div>
      )}

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
            Enhanced dictionary: <span className="font-semibold">{stats.totalEntries} entries</span>
            {stats.isIndexed && <span className="ml-2">• Search index ready</span>}
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
        placeholder="Enter English word or phrase for enhanced search..."
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
              <span>Response: {responseTime.toFixed(0)}ms</span>
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