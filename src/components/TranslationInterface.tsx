import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, Clock, Target, BookOpen, RefreshCw, TestTube } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SearchBar from './SearchBar';
import TranslationResult from './TranslationResult';
import QuickActions from './QuickActions';
import RecentSearches from './RecentSearches';
import DictionaryUpload from './DictionaryUpload';
import ApiKeySetup from './ApiKeySetup';
import EnhancedSearchInterface from './EnhancedSearchInterface';
import SentenceSearchDemo from './SentenceSearchDemo';
import { enhancedDictionaryService } from '../services/enhancedDictionaryService';
import { dictionaryService } from '../services/dictionaryService';
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
  const [activeTab, setActiveTab] = useState('ibibio');
  const [recentSearches, setRecentSearches] = useState([
    { english: 'hello', ibibio: 'nno', meaning: 'A greeting; expression of welcome' },
    { english: 'love', ibibio: 'uduak', meaning: 'Deep affection or care for someone' },
    { english: 'water', ibibio: 'mmong', meaning: 'Clear liquid essential for life' },
    { english: 'god', ibibio: 'abasi', meaning: 'The supreme deity; creator and sustainer of all life' },
  ]);

  useEffect(() => {
    // Load dictionary on component mount
    const initializeDictionary = async () => {
      try {
        console.log('=== INITIALIZING DICTIONARY ===');
        
        // Force reload dictionary
        await dictionaryService.loadDictionary();
        await enhancedDictionaryService.loadDictionary();
        
        // Debug the dictionary content
        dictionaryService.debugDictionary('god');
        
        // Test search for God specifically
        const godTest = dictionaryService.search('god');
        console.log('God search test result:', godTest);
        
        console.log('Dictionary initialization completed');
      } catch (error) {
        console.error('Failed to initialize dictionary:', error);
      }
    };
    
    initializeDictionary();
  }, []);

  const handleSearch = async (query: string) => {
    // Add comprehensive input validation at the start
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
      console.log('=== SEARCH DEBUG ===');
      console.log('Searching for:', safeQuery);
      console.log('Dictionary stats:', dictionaryService.getStats());
      
      // Force reload dictionary if not loaded
      if (!dictionaryService.getStats().isLoaded) {
        console.log('Dictionary not loaded, forcing reload...');
        await dictionaryService.loadDictionary();
      }
      
      // Debug dictionary content before search
      dictionaryService.debugDictionary(safeQuery);
      
      // Try direct search in basic dictionary service first
      let result = dictionaryService.search(safeQuery);
      let source = 'basic_dictionary';
      let searchConfidence = 1.0;
      let alternativeResults: DictionaryEntry[] = [];
      
      console.log('Basic dictionary result:', result);
      
      if (result) {
        console.log('✅ Found in basic dictionary:', result);
        source = 'basic_dictionary';
      } else {
        console.log('❌ Not found in basic dictionary, trying enhanced...');
        
        // Try enhanced dictionary service
        result = enhancedDictionaryService.search(safeQuery);
        
        if (result) {
          console.log('✅ Found in enhanced dictionary:', result);
          source = 'enhanced_dictionary';
          
          // Get alternatives from fuzzy search
          const fuzzyResults = enhancedDictionaryService.searchFuzzy(safeQuery, 5);
          alternativeResults = fuzzyResults.slice(1).map(r => r.entry);
        } else {
          console.log('❌ Not found in enhanced dictionary either, trying fuzzy search...');
          
          // Try fuzzy search as last resort
          const fuzzyResults = dictionaryService.searchFuzzy(safeQuery, 5);
          if (fuzzyResults.length > 0) {
            result = fuzzyResults[0].entry;
            searchConfidence = fuzzyResults[0].confidence;
            source = 'fuzzy_search';
            alternativeResults = fuzzyResults.slice(1).map(r => r.entry);
            console.log('✅ Found via fuzzy search:', result);
          } else {
            console.log('❌ No fuzzy results found');
            
            // Debug: Let's see what's actually in the dictionary
            const allEntries = dictionaryService.getAllEntries();
            console.log('Total dictionary entries:', allEntries.length);
            console.log('Sample entries:', allEntries.slice(0, 10).map(e => ({ 
              english: e.english, 
              ibibio: e.ibibio,
              id: e.id 
            })));
            
            // Check if God is specifically in there
            const godEntries = allEntries.filter(e => 
              e.english && typeof e.english === 'string' && 
              e.english.toLowerCase().includes('god')
            );
            console.log('God-related entries found:', godEntries);
            
            // Check exact match manually
            const exactGodMatch = allEntries.find(e => 
              e.english && typeof e.english === 'string' && 
              e.english.toLowerCase() === 'god'
            );
            console.log('Exact God match:', exactGodMatch);
          }
        }
      }
      
      const endTime = performance.now();
      const searchTime = endTime - startTime;
      
      if (result) {
        setCurrentTranslation(result);
        setSearchSource(source);
        setConfidence(searchConfidence);
        setAlternatives(alternativeResults);
        setSources([source]);
        setResponseTime(searchTime);
        
        // Add to recent searches with safe string handling
        setRecentSearches(prev => {
          const newSearch = { 
            english: safeQuery, 
            ibibio: result!.ibibio || '', 
            meaning: result!.meaning || '' 
          };
          return [newSearch, ...prev.filter(item => 
            item.english && typeof item.english === 'string' && 
            item.english.toLowerCase() !== safeQuery.toLowerCase()
          )].slice(0, 5);
        });
        
        console.log('✅ Search completed successfully');
      } else {
        setCurrentTranslation(null);
        setSearchError(`No translation found for "${safeQuery}". The word may not be in the dictionary yet. Try uploading a dictionary file or check the spelling.`);
        setResponseTime(searchTime);
        console.log('❌ No translation found anywhere');
      }

    } catch (error) {
      console.error('Search error:', error);
      setCurrentTranslation(null);
      setSearchError('An unexpected error occurred during search.');
      setResponseTime(performance.now() - startTime);
    } finally {
      setIsLoading(false);
    }
  };

  const forceReloadDictionary = async () => {
    setIsLoading(true);
    try {
      // Clear localStorage to force fresh load
      localStorage.removeItem('ibibio-dictionary');
      
      // Reload dictionary
      await dictionaryService.loadDictionary();
      await enhancedDictionaryService.loadDictionary();
      
      // Test God search
      const godTest = dictionaryService.search('god');
      console.log('God search after reload:', godTest);
      
      if (godTest) {
        setSearchError(null);
        alert('Dictionary reloaded successfully! God/Abasi entry found.');
      } else {
        setSearchError('Dictionary reloaded but God/Abasi entry still not found. Please check your dictionary file.');
      }
    } catch (error) {
      console.error('Failed to reload dictionary:', error);
      setSearchError('Failed to reload dictionary.');
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
      case 'basic_dictionary': return 'Basic Dictionary';
      case 'enhanced_dictionary': return 'Enhanced Dictionary';
      case 'fuzzy_search': return 'Fuzzy Search';
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
          Smart Dictionary & Translation
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Advanced dictionary search with local and online sources, plus Ibibio translation capabilities.
        </p>
      </div>

      {/* Main Interface Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dictionary" className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4" />
            <span>English Dictionary</span>
          </TabsTrigger>
          <TabsTrigger value="ibibio" className="flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>Ibibio Translation</span>
          </TabsTrigger>
          <TabsTrigger value="sentence-search" className="flex items-center space-x-2">
            <TestTube className="w-4 h-4" />
            <span>Sentence Search</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dictionary" className="space-y-6">
          <EnhancedSearchInterface />
        </TabsContent>

        <TabsContent value="sentence-search" className="space-y-6">
          <SentenceSearchDemo />
        </TabsContent>

        <TabsContent value="ibibio" className="space-y-6">
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
          <div className="text-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setShowSetup(!showSetup)}
              className="mt-4"
            >
              {showSetup ? 'Hide Setup' : 'Setup Dictionary & API'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={forceReloadDictionary}
              disabled={isLoading}
              className="mt-4"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Reload Dictionary
            </Button>
          </div>

          {/* API Key Info */}
          {!hasApiKey && (
            <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Dictionary search is active</p>
                <p>Add Groq API key in setup for enhanced AI-powered translations and online search.</p>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TranslationInterface;