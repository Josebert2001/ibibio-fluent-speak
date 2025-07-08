import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Volume2, BookOpen, Globe, Info, Star, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WordDetails {
  ibibio: string;
  meaning: string;
  pronunciation?: string;
  cultural?: string;
  examples?: Array<{
    english: string;
    ibibio: string;
  }>;
  partOfSpeech?: string;
  relatedWords?: string[];
}

interface InteractiveWordCardProps {
  word: string;
  details: WordDetails;
  onPlayPronunciation?: (text: string) => void;
  onExploreRelated?: (word: string) => void;
  onLearnMore?: (word: string) => void;
  isLearned?: boolean;
  onMarkAsLearned?: (word: string) => void;
  variant?: 'compact' | 'detailed' | 'preview';
  className?: string;
}

const InteractiveWordCard: React.FC<InteractiveWordCardProps> = ({
  word,
  details,
  onPlayPronunciation,
  onExploreRelated,
  onLearnMore,
  isLearned = false,
  onMarkAsLearned,
  variant = 'detailed',
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCultural, setShowCultural] = useState(false);

  const handlePronunciation = () => {
    if (onPlayPronunciation) {
      onPlayPronunciation(details.ibibio);
    }
  };

  const handleMarkAsLearned = () => {
    if (onMarkAsLearned) {
      onMarkAsLearned(word);
    }
  };

  if (variant === 'preview') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "cursor-pointer hover:bg-accent transition-colors",
              isLearned && "bg-green-100 text-green-800 border-green-300",
              className
            )}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="font-medium">{details.ibibio}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-semibold">{details.ibibio}</div>
            <div className="text-sm text-muted-foreground">{details.meaning}</div>
            {details.pronunciation && (
              <div className="text-xs italic">/{details.pronunciation}/</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Card className={cn(
      "p-4 border-l-4 border-l-primary transition-all hover:shadow-md",
      isLearned && "border-l-green-500 bg-green-50/50",
      variant === 'compact' && "p-3",
      className
    )}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {details.ibibio}
              </h3>
              <p className="text-sm text-muted-foreground">
                "{word}" in English
              </p>
            </div>
            
            {isLearned && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Star className="w-3 h-3 mr-1" />
                Learned
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onPlayPronunciation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePronunciation}
                title="Play pronunciation"
              >
                <Volume2 className="w-4 h-4" />
              </Button>
            )}
            
            {!isLearned && onMarkAsLearned && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAsLearned}
                title="Mark as learned"
                className="text-muted-foreground hover:text-green-600"
              >
                <Star className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Meaning */}
        <div className="space-y-2">
          <div className="text-sm">
            <strong>Meaning:</strong> {details.meaning}
          </div>
          
          {details.partOfSpeech && (
            <Badge variant="outline" className="text-xs">
              {details.partOfSpeech}
            </Badge>
          )}

          {details.pronunciation && (
            <div className="text-sm text-muted-foreground">
              <strong>Pronunciation:</strong> /{details.pronunciation}/
            </div>
          )}
        </div>

        {/* Cultural Context */}
        {details.cultural && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCultural(!showCultural)}
              className="p-0 h-auto text-sm text-primary hover:text-primary/80"
            >
              <Globe className="w-4 h-4 mr-1" />
              {showCultural ? 'Hide' : 'Show'} Cultural Context
            </Button>
            
            {showCultural && (
              <Card className="p-3 bg-blue-50 border-blue-200">
                <div className="text-sm text-blue-800">
                  <Info className="w-4 h-4 inline mr-1" />
                  {details.cultural}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Examples */}
        {details.examples && details.examples.length > 0 && variant === 'detailed' && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0 h-auto text-sm text-primary hover:text-primary/80"
            >
              <BookOpen className="w-4 h-4 mr-1" />
              {isExpanded ? 'Hide' : 'Show'} Examples ({details.examples.length})
            </Button>
            
            {isExpanded && (
              <div className="space-y-2">
                {details.examples.slice(0, 3).map((example, index) => (
                  <Card key={index} className="p-3 bg-muted/50">
                    <div className="space-y-1">
                      <div className="text-sm">
                        <strong>English:</strong> {example.english}
                      </div>
                      <div className="text-sm text-primary font-medium">
                        <strong>Ibibio:</strong> {example.ibibio}
                        {onPlayPronunciation && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPlayPronunciation(example.ibibio)}
                            className="ml-2 p-0 h-auto"
                          >
                            <Volume2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Related Words */}
        {details.relatedWords && details.relatedWords.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Related words:</div>
            <div className="flex flex-wrap gap-2">
              {details.relatedWords.slice(0, 4).map((relatedWord, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onExploreRelated?.(relatedWord)}
                  className="text-xs"
                >
                  {relatedWord}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {variant === 'detailed' && onLearnMore && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLearnMore(word)}
              className="text-sm text-primary hover:text-primary/80"
            >
              <BookOpen className="w-4 h-4 mr-1" />
              Learn more about "{word}"
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default InteractiveWordCard;