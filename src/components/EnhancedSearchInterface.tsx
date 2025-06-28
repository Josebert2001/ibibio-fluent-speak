import React, { useState, useEffect } from 'react';
import { Search, Loader2, Clock, Database, Globe, Brain, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { dictionarySearchService } from '../services/dictionarySearchService';
import TranslationResult from './TranslationResult';
import { DictionaryEntry } from '../types/dictionary';

interface SearchResult {
  word: string;
  definition: DictionaryEntry | null;
  source: 'local' | 'online' | 'ai' | 'cache';
  responseTime: number;
  confidence: number;
  error?: string;
  cached?: boolean;
}

const EnhancedSearchInterface = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);
  const [cacheStats, setCacheStats] = useState({
    totalEntries: 0,
    localEntries: 0,
    onlineEntries: 0,
    aiEntries: 0
  });

  useEffect(() => {
    updateCacheStats();
  }, []);

  const updateCacheStats = () => {
    const stats = dictionarySearchService.getCacheStats();
    setCacheStats(stats);
  };

  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setSearchResult(null);

    try {
      const result = await dictionarySearchService.searchWord(query.trim());
      setSearchResult(result);
      
      // Add to search history
      setSearchHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 searches
      
      // Update cache stats
      updateCacheStats();
    } catch (error) {
      console.error('Search error:', error);
      setSearchResult({
        word: query,
        definition: null,
        source: 'local',
        responseTime: 0,
        confidence: 0,
        error: 'Search failed due to an unexpected error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const clearCache = () => {
    dictionarySearchService.clearCache();
    updateCacheStats();
    setSearchHistory([]);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'local': return <Database className="w-4 h-4" />;
      case 'online': return <Globe className="w-4 h-4" />;
      case 'ai': return <Brain className="w-4 h-4" />;
      case 'cache': return <Clock className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'local': return 'bg-green-100 text-green-800';
      case 'online': return 'bg-blue-100 text-blue-800';
      case 'ai': return 'bg-purple-100 text-purple-800';
      case 'cache': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Enhanced Dictionary Search
        </h2>
        <p className="text-xl text-gray-600">
          Search local dictionary first, then automatically check online sources
        </p>
      </div>

      {/* Search Form */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter any English word to search..."
                className="w-full h-14 pl-12 pr-20 text-lg bg-white border-2 border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 rounded-xl"
                disabled={isLoading}
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              
              <Button
                type="submit"
                disabled={!searchQuery.trim() || isLoading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Search'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Cache Statistics */}
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Search Statistics</CardTitle>
            <Button variant="outline" size="sm" onClick={clearCache}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cache
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{cacheStats.localEntries}</div>
              <div className="text-sm text-gray-600">Local Results</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{cacheStats.onlineEntries}</div>
              <div className="text-sm text-gray-600">Online Results</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{cacheStats.aiEntries}</div>
              <div className="text-sm text-gray-600">AI Results</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{cacheStats.totalEntries}</div>
              <div className="text-sm text-gray-600">Total Cached</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Result */}
      {searchResult && (
        <div className="space-y-4">
          {/* Result Metadata */}
          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-4">
                  <Badge className={`${getSourceColor(searchResult.source)} flex items-center space-x-1`}>
                    {getSourceIcon(searchResult.source)}
                    <span className="capitalize">{searchResult.source} Search</span>
                  </Badge>
                  
                  {searchResult.cached && (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      <Clock className="w-3 h-3 mr-1" />
                      Cached
                    </Badge>
                  )}
                  
                  <span className="text-sm text-gray-600">
                    Response: {searchResult.responseTime.toFixed(1)}ms
                  </span>
                  
                  {searchResult.confidence > 0 && (
                    <span className="text-sm text-gray-600">
                      Confidence: {(searchResult.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Result Content */}
          {searchResult.error ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{searchResult.error}</AlertDescription>
            </Alert>
          ) : searchResult.definition ? (
            <TranslationResult 
              translation={searchResult.definition}
              isLoading={false}
            />
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No definition found for "{searchResult.word}". The word may not exist in our dictionaries.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Search History */}
      {searchHistory.length > 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Recent Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {searchHistory.slice(0, 5).map((result, index) => (
                <div
                  key={index}
                  onClick={() => handleSearch(result.word)}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/70 hover:bg-white hover:shadow-md transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-800">{result.word}</span>
                    {result.definition ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge size="sm" className={`${getSourceColor(result.source)} text-xs`}>
                      {getSourceIcon(result.source)}
                      <span className="ml-1 capitalize">{result.source}</span>
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {result.responseTime.toFixed(0)}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Database className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">1. Local Search</h4>
                <p className="text-gray-600">First searches your local dictionary for instant results</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Globe className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">2. Online Search</h4>
                <p className="text-gray-600">If not found locally, searches reliable online dictionaries</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">3. Smart Caching</h4>
                <p className="text-gray-600">Caches results for faster future searches</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedSearchInterface;