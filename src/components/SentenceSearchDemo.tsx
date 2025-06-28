import React, { useState } from 'react';
import { Search, Play, TestTube, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  searchWordInSentence, 
  searchMultipleWords,
  containsAnyWord,
  containsAllWords,
  highlightWordsInSentence,
  getWordPositions,
  runExamples,
  runTests,
  type WordSearchOptions 
} from '../utils/sentenceWordSearch';

const SentenceSearchDemo = () => {
  const [sentence, setSentence] = useState("Hello world! How are you today? I'm fine, thanks.");
  const [searchTerm, setSearchTerm] = useState("world");
  const [options, setOptions] = useState<WordSearchOptions>({
    caseSensitive: false,
    matchWholeWords: false,
    includePositions: true,
    removePunctuation: true
  });
  const [result, setResult] = useState<any>(null);
  const [multipleTerms, setMultipleTerms] = useState("hello,world,today");

  const handleSearch = () => {
    const searchResult = searchWordInSentence(sentence, searchTerm, options);
    setResult(searchResult);
  };

  const handleMultipleSearch = () => {
    const terms = multipleTerms.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const multipleResults = searchMultipleWords(sentence, terms, options);
    setResult({ type: 'multiple', results: multipleResults });
  };

  const handleContainsTest = () => {
    const terms = multipleTerms.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const containsAny = containsAnyWord(sentence, terms, options);
    const containsAll = containsAllWords(sentence, terms, options);
    setResult({ type: 'contains', containsAny, containsAll, terms });
  };

  const runExampleTests = () => {
    console.log('Running examples...');
    runExamples();
    setResult({ type: 'examples', message: 'Examples run complete! Check console for output.' });
  };

  const runUnitTests = () => {
    console.log('Running unit tests...');
    const testsPassed = runTests();
    setResult({ 
      type: 'tests', 
      passed: testsPassed, 
      message: `Unit tests ${testsPassed ? 'PASSED' : 'FAILED'}! Check console for details.` 
    });
  };

  const exampleSentences = [
    "Hello world! How are you today? I'm fine, thanks.",
    "The quick brown fox jumps over the lazy dog.",
    "JavaScript is a powerful programming language for web development.",
    "I love programming in Python, JavaScript, and TypeScript.",
    "  Multiple   spaces    and   punctuation!!!   Test   sentence.  ",
    "The cat catches mice in the cathedral near the castle."
  ];

  const exampleSearchTerms = [
    "world",
    "quick brown",
    "programming",
    "cat",
    "JavaScript",
    "hello"
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          Sentence Word Search Function Demo
        </h2>
        <p className="text-lg text-gray-600">
          Interactive demonstration of the comprehensive sentence word search utility
        </p>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search">Single Search</TabsTrigger>
          <TabsTrigger value="multiple">Multiple Search</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="w-5 h-5 mr-2" />
                Single Word/Phrase Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sentence to search in:</label>
                <Input
                  value={sentence}
                  onChange={(e) => setSentence(e.target.value)}
                  placeholder="Enter a sentence..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Search term:</label>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Enter word or phrase to search..."
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="caseSensitive"
                    checked={options.caseSensitive}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, caseSensitive: !!checked }))
                    }
                  />
                  <label htmlFor="caseSensitive" className="text-sm">Case Sensitive</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="wholeWords"
                    checked={options.matchWholeWords}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, matchWholeWords: !!checked }))
                    }
                  />
                  <label htmlFor="wholeWords" className="text-sm">Whole Words Only</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="positions"
                    checked={options.includePositions}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, includePositions: !!checked }))
                    }
                  />
                  <label htmlFor="positions" className="text-sm">Include Positions</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="removePunctuation"
                    checked={options.removePunctuation}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, removePunctuation: !!checked }))
                    }
                  />
                  <label htmlFor="removePunctuation" className="text-sm">Remove Punctuation</label>
                </div>
              </div>

              <Button onClick={handleSearch} className="w-full">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>

              {/* Quick Examples */}
              <div className="space-y-2">
                <h4 className="font-medium">Quick Examples:</h4>
                <div className="flex flex-wrap gap-2">
                  {exampleSentences.map((example, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setSentence(example)}
                      className="text-xs"
                    >
                      Example {index + 1}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {exampleSearchTerms.map((term, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchTerm(term)}
                      className="text-xs"
                    >
                      "{term}"
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Display */}
          {result && result.type !== 'multiple' && result.type !== 'contains' && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Badge variant={result.found ? "default" : "destructive"}>
                      {result.found ? "Found" : "Not Found"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">
                      Matches: {result.matchedWords?.length || 0}
                    </span>
                  </div>
                </div>

                {result.found && (
                  <>
                    <div>
                      <h4 className="font-medium mb-2">Matched Words:</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.matchedWords.map((word: string, index: number) => (
                          <Badge key={index} variant="secondary">{word}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Word Positions:</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.positions.map((pos: number, index: number) => (
                          <Badge key={index} variant="outline">Position {pos}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <h4 className="font-medium mb-2">Original Sentence:</h4>
                  <p className="text-sm bg-gray-50 p-2 rounded">{sentence}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Cleaned Sentence:</h4>
                  <p className="text-sm bg-gray-50 p-2 rounded">{result.cleanedSentence}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Word Array:</h4>
                  <div className="flex flex-wrap gap-1">
                    {result.cleanedWords?.map((word: string, index: number) => (
                      <Badge 
                        key={index} 
                        variant={result.positions?.includes(index) ? "default" : "outline"}
                        className="text-xs"
                      >
                        {index}: {word}
                      </Badge>
                    ))}
                  </div>
                </div>

                {result.found && (
                  <div>
                    <h4 className="font-medium mb-2">Highlighted Text:</h4>
                    <div 
                      className="text-sm bg-gray-50 p-2 rounded"
                      dangerouslySetInnerHTML={{
                        __html: highlightWordsInSentence(sentence, searchTerm, options, 'bg-yellow-200 px-1 rounded')
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="multiple" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Multiple Word Search & Contains Tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sentence:</label>
                <Input
                  value={sentence}
                  onChange={(e) => setSentence(e.target.value)}
                  placeholder="Enter a sentence..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Search terms (comma-separated):</label>
                <Input
                  value={multipleTerms}
                  onChange={(e) => setMultipleTerms(e.target.value)}
                  placeholder="word1,word2,phrase with spaces"
                />
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleMultipleSearch} className="flex-1">
                  Search Multiple
                </Button>
                <Button onClick={handleContainsTest} variant="outline" className="flex-1">
                  Contains Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Multiple Search Results */}
          {result && (result.type === 'multiple' || result.type === 'contains') && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {result.type === 'multiple' ? 'Multiple Search Results' : 'Contains Test Results'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.type === 'multiple' && (
                  <div className="space-y-3">
                    {Object.entries(result.results).map(([term, searchResult]: [string, any]) => (
                      <div key={term} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">"{term}"</span>
                          <Badge variant={searchResult.found ? "default" : "destructive"}>
                            {searchResult.found ? "Found" : "Not Found"}
                          </Badge>
                        </div>
                        {searchResult.found && (
                          <div className="text-sm text-gray-600">
                            Positions: [{searchResult.positions.join(', ')}] | 
                            Matches: [{searchResult.matchedWords.join(', ')}]
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {result.type === 'contains' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded p-3">
                        <h4 className="font-medium mb-2">Contains ANY word:</h4>
                        <Badge variant={result.containsAny ? "default" : "destructive"}>
                          {result.containsAny ? "YES" : "NO"}
                        </Badge>
                      </div>
                      <div className="border rounded p-3">
                        <h4 className="font-medium mb-2">Contains ALL words:</h4>
                        <Badge variant={result.containsAll ? "default" : "destructive"}>
                          {result.containsAll ? "YES" : "NO"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Tested words:</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.terms.map((term: string, index: number) => (
                          <Badge key={index} variant="outline">{term}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="w-5 h-5 mr-2" />
                Function Examples
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Click the button below to run comprehensive examples that demonstrate all features 
                of the sentence word search function. Check the browser console for detailed output.
              </p>
              
              <Button onClick={runExampleTests} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Run Examples (Check Console)
              </Button>

              {result && result.type === 'examples' && (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <p className="text-green-800">{result.message}</p>
                </div>
              )}

              <div className="space-y-4 text-sm">
                <h4 className="font-medium">Examples include:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Basic word search with exact matches</li>
                  <li>Case sensitive vs case insensitive searching</li>
                  <li>Phrase search (multiple words)</li>
                  <li>Punctuation handling and text cleaning</li>
                  <li>Whole word vs partial word matching</li>
                  <li>Edge cases: empty strings, multiple spaces, special characters</li>
                  <li>Word position tracking with character indices</li>
                  <li>Multiple word search functionality</li>
                  <li>Contains any/all word testing</li>
                  <li>Text highlighting with HTML markup</li>
                  <li>Performance testing with large text</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TestTube className="w-5 h-5 mr-2" />
                Unit Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Run comprehensive unit tests to verify all functions work correctly. 
                Test results will be displayed here and in the console.
              </p>
              
              <Button onClick={runUnitTests} className="w-full">
                <TestTube className="w-4 h-4 mr-2" />
                Run Unit Tests
              </Button>

              {result && result.type === 'tests' && (
                <div className={`border rounded p-4 ${
                  result.passed 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <p className="font-medium">{result.message}</p>
                </div>
              )}

              <div className="space-y-4 text-sm">
                <h4 className="font-medium">Tests cover:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Basic search functionality</li>
                  <li>Case sensitivity options</li>
                  <li>Empty input handling</li>
                  <li>Sentence cleaning function</li>
                  <li>Word splitting accuracy</li>
                  <li>Position tracking correctness</li>
                  <li>Edge case handling</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SentenceSearchDemo;