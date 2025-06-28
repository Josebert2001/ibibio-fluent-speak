import React from 'react';
import { Volume2, Heart, BookOpen, Sparkles, Speaker, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Translation {
  english: string;
  ibibio: string;
  meaning: string;
  partOfSpeech?: string;
  examples?: Array<{ english: string; ibibio: string }>;
  pronunciation?: string;
  cultural?: string;
}

interface TranslationResultProps {
  translation: Translation;
  isLoading: boolean;
}

const TranslationResult = ({ translation, isLoading }: TranslationResultProps) => {
  const [copied, setCopied] = React.useState(false);

  // Helper function to extract concise meaning from full definition
  const getConciseMeaning = (fullMeaning: string, englishWord: string): string | null => {
    if (!fullMeaning || typeof fullMeaning !== 'string') return null;
    
    const meaning = fullMeaning.trim();
    
    // If the meaning is already short and simple (1-3 words without complex punctuation)
    const wordCount = meaning.split(/\s+/).length;
    const hasComplexPunctuation = /[;:,\.\!\?]/.test(meaning);
    
    if (wordCount <= 3 && !hasComplexPunctuation) {
      return meaning;
    }
    
    // If meaning contains semicolon, take the part before first semicolon
    if (meaning.includes(';')) {
      const beforeSemicolon = meaning.split(';')[0].trim();
      const beforeWordCount = beforeSemicolon.split(/\s+/).length;
      
      if (beforeWordCount <= 4 && beforeSemicolon.length > 0) {
        return beforeSemicolon;
      }
    }
    
    // Extract key descriptive words from the beginning of the definition
    const words = meaning.split(/\s+/);
    
    // Look for patterns like "A [adjective] [noun]" or "The [adjective] [noun]"
    if (words.length >= 3) {
      const startsWithArticle = /^(a|an|the)$/i.test(words[0]);
      
      if (startsWithArticle) {
        // Take the next 1-2 words after the article
        const keyWords = words.slice(1, 3).join(' ');
        if (keyWords && !keyWords.includes(',') && !keyWords.includes(';')) {
          return keyWords;
        }
      } else {
        // Take the first 1-2 words if they form a meaningful phrase
        const keyWords = words.slice(0, 2).join(' ');
        if (keyWords && !keyWords.includes(',') && !keyWords.includes(';')) {
          return keyWords;
        }
      }
    }
    
    // If the English word is a single word, use it as a fallback concise meaning
    if (englishWord && englishWord.split(/\s+/).length === 1) {
      return englishWord.toLowerCase();
    }
    
    return null;
  };

  const playPronunciation = () => {
    console.log('Playing pronunciation for:', translation.ibibio);
    // In a real implementation, this would use text-to-speech or audio files
    if ('speechSynthesis' in window && translation.ibibio) {
      const utterance = new SpeechSynthesisUtterance(translation.ibibio);
      utterance.lang = 'en'; // Fallback to English pronunciation
      utterance.rate = 0.7;
      speechSynthesis.speak(utterance);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(translation.ibibio);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const addToFavorites = () => {
    console.log('Added to favorites:', translation);
    // In a real implementation, this would save to user favorites
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <div className="space-y-3 sm:space-y-4 animate-pulse">
            <div className="h-6 sm:h-8 bg-gray-200 rounded-lg w-3/4"></div>
            <div className="h-8 sm:h-12 bg-gray-200 rounded-lg w-1/2"></div>
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Analyze the meaning and extract concise version if possible
  const conciseMeaningToDisplay = getConciseMeaning(translation.meaning, translation.english);
  const showFullMeaningSeparately = conciseMeaningToDisplay && 
    conciseMeaningToDisplay.toLowerCase() !== translation.meaning.toLowerCase();

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 sm:space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Main Translation Card */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 pb-3 sm:pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <h3 className="text-lg sm:text-2xl font-semibold text-gray-800 break-words">{translation.english}</h3>
                {translation.partOfSpeech && (
                  <Badge variant="secondary" className="text-xs self-start sm:self-auto">
                    {translation.partOfSpeech}
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent break-words">
                  {translation.ibibio}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={playPronunciation}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2"
                    title="Play pronunciation"
                  >
                    <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                    ) : (
                      <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {translation.pronunciation && (
                <div className="flex items-center space-x-2">
                  <Speaker className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                  <p className="text-xs sm:text-sm text-gray-600 italic font-mono">{translation.pronunciation}</p>
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={addToFavorites}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 ml-2"
              title="Add to favorites"
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Meaning</h4>
            
            {/* Show concise meaning first if available */}
            {conciseMeaningToDisplay && (
              <div className="mb-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Quick
                  </Badge>
                </div>
                <p className="text-sm sm:text-lg font-medium text-gray-800 bg-green-50 px-3 py-2 rounded-lg border-l-4 border-green-400">
                  {conciseMeaningToDisplay}
                </p>
              </div>
            )}
            
            {/* Show full definition if it's different from concise meaning */}
            {showFullMeaningSeparately && (
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    Full
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-gray-700 bg-blue-50 px-3 py-2 rounded-lg border-l-4 border-blue-400">
                  {translation.meaning}
                </p>
              </div>
            )}
            
            {/* Show only the original meaning if no concise version was extracted */}
            {!conciseMeaningToDisplay && (
              <p className="text-sm sm:text-base text-gray-700">{translation.meaning}</p>
            )}
          </div>

          {translation.examples && translation.examples.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center text-sm sm:text-base">
                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Examples
              </h4>
              <div className="space-y-2 sm:space-y-3">
                {translation.examples.slice(0, 2).map((example, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 sm:p-4 border-l-4 border-blue-200">
                    <p className="text-xs sm:text-sm text-gray-800 mb-1">{example.english}</p>
                    <p className="text-sm sm:text-base text-blue-700 font-medium">{example.ibibio}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {translation.cultural && (
            <div className="border-t pt-3 sm:pt-4">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center text-sm sm:text-base">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-purple-600" />
                Cultural Context
              </h4>
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 sm:p-4 border border-purple-100">
                <p className="text-xs sm:text-sm text-gray-700 italic leading-relaxed">{translation.cultural}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationResult;