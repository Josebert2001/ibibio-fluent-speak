import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Flame, BookOpen, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LearningStats {
  totalWordsLearned: number;
  streakDays: number;
  currentPath?: string;
  pathProgress: number;
  dailyChallengesCompleted: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  experiencePoints: number;
  nextLevelXP: number;
}

interface LearningProgressBarProps {
  stats: LearningStats;
  compact?: boolean;
  className?: string;
}

const LearningProgressBar: React.FC<LearningProgressBarProps> = ({
  stats,
  compact = false,
  className
}) => {
  const progressPercentage = (stats.experiencePoints / stats.nextLevelXP) * 100;
  const pathProgressPercentage = stats.pathProgress;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'text-green-600 bg-green-100';
      case 'intermediate':
        return 'text-blue-600 bg-blue-100';
      case 'advanced':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getStreakColor = (days: number) => {
    if (days >= 30) return 'text-red-600 bg-red-100';
    if (days >= 14) return 'text-orange-600 bg-orange-100';
    if (days >= 7) return 'text-yellow-600 bg-yellow-100';
    return 'text-blue-600 bg-blue-100';
  };

  if (compact) {
    return (
      <Card className={cn("p-3", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={getLevelColor(stats.level)}>
              {stats.level}
            </Badge>
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="w-4 h-4" />
              <span>{stats.totalWordsLearned}</span>
            </div>
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Flame className="w-4 h-4" />
              <span>{stats.streakDays}</span>
            </div>
          </div>
          
          <div className="w-24">
            <Progress 
              value={progressPercentage} 
              className="h-2"
            />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Learning Progress</h3>
          <Badge className={getLevelColor(stats.level)}>
            <Trophy className="w-3 h-3 mr-1" />
            {stats.level.toUpperCase()}
          </Badge>
        </div>

        {/* Level Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Level Progress</span>
            <span className="font-medium">
              {stats.experiencePoints} / {stats.nextLevelXP} XP
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-3"
          />
        </div>

        {/* Current Learning Path */}
        {stats.currentPath && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Current Path</span>
              </div>
              <span className="font-medium">{Math.round(pathProgressPercentage)}%</span>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-primary">
                {stats.currentPath}
              </div>
              <Progress 
                value={pathProgressPercentage} 
                className="h-2"
              />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-lg font-bold">{stats.totalWordsLearned}</div>
            <div className="text-xs text-muted-foreground">Words Learned</div>
          </div>
          
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Flame className={cn("w-5 h-5", getStreakColor(stats.streakDays).split(' ')[0])} />
            </div>
            <div className="text-lg font-bold">{stats.streakDays}</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>
          
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-lg font-bold">{stats.dailyChallengesCompleted}</div>
            <div className="text-xs text-muted-foreground">Challenges</div>
          </div>
        </div>

        {/* Streak Milestone */}
        {stats.streakDays > 0 && (
          <div className="text-center">
            <Badge className={getStreakColor(stats.streakDays)} variant="outline">
              <Flame className="w-3 h-3 mr-1" />
              {stats.streakDays} day learning streak! 
              {stats.streakDays >= 7 && ' 🔥'}
              {stats.streakDays >= 30 && ' Amazing!'}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
};

export default LearningProgressBar;