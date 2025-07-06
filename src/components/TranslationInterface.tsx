import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, Clock, Target, BookOpen, RefreshCw, Sparkles, ChevronDown, ChevronUp, Search, Globe, Brain, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SearchBar from './SearchBar';
import TranslationResult from './TranslationResult';
import ComprehensiveSearchResult from './ComprehensiveSearchResult';
import QuickActions from './QuickActions';
import RecentSearches from './RecentSearches';
import DictionaryUpload from './DictionaryUpload';
import ContextClarificationModal from './ContextClarificationModal';
import FeedbackPanel from './FeedbackPanel';
import { enhancedDictionaryService } from '../services/enhancedDictionaryService';
import { dictionaryService } from '../services/dictionaryService';
import { parallelSearchService } from '../services/parallelSearchService';
import { comprehensiveDictionaryService } from '../services/comprehensiveDictionaryService';
import { groqService } from '../services/groqService';
import { huggingFaceService } from '../services/huggingFaceService';
import { intelligentSearchService } from '../services/intelligentSearchService';
import { feedbackService } from '../services/feedbackService';
import { searchEngine } from '../services/searchEngine';
import { semanticAnalyzer } from '../services/semanticAnalyzer';
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
  
  // Enhanced search state
  const [searchMode, setSearchMode] = useState<'simple' | 'comprehensive' | 'intelligent'>('intelligent');
  const [comprehensiveResult, setComprehensiveResult] = useState<any>(null);
  const [requestOnlineSearch, setRequestOnlineSearch] = useState(false);
  
  // Enhanced state for sentence processing
  const [isMultiWord, setIsMultiWord] = useState(false);
  const [localResult, setLocalResult] = useState<DictionaryEntry | null>(null);
  const [onlineResult, setOnlineResult] = useState<DictionaryEntry | null>(null);
  const [wordBreakdown, setWordBreakdown] = useState<any[]>([]);
  
  // Enhanced performance and response tracking
  const [responseTime, setResponseTime] = useState<number>(0);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    averageResponseTime: number;
    successRate: number;
    totalSearches: number;
    searchAccuracy: number;
  } | null>(null);
  
  const [recentSearches, setRecentSearches] = useState([
    { english: 'hello', ibibio: 'nno', meaning: 'A greeting; expression of welcome used throughout the day' },
    { english: 'love', ibibio: 'uduak', meaning: 'Deep affection or care for someone; strong emotional attachment' },
    { english: 'water', ibibio: 'mmong', meaning: 'Clear liquid essential for life; H2O' },
    { english: 'god', ibibio: 'abasi', meaning: 'The supreme deity; creator and sustainer of all life' },
  ]);
  
  // Enhanced state for intelligent search and feedback
  const [needsContext, setNeedsContext] = useState(false);
  const [contextQuestions, setContextQuestions] = useState<string[]>([]);
  const [alternatives, setAlternatives] = useState<Array<{
    entry: DictionaryEntry;
    confidence: number;
    reason: string;
  }>>([]);
  const [ambiguityReason, setAmbiguityReason] = useState<string>('');
  const [userContext, setUserContext] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchDebugInfo, setSearchDebugInfo] = useState<string>('');

  useEffect(() => {
    // Enhanced service initialization
    const initializeServices = async () => {
      try {
        console.log('🚀 Initializing enhanced translation services...');
        
        // Initialize core dictionary services
        await dictionaryService.loadDictionary();
        await enhancedDictionaryService.loadDictionary();
        await comprehensiveDictionaryService.initialize();
        
        // Initialize parallel search service
        await parallelSearchService.initialize();
        
        // Initialize intelligent services
        await intelligentSearchService.initialize();
        await feedbackService.initialize();
        
        console.log('✅ All enhanced services initialized successfully');
        
        // Log service statistics
        console.log('📊 Service Statistics:', {
          dictionary: dictionaryService.getStats(),
          searchEngine: searchEngine.getStats(),
          parallelSearch: parallelSearchService.getStats(),
          huggingFace: huggingFaceService.getStats()
        });
        
      } catch (error) {
        console.error('❌ Failed to initialize services:', error);
      }
    };
    
    initializeServices();
  }, []);

  const handleSearch = async (query: string, forceOnlineSearch: boolean = false) => {
    if (!query || typeof query !== 'string' || !query.trim()) {
      console.warn('⚠️ Invalid search query:', query);
      return;
    }
    
    const safeQuery = String(query).trim();
    if (!safeQuery) {
      console.warn('⚠️ Empty search query after trimming');
      return;
    }
    
    console.log(`🔍 Starting enhanced search for: "${safeQuery}" (mode: ${searchMode})`);
    
    setIsLoading(true);
    setSearchQuery(safeQuery);
    setCurrentTranslation(null);
    setComprehensiveResult(null);
    setSearchError(null);
    setNeedsContext(false);
    setContextQuestions([]);
    setAlternatives([]);
    setAmbiguityReason('');
    setSearchDebugInfo('');
    
    // Add to search history
    setSearchHistory(prev => {
      const newHistory = [safeQuery, ...prev.filter(h => h !== safeQuery)].slice(0, 10);
      return newHistory;
    });
    
    const startTime = performance.now();
    
    try {
      let searchResult: any = null;
      
      // Enhanced search routing based on mode
      switch (searchMode) {
        case 'intelligent':
          console.log('🧠 Using intelligent search mode...');
          searchResult = await intelligentSearchService.searchIntelligently({
            query: safeQuery,
            userContext: userContext || undefined,
            previousQueries: searchHistory,
            userPreferences: {}
          });
          
          if (searchResult.needsContext) {
            setNeedsContext(true);
            setContextQuestions(searchResult.contextQuestions);
            setAlternatives(searchResult.alternatives);
            setAmbiguityReason(searchResult.ambiguityReason || '');
            setResponseTime(performance.now() - startTime);
            setIsLoading(false);
            return;
          }
          
          if (searchResult.primaryResult) {
            setCurrentTranslation(searchResult.primaryResult);
            setSearchSource('intelligent_search');
            setConfidence(searchResult.confidence);
            setAlternatives(searchResult.alternatives);
            
            // Enhanced debug information
            if (searchResult.primaryResult) {
              const debugInfo = semanticAnalyzer.getDebugInfo(safeQuery, searchResult.primaryResult);
              setSearchDebugInfo(debugInfo);
              console.log('🔍 Semantic Analysis Debug:', debugInfo);
            }
          }
          break;
          
        case 'comprehensive':
          console.log('📚 Using comprehensive search mode...');
          searchResult = await comprehensiveDictionaryService.search(safeQuery, forceOnlineSearch);
          setComprehensiveResult(searchResult);
          
          if (searchResult.combinedTranslation) {
            setCurrentTranslation({
              id: `comprehensive-${Date.now()}`,
              english: searchResult.inputText,
              ibibio: searchResult.combinedTranslation.ibibio,
              meaning: `Comprehensive translation (${searchResult.combinedTranslation.source})`,
              partOfSpeech: searchResult.isMultiWord ? 'sentence' : 'word',
              examples: [],
              cultural: `Translated using ${searchResult.combinedTranslation.source} method with ${searchResult.combinedTranslation.confidence}% confidence`
            });
            setSearchSource(searchResult.combinedTranslation.source);
            setConfidence(searchResult.combinedTranslation.confidence / 100);
          }
          break;
          
        case 'simple':
        default:
          console.log('🔍 Using enhanced parallel search mode...');
          searchResult = await parallelSearchService.search(safeQuery);
          
          if (searchResult.result) {
            setCurrentTranslation(searchResult.result);
            setSearchSource(searchResult.source);
            setConfidence(searchResult.confidence / 100);
            
            // Enhanced alternatives formatting
            const formattedAlternatives = (searchResult.alternatives || []).map(alt => ({
              entry: alt,
              confidence: 0.8,
              reason: 'Alternative translation'
            }));
            setAlternatives(formattedAlternatives);
            
            // Enhanced sentence processing data
            setIsMultiWord(searchResult.isMultiWord || false);
            setLocalResult(searchResult.localResult || null);
            setOnlineResult(searchResult.onlineResult || null);
            setWordBreakdown(searchResult.wordBreakdown || []);
            
            // Enhanced debug information
            if (searchResult.result) {
              const debugInfo = semanticAnalyzer.getDebugInfo(safeQuery, searchResult.result);
              setSearchDebugInfo(debugInfo);
              console.log('🔍 Semantic Analysis Debug:', debugInfo);
            }
          }
          break;
      }
      
      const endTime = performance.now();
      const searchTime = endTime - startTime;
      setResponseTime(searchTime);
      
      // Enhanced result processing
      if (searchResult && (searchResult.primaryResult || searchResult.result || searchResult.combinedTranslation)) {
        const finalResult = searchResult.primaryResult || searchResult.result || {
          id: `result-${Date.now()}`,
          english: safeQuery,
          ibibio: searchResult.combinedTranslation?.ibibio || '',
          meaning: 'Translation found',
          partOfSpeech: 'unknown',
          examples: []
        };
        
        // Enhanced community confidence integration
        const communityConfidence = feedbackService.getConfidenceScore(
          finalResult.english,
          finalResult.ibibio
        );
        
        if (communityConfidence > 0) {
          const blendedConfidence = (confidence + communityConfidence) / 2;
          setConfidence(blendedConfidence);
          console.log(`🤝 Blended confidence: AI ${(confidence * 100).toFixed(1)}% + Community ${(communityConfidence * 100).toFixed(1)}% = ${(blendedConfidence * 100).toFixed(1)}%`);
        }
        
        // Enhanced recent searches update
        setRecentSearches(prev => {
          const newSearch = { 
            english: safeQuery, 
            ibibio: finalResult.ibibio || '', 
            meaning: finalResult.meaning || '' 
          };
          return [newSearch, ...prev.filter(item => 
            item.english && typeof item.english === 'string' && 
            item.english.toLowerCase() !== safeQuery.toLowerCase()
          )].slice(0, 5);
        });
        
        console.log(`✅ Enhanced search completed successfully:`, {
          query: safeQuery,
          mode: searchMode,
          source: searchSource,
          confidence: `${(confidence * 100).toFixed(1)}%`,
          responseTime: `${searchTime.toFixed(1)}ms`,
          hasAlternatives: alternatives.length > 0
        });
        
      } else {
        setCurrentTranslation(null);
        setSearchError(`No translation found for "${safeQuery}" using ${searchMode} search. Try a different search mode or check your spelling.`);
        console.log(`❌ No translation found for: "${safeQuery}"`);
      }

    } catch (error) {
      console.error('❌ Enhanced search error:', error);
      setCurrentTranslation(null);
      setComprehensiveResult(null);
      setSearchError('An unexpected error occurred during search. Please try again or switch to a different search mode.');
      setResponseTime(performance.now() - startTime);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnlineSearch = () => {
    if (searchQuery) {
      handleSearch(searchQuery, true);
    }
  };

  const runEnhancedPerformanceTest = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Running enhanced performance test...');
      
      const testQueries = [
        'hello', 'water', 'love', 'family', 'house', 'food', 'good', 'bad', 'big', 'small',
        'stop', 'god', 'thank you', 'good morning', 'how are you'
      ];
      
      const testResults = [];
      let totalTime = 0;
      let successCount = 0;
      let accuracyScore = 0;
      
      for (const query of testQueries) {
        const start = performance.now();
        
        try {
          // Test with current search mode
          let result;
          switch (searchMode) {
            case 'intelligent':
              result = await intelligentSearchService.searchIntelligently({
                query,
                userContext: undefined,
                previousQueries: [],
                userPreferences: {}
              });
              break;
            case 'comprehensive':
              result = await comprehensiveDictionaryService.search(query, false);
              break;
            default:
              result = await parallelSearchService.search(query);
              break;
          }
          
          const time = performance.now() - start;
          totalTime += time;
          
          const found = !!(result.primaryResult || result.result || result.combinedTranslation);
          if (found) successCount++;
          
          // Calculate accuracy score based on semantic analysis
          if (found) {
            const translation = result.primaryResult || result.result || {
              english: query,
              ibibio: result.combinedTranslation?.ibibio || '',
              meaning: 'Test result',
              partOfSpeech: 'unknown',
              examples: []
            };
            
            const semanticScore = semanticAnalyzer.analyzeMatch(query, translation);
            accuracyScore += semanticScore.totalScore;
          }
          
          testResults.push({
            query,
            found,
            time,
            confidence: result.confidence || 0,
            source: result.source || searchMode,
            semanticScore: found ? semanticAnalyzer.analyzeMatch(query, result.primaryResult || result.result || {
              english: query,
              ibibio: result.combinedTranslation?.ibibio || '',
              meaning: 'Test',
              partOfSpeech: 'unknown',
              examples: []
            }).totalScore : 0
          });
          
        } catch (error) {
          console.error(`Test failed for "${query}":`, error);
          testResults.push({
            query,
            found: false,
            time: performance.now() - start,
            confidence: 0,
            source: 'error',
            semanticScore: 0
          });
        }
      }
      
      const averageTime = totalTime / testQueries.length;
      const successRate = (successCount / testQueries.length) * 100;
      const averageAccuracy = (accuracyScore / successCount) * 100;
      
      setPerformanceMetrics({
        averageResponseTime: averageTime,
        successRate,
        totalSearches: testQueries.length,
        searchAccuracy: averageAccuracy
      });
      
      console.log('📊 Enhanced Performance Test Results:', {
        mode: searchMode,
        averageTime: `${averageTime.toFixed(1)}ms`,
        successRate: `${successRate.toFixed(1)}%`,
        searchAccuracy: `${averageAccuracy.toFixed(1)}%`,
        results: testResults
      });
      
    } catch (error) {
      console.error('❌ Performance test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContextSubmission = async (context: string, selectedOption?: string) => {
    setUserContext(context);
    setNeedsContext(false);
    
    if (selectedOption) {
      const selectedAlternative = alternatives.find(alt => alt.entry.ibibio === selectedOption);
      if (selectedAlternative) {
        setCurrentTranslation(selectedAlternative.entry);
        setSearchSource('user_selection');
        setConfidence(selectedAlternative.confidence);
        setResponseTime(0);
      }
    } else {
      await handleSearch(searchQuery, false);
    }
  };

  const getEnhancedSourceLabel = (source: string) => {
    const sourceLabels: { [key: string]: string } = {
      'intelligent_search': '🧠 Intelligent Search',
      'user_selection': '👤 User Selected',
      'local_dictionary': '📚 Local Dictionary',
      'local_dictionary_exact': '🎯 Local Dictionary (Exact)',
      'local_sentence': '📝 Local Dictionary (Sentence)',
      'huggingface_online': '🤖 Hugging Face Online',
      'huggingface_sentence': '🤖 Hugging Face (Sentence)',
      'local_fallback': '🔄 Local Dictionary (Fallback)',
      'cache': '⚡ Cached Result',
      'dictionary': '📖 Dictionary',
      'online': '🌐 Online',
      'hybrid': '🔀 Hybrid',
      'enhanced_backend': '🚀 Enhanced Backend',
      'langchain_intelligent': '🔗 Intelligent Coordination'
    };
    
    return sourceLabels[source] || source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const stats = dictionaryService.getStats();
  const hasApiKey = !!groqService.getApiKey();
  const hasHuggingFace = huggingFaceService.getStats().isConfigured;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Enhanced Hero Section */}
      <div className="text-center space-y-3 sm:space-y-4 py-4 sm:py-6 lg:py-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
          Ibi-Voice Enhanced
        </h2>
        <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-2">
          Advanced English to Ibibio translation with intelligent search, semantic analysis, and community feedback
        </p>
        
        {/* Enhanced Search Mode Selection */}
        <div className="flex justify-center space-x-2">
          <Button
            variant={searchMode === 'simple' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchMode('simple')}
            className="flex items-center space-x-1"
          >
            <Search className="w-3 h-3" />
            <span>Simple</span>
          </Button>
          <Button
            variant={searchMode === 'comprehensive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchMode('comprehensive')}
            className="flex items-center space-x-1"
          >
            <BookOpen className="w-3 h-3" />
            <span>Comprehensive</span>
          </Button>
          <Button
            variant={searchMode === 'intelligent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchMode('intelligent')}
            className="flex items-center space-x-1"
          >
            <Brain className="w-3 h-3" />
            <span>Intelligent</span>
          </Button>
        </div>
        
        {/* Enhanced Search Mode Description */}
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-green-100 px-3 py-2 rounded-full border border-blue-200 text-xs sm:text-sm">
          {searchMode === 'intelligent' ? (
            <>
              <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
              <span className="font-medium text-purple-700">
                Intelligent Search - Context Aware + Semantic Analysis + Community Feedback
              </span>
            </>
          ) : searchMode === 'comprehensive' ? (
            <>
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
              <span className="font-medium text-blue-700">
                Comprehensive Analysis - Multi-source + Word-by-word + {hasHuggingFace ? 'Online AI' : 'Local Only'}
              </span>
            </>
          ) : (
            <>
              <Search className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
              <span className="font-medium text-green-700">
                Enhanced Simple Search - {hasHuggingFace ? 'Dictionary + Online + Sentences' : 'Dictionary Only'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Enhanced Dictionary Status */}
      {stats.isLoaded && (
        <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg mx-2 sm:mx-0">
          <p className="text-xs sm:text-sm text-green-700">
            <span className="font-semibold">📚 {stats.totalEntries} entries loaded</span>
            <span className="block sm:inline sm:ml-2">
              • {stats.entriesWithExamples} with examples
              • {stats.entriesWithCultural} with cultural context
            </span>
            {hasHuggingFace && <span className="block sm:inline sm:ml-2">• 🤖 AI-enhanced search available</span>}
          </p>
        </div>
      )}

      {/* Enhanced Search Interface */}
      <div className="px-2 sm:px-0">
        <SearchBar 
          onSearch={(query) => handleSearch(query, false)}
          isLoading={isLoading}
          placeholder={
            searchMode === 'intelligent' 
              ? "Enter English word or sentence for intelligent semantic analysis..." 
              : searchMode === 'comprehensive' 
                ? "Enter English word or sentence for comprehensive multi-source analysis..." 
                : "Enter English word or sentence for enhanced search..."
          }
        />
      </div>

      {/* Enhanced Online Search Button */}
      {searchMode === 'comprehensive' && hasHuggingFace && searchQuery && !isLoading && (
        <div className="text-center px-2 sm:px-0">
          <Button
            onClick={handleOnlineSearch}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Globe className="w-4 h-4" />
            <span>Force Online Search</span>
          </Button>
        </div>
      )}

      {/* Enhanced Quick Actions */}
      <div className="px-2 sm:px-0">
        <QuickActions onQuickSearch={(query) => handleSearch(query, false)} />
      </div>

      {/* Enhanced Search Error Display */}
      {searchError && (
        <div className="flex items-start space-x-2 text-red-600 bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 mx-2 sm:mx-0">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p>{searchError}</p>
            <p className="mt-2 text-red-500">
              💡 Try switching to a different search mode or check the debug information below.
            </p>
          </div>
        </div>
      )}

      {/* Enhanced Results Display */}
      {(currentTranslation || comprehensiveResult) && (
        <div className="space-y-3 sm:space-y-4">
          {/* Enhanced Result Metadata */}
          <div className="text-center px-2 sm:px-0">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 text-xs bg-gray-100 px-3 py-2 rounded-full">
              <span>{getEnhancedSourceLabel(searchSource)}</span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center space-x-1">
                <Zap className="w-3 h-3 text-yellow-500" />
                <span>{(confidence * 100).toFixed(0)}% confidence</span>
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-blue-500" />
                <span>{responseTime.toFixed(1)}ms</span>
              </span>
              {searchMode === 'intelligent' && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="text-purple-600 font-medium flex items-center space-x-1">
                    <Brain className="w-3 h-3" />
                    <span>Semantic</span>
                  </span>
                </>
              )}
              {alternatives.length > 0 && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="text-blue-600">{alternatives.length} alternatives</span>
                </>
              )}
            </div>
          </div>
          
          <div className="px-2 sm:px-0">
            {searchMode === 'comprehensive' && comprehensiveResult && !searchMode.includes('intelligent') ? (
              <ComprehensiveSearchResult 
                result={comprehensiveResult}
                isLoading={isLoading}
              />
            ) : (
              <TranslationResult 
                translation={currentTranslation!}
                isLoading={isLoading}
                isMultiWord={isMultiWord}
                localResult={localResult}
                onlineResult={onlineResult}
                wordBreakdown={wordBreakdown}
                source={searchSource}
              />
            )}
          </div>

          {/* Enhanced Alternatives Display */}
          {alternatives.length > 0 && (
            <div className="mt-4 sm:mt-6 px-2 sm:px-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Alternative Translations
              </h3>
              <div className="grid gap-2 sm:gap-3">
                {alternatives.slice(0, 4).map((alt, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                        <span className="font-medium text-blue-700 text-sm sm:text-base">{alt.entry.ibibio}</span>
                        <span className="hidden sm:inline text-gray-600">•</span>
                        <span className="text-gray-700 text-xs sm:text-sm">{alt.entry.meaning}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{alt.reason}</span>
                        <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded">
                          {Math.round(alt.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Feedback Panel */}
          {currentTranslation && (
            <div className="px-2 sm:px-0">
              <FeedbackPanel
                query={searchQuery}
                translation={currentTranslation}
                isVisible={showFeedback}
                onToggle={() => setShowFeedback(!showFeedback)}
              />
            </div>
          )}

          {/* Enhanced Debug Information */}
          {searchDebugInfo && showAdvanced && (
            <div className="mt-4 sm:mt-6 px-2 sm:px-0">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                  <Search className="w-4 h-4 mr-2" />
                  Semantic Analysis Debug
                </h4>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border overflow-x-auto">
                  {searchDebugInfo}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Context Clarification Modal */}
      <ContextClarificationModal
        isOpen={needsContext}
        onClose={() => setNeedsContext(false)}
        onSubmitContext={handleContextSubmission}
        query={searchQuery}
        alternatives={alternatives}
        contextQuestions={contextQuestions}
        ambiguityReason={ambiguityReason}
      />

      {/* Enhanced Recent Searches */}
      {!currentTranslation && !comprehensiveResult && recentSearches.length > 0 && (
        <div className="px-2 sm:px-0">
          <RecentSearches 
            searches={recentSearches}
            onSearchSelect={(query) => handleSearch(query, false)}
          />
        </div>
      )}

      {/* Enhanced Advanced Options */}
      <div className="px-2 sm:px-0">
        <Button 
          variant="outline" 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full sm:w-auto flex items-center justify-center space-x-2"
          size="sm"
        >
          <span>Advanced Options & Debug</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
            {/* Enhanced Performance Metrics */}
            {performanceMetrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                
                <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <Target className="w-3 h-3 text-purple-600" />
                    <span className="text-xs font-medium text-gray-700">Accuracy</span>
                  </div>
                  <p className="text-lg font-bold text-purple-600">
                    {performanceMetrics.searchAccuracy.toFixed(0)}%
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={runEnhancedPerformanceTest}
                    disabled={isLoading}
                    className="w-full text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Test {searchMode}
                  </Button>
                </div>
              </div>
            )}

            {/* Enhanced Service Statistics */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                Service Statistics
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Dictionary Entries:</span>
                  <span className="font-medium ml-2">{stats.totalEntries}</span>
                </div>
                <div>
                  <span className="text-gray-600">Search Engine:</span>
                  <span className="font-medium ml-2">{searchEngine.getStats().isIndexBuilt ? '✅' : '❌'}</span>
                </div>
                <div>
                  <span className="text-gray-600">AI Backend:</span>
                  <span className="font-medium ml-2">{hasHuggingFace ? '✅' : '❌'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Categories:</span>
                  <span className="font-medium ml-2">{stats.categories.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">With Examples:</span>
                  <span className="font-medium ml-2">{stats.entriesWithExamples}</span>
                </div>
                <div>
                  <span className="text-gray-600">Search Mode:</span>
                  <span className="font-medium ml-2 capitalize">{searchMode}</span>
                </div>
              </div>
            </div>

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