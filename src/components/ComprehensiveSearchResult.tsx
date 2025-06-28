import React, { useState } from 'react';
import { 
  BookOpen, 
  Globe, 
  Search, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Database,
  Sparkles,
  ArrowRight,
  Copy,
  Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface WordAnalysis {
  word: string;
  cleanWord: string;
  dictionaryEntry: any;
  found: boolean;
  confidence: number;
  partOfSpeech?: string;
  examples: Array<{ english: string; ibibio: string }>;
  alternatives: any[];
}

interface OnlineSearchResult {
  definitions: Array<{
    source: string;
    definition: string;
    ibibio: string;
    confidence: number;
  }>;
  relatedPhrases: Array<{
    phrase: string;
    translation: string;
    context: string;
  }>;
  webExamples: Array<{
    english: string;
    ibibio: string;
    source: string;
  }>;
  additionalResources: Array<{
    title: string;
    url: string;
    description: string;
  }>;
}

interface ComprehensiveSearchResultProps {
  result: {
    inputText: string;
    isMultiWord: boolean;
    wordAnalyses: WordAnalysis[];
    dictionaryResults: {
      totalWords: number;
      foundWords: number;
      coverage: number;
      overallConfidence: number;
    };
    onlineResults: OnlineSearchResult | null;
    combinedTranslation: {
      ibibio: string;
      confidence: number;
      source: 'dictionary' | 'online' | 'hybrid';
    } | null;
    requestedOnlineSearch: boolean;
  };
  isLoading: boolean;
}

const ComprehensiveSearchResult = ({ result, isLoading }: ComprehensiveSearchResultProps) => {
  const [expandedWords, setExpandedWords] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  const toggleWordExpansion = (index: number) => {
    const newExpanded = new Set(expandedWords);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedWords(newExpanded);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const playPronunciation = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en';
      utterance.rate = 0.7;
      speechSynthesis.speak(utterance);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded-lg w-3/4"></div>
            <div className="h-12 bg-gray-200 rounded-lg w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'dictionary': return <Database className="w-4 h-4" />;
      case 'online': return <Globe className="w-4 h-4" />;
      case 'hybrid': return <Sparkles className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'dictionary': return 'bg-green-100 text-green-800 border-green-200';
      case 'online': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'hybrid': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Combined Translation Result */}
      {result.combinedTranslation && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-semibold text-gray-800">{result.inputText}</h3>
                <div className="flex items-center space-x-4">
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {result.combinedTranslation.ibibio}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => playPronunciation(result.combinedTranslation!.ibibio)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(result.combinedTranslation!.ibibio)}
                      className="text-green-600 hover:bg-green-50"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={`${getSourceColor(result.combinedTranslation.source)} flex items-center space-x-1`}>
                    {getSourceIcon(result.combinedTranslation.source)}
                    <span className="capitalize">{result.combinedTranslation.source}</span>
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {result.combinedTranslation.confidence}% confidence
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Detailed Results Tabs */}
      <Tabs defaultValue="dictionary" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dictionary" className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span>Dictionary Results</span>
            <Badge variant="secondary" className="ml-2">
              {result.dictionaryResults.foundWords}/{result.dictionaryResults.totalWords}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="online" className="flex items-center space-x-2" disabled={!result.onlineResults}>
            <Globe className="w-4 h-4" />
            <span>Online Results</span>
            {result.onlineResults && (
              <Badge variant="secondary" className="ml-2">
                {result.onlineResults.definitions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Dictionary Results Tab */}
        <TabsContent value="dictionary" className="space-y-4">
          {/* Dictionary Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-green-600" />
                <span>Dictionary Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.dictionaryResults.totalWords}
                  </div>
                  <div className="text-sm text-gray-600">Total Words</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.dictionaryResults.foundWords}
                  </div>
                  <div className="text-sm text-gray-600">Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {result.dictionaryResults.coverage}%
                  </div>
                  <div className="text-sm text-gray-600">Coverage</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {result.dictionaryResults.overallConfidence}%
                  </div>
                  <div className="text-sm text-gray-600">Confidence</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Word-by-Word Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Word-by-Word Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.wordAnalyses.map((word, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          {word.found ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span className="font-medium">{word.word}</span>
                        </div>
                        {word.found && (
                          <>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <span className="text-blue-700 font-medium">
                              {word.dictionaryEntry.ibibio}
                            </span>
                            {word.partOfSpeech && (
                              <Badge variant="outline" className="text-xs">
                                {word.partOfSpeech}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {word.found && (
                          <span className="text-sm text-green-600 font-medium">
                            {Math.round(word.confidence)}%
                          </span>
                        )}
                        {word.found && (word.examples.length > 0 || word.alternatives.length > 0) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleWordExpansion(index)}
                          >
                            {expandedWords.has(index) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {word.found && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-700">{word.dictionaryEntry.meaning}</p>
                      </div>
                    )}

                    {/* Expanded Details */}
                    {expandedWords.has(index) && word.found && (
                      <div className="mt-4 space-y-3 border-t pt-3">
                        {/* Examples */}
                        {word.examples.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-800 mb-2">Examples</h5>
                            <div className="space-y-2">
                              {word.examples.slice(0, 2).map((example, exIndex) => (
                                <div key={exIndex} className="bg-gray-50 rounded p-2">
                                  <p className="text-sm text-gray-800">{example.english}</p>
                                  <p className="text-sm text-blue-700 font-medium">{example.ibibio}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Alternatives */}
                        {word.alternatives.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-800 mb-2">Alternative Translations</h5>
                            <div className="flex flex-wrap gap-2">
                              {word.alternatives.slice(0, 3).map((alt, altIndex) => (
                                <Badge key={altIndex} variant="outline" className="text-xs">
                                  {alt.ibibio}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Online Results Tab */}
        <TabsContent value="online" className="space-y-4">
          {result.onlineResults ? (
            <>
              {/* Online Definitions */}
              {result.onlineResults.definitions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="w-5 h-5 text-blue-600" />
                      <span>Online Definitions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {result.onlineResults.definitions.map((def, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline">{def.source}</Badge>
                            <span className="text-sm text-blue-600 font-medium">
                              {Math.round(def.confidence * 100)}%
                            </span>
                          </div>
                          <div className="space-y-2">
                            <p className="text-gray-700">{def.definition}</p>
                            <div className="flex items-center space-x-2">
                              <span className="text-blue-700 font-medium text-lg">{def.ibibio}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(def.ibibio)}
                                className="text-green-600"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Related Phrases */}
              {result.onlineResults.relatedPhrases.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Related Phrases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.onlineResults.relatedPhrases.map((phrase, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{phrase.phrase}</span>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <span className="text-blue-700 font-medium">{phrase.translation}</span>
                          </div>
                          <p className="text-sm text-gray-600">{phrase.context}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Web Examples */}
              {result.onlineResults.webExamples.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Examples from Web</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.onlineResults.webExamples.map((example, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="space-y-2">
                            <p className="text-gray-800">{example.english}</p>
                            <p className="text-blue-700 font-medium">{example.ibibio}</p>
                            <Badge variant="outline" className="text-xs">{example.source}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Resources */}
              {result.onlineResults.additionalResources.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Resources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.onlineResults.additionalResources.map((resource, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h5 className="font-medium text-gray-800">{resource.title}</h5>
                              <p className="text-sm text-gray-600">{resource.description}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(resource.url, '_blank')}
                              className="text-blue-600"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">No Online Results</h3>
                <p className="text-gray-600">
                  Online search was not performed or no results were found.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComprehensiveSearchResult;