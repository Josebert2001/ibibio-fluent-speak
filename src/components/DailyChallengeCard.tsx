import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Trophy, 
  CheckCircle, 
  Clock, 
  Star,
  Gift,
  Target,
  Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyChallenge {
  id: string;
  date: string;
  type: 'word_of_day' | 'cultural_fact' | 'translation_challenge' | 'pronunciation';
  title: string;
  content: string;
  difficulty: number;
  reward: number;
  completed: boolean;
  userAnswer?: string;
  correctAnswer?: string;
}

interface DailyChallengeCardProps {
  challenge: DailyChallenge;
  onComplete?: (challengeId: string, answer?: string) => void;
  onPlayPronunciation?: (text: string) => void;
  className?: string;
}

const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({
  challenge,
  onComplete,
  onPlayPronunciation,
  className
}) => {
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'word_of_day':
        return <Star className="w-5 h-5 text-yellow-600" />;
      case 'cultural_fact':
        return <Trophy className="w-5 h-5 text-purple-600" />;
      case 'translation_challenge':
        return <Target className="w-5 h-5 text-blue-600" />;
      case 'pronunciation':
        return <Volume2 className="w-5 h-5 text-green-600" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getChallengeColor = (type: string) => {
    switch (type) {
      case 'word_of_day':
        return 'border-yellow-200 bg-yellow-50';
      case 'cultural_fact':
        return 'border-purple-200 bg-purple-50';
      case 'translation_challenge':
        return 'border-blue-200 bg-blue-50';
      case 'pronunciation':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-muted bg-muted/50';
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 1) return 'bg-green-100 text-green-800';
    if (difficulty <= 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getDifficultyText = (difficulty: number) => {
    if (difficulty <= 1) return 'Easy';
    if (difficulty <= 2) return 'Medium';
    return 'Hard';
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(challenge.id, userAnswer || undefined);
    }
  };

  const handleStartChallenge = () => {
    setIsAnswering(true);
  };

  const handleRevealAnswer = () => {
    setShowAnswer(true);
  };

  const isInteractiveChallenge = challenge.type === 'translation_challenge' || challenge.type === 'pronunciation';

  return (
    <Card className={cn(
      "p-4 transition-all hover:shadow-md",
      getChallengeColor(challenge.type),
      challenge.completed && "opacity-75",
      className
    )}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getChallengeIcon(challenge.type)}
            <div>
              <h3 className="font-semibold text-foreground">
                {challenge.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{new Date(challenge.date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={getDifficultyColor(challenge.difficulty)}>
              {getDifficultyText(challenge.difficulty)}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Gift className="w-3 h-3" />
              {challenge.reward} XP
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            {challenge.content}
          </p>

          {/* Interactive Challenge Input */}
          {isInteractiveChallenge && !challenge.completed && isAnswering && (
            <div className="space-y-3 p-3 bg-background rounded-lg border">
              <div className="text-sm font-medium">Your Answer:</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {challenge.type === 'pronunciation' && onPlayPronunciation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPlayPronunciation(challenge.content)}
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Show correct answer if completed or revealed */}
          {(challenge.completed || showAnswer) && challenge.correctAnswer && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-medium text-green-800 mb-1">
                Correct Answer:
              </div>
              <div className="text-sm text-green-700">
                {challenge.correctAnswer}
              </div>
              {challenge.userAnswer && challenge.userAnswer !== challenge.correctAnswer && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Your answer: {challenge.userAnswer}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          {challenge.completed ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Completed!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Daily Challenge</span>
            </div>
          )}

          <div className="flex gap-2">
            {!challenge.completed && !isAnswering && isInteractiveChallenge && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleStartChallenge}
              >
                Start Challenge
              </Button>
            )}
            
            {!challenge.completed && isAnswering && (
              <Button 
                size="sm"
                onClick={handleComplete}
                disabled={isInteractiveChallenge && !userAnswer.trim()}
              >
                Complete
              </Button>
            )}
            
            {!challenge.completed && !isInteractiveChallenge && (
              <Button 
                size="sm"
                onClick={handleComplete}
              >
                Mark Complete
              </Button>
            )}

            {!challenge.completed && challenge.correctAnswer && !showAnswer && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRevealAnswer}
              >
                Show Answer
              </Button>
            )}
          </div>
        </div>

        {/* Progress indicator for difficulty */}
        {challenge.difficulty > 1 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Difficulty</div>
            <Progress 
              value={(challenge.difficulty / 3) * 100} 
              className="h-1"
            />
          </div>
        )}
      </div>
    </Card>
  );
};

export default DailyChallengeCard;