
import React from 'react';
import { Volume2, Heart, BookOpen, Sparkles } from 'lucide-react';
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
  const playPronunciation = () => {
    console.log('Playing pronunciation for:', translation.ibibio);
  };

  const addToFavorites = () => {
    console.log('Added to favorites:', translation);
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardContent className="p-8">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded-lg w-3/4"></div>
            <div className="h-12 bg-gray-200 rounded-lg w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Main Translation Card */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-2xl font-semibold text-gray-800">{translation.english}</h3>
                {translation.partOfSpeech && (
                  <Badge variant="secondary" className="text-xs">
                    {translation.partOfSpeech}
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {translation.ibibio}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={playPronunciation}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
              </div>
              {translation.pronunciation && (
                <p className="text-sm text-gray-600 italic">/{translation.pronunciation}/</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={addToFavorites}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Heart className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Meaning</h4>
            <p className="text-gray-700">{translation.meaning}</p>
          </div>

          {translation.examples && translation.examples.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <BookOpen className="w-4 h-4 mr-2" />
                Examples
              </h4>
              <div className="space-y-3">
                {translation.examples.map((example, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-800 mb-1">{example.english}</p>
                    <p className="text-blue-700 font-medium">{example.ibibio}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {translation.cultural && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                Cultural Context
              </h4>
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
                <p className="text-gray-700 italic">{translation.cultural}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationResult;
