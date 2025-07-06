
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Star, 
  MessageSquare, 
  Edit3, 
  ChevronDown, 
  ChevronUp,
  Send
} from 'lucide-react';
import { DictionaryEntry } from '../types/dictionary';
import { feedbackService } from '../services/feedbackService';
import { useToast } from '@/hooks/use-toast';

interface FeedbackPanelProps {
  query: string;
  translation: DictionaryEntry;
  isVisible: boolean;
  onToggle: () => void;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  query,
  translation,
  isVisible,
  onToggle
}) => {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [correction, setCorrection] = useState<string>('');
  const [context, setContext] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'rating' | 'correction' | 'context'>('rating');
  const { toast } = useToast();

  const handleQuickFeedback = async (isHelpful: boolean) => {
    setIsSubmitting(true);
    try {
      if (isHelpful) {
        await feedbackService.markAsHelpful(query, translation, context || undefined);
        toast({
          title: "Thank you!",
          description: "Your feedback helps improve translations for everyone.",
        });
      } else {
        await feedbackService.markAsUnhelpful(query, translation, context || undefined);
        toast({
          title: "Feedback received",
          description: "We'll use this to improve future translations.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    try {
      await feedbackService.rateFeedback(query, translation, rating, context || undefined);
      toast({
        title: "Rating submitted!",
        description: `Thank you for rating this translation ${rating} star${rating !== 1 ? 's' : ''}.`,
      });
      setRating(0);
      setContext('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCorrectionSubmit = async () => {
    if (!correction.trim()) return;
    
    setIsSubmitting(true);
    try {
      await feedbackService.submitCorrection(query, translation, correction.trim(), context || undefined);
      toast({
        title: "Correction submitted!",
        description: "Thank you for helping improve our translations.",
      });
      setCorrection('');
      setContext('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit correction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStarColor = (starIndex: number) => {
    const currentRating = hoveredRating || rating;
    return starIndex <= currentRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300';
  };

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">
            Was this translation helpful?
          </span>
        </div>
        {isVisible ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {/* Content */}
      {isVisible && (
        <div className="border-t p-4 space-y-4">
          {/* Quick Feedback */}
          <div className="flex items-center justify-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickFeedback(true)}
              disabled={isSubmitting}
              className="flex items-center space-x-2"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Helpful</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickFeedback(false)}
              disabled={isSubmitting}
              className="flex items-center space-x-2"
            >
              <ThumbsDown className="w-4 h-4" />
              <span>Not Helpful</span>
            </Button>
          </div>

          {/* Detailed Feedback Tabs */}
          <div className="space-y-3">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  activeSection === 'rating' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveSection('rating')}
              >
                Rate
              </button>
              <button
                className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  activeSection === 'correction' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveSection('correction')}
              >
                Suggest Fix
              </button>
              <button
                className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  activeSection === 'context' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveSection('context')}
              >
                Add Context
              </button>
            </div>

            {/* Rating Section */}
            {activeSection === 'rating' && (
              <div className="space-y-3">
                <Label className="text-sm">Rate this translation:</Label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className="p-1"
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(star)}
                    >
                      <Star className={`w-5 h-5 transition-colors ${getStarColor(star)}`} />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 text-sm text-gray-600">
                      {rating} star{rating !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {rating > 0 && (
                  <Button 
                    size="sm" 
                    onClick={handleRatingSubmit}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Rating
                  </Button>
                )}
              </div>
            )}

            {/* Correction Section */}
            {activeSection === 'correction' && (
              <div className="space-y-3">
                <Label htmlFor="correction" className="text-sm">
                  Suggest a better translation:
                </Label>
                <Input
                  id="correction"
                  placeholder="Enter your suggested Ibibio translation"
                  value={correction}
                  onChange={(e) => setCorrection(e.target.value)}
                />
                {correction.trim() && (
                  <Button 
                    size="sm" 
                    onClick={handleCorrectionSubmit}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Submit Correction
                  </Button>
                )}
              </div>
            )}

            {/* Context Section */}
            {activeSection === 'context' && (
              <div className="space-y-3">
                <Label htmlFor="context" className="text-sm">
                  Add context about your usage:
                </Label>
                <Textarea
                  id="context"
                  placeholder="How did you use this translation? Was it for conversation, writing, etc.?"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
                <div className="text-xs text-gray-500">
                  Context helps us improve translations for similar situations.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackPanel;
