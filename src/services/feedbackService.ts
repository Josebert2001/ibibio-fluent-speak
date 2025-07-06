import { DictionaryEntry } from '../types/dictionary';

interface TranslationFeedback {
  id: string;
  query: string;
  translation: DictionaryEntry;
  rating: number; // 1-5 stars
  isCorrect: boolean;
  userCorrection?: string;
  context?: string;
  timestamp: number;
  userAgent?: string;
}

interface FeedbackStats {
  totalFeedbacks: number;
  averageRating: number;
  topRatedTranslations: Array<{ translation: string; rating: number; count: number }>;
  commonCorrections: Array<{ original: string; correction: string; count: number }>;
}

class FeedbackService {
  private feedbacks: TranslationFeedback[] = [];
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load existing feedbacks from localStorage
      const stored = localStorage.getItem('translation-feedbacks');
      if (stored) {
        this.feedbacks = JSON.parse(stored);
      }
      
      this.isInitialized = true;
      console.log(`Feedback service initialized with ${this.feedbacks.length} feedbacks`);
    } catch (error) {
      console.error('Failed to initialize feedback service:', error);
      this.feedbacks = [];
      this.isInitialized = true;
    }
  }

  async submitFeedback(feedback: Omit<TranslationFeedback, 'id' | 'timestamp'>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const newFeedback: TranslationFeedback = {
      ...feedback,
      id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    this.feedbacks.push(newFeedback);
    this.saveFeedbacks();

    console.log('New feedback submitted:', newFeedback);
  }

  async rateFeedback(
    query: string, 
    translation: DictionaryEntry, 
    rating: number, 
    context?: string
  ): Promise<void> {
    await this.submitFeedback({
      query,
      translation,
      rating,
      isCorrect: rating >= 4, // 4-5 stars considered correct
      context,
      userAgent: navigator.userAgent
    });
  }

  async submitCorrection(
    query: string, 
    originalTranslation: DictionaryEntry, 
    correction: string, 
    context?: string
  ): Promise<void> {
    await this.submitFeedback({
      query,
      translation: originalTranslation,
      rating: 1, // Low rating for incorrect translation
      isCorrect: false,
      userCorrection: correction,
      context,
      userAgent: navigator.userAgent
    });
  }

  async markAsHelpful(query: string, translation: DictionaryEntry, context?: string): Promise<void> {
    await this.rateFeedback(query, translation, 5, context);
  }

  async markAsUnhelpful(query: string, translation: DictionaryEntry, context?: string): Promise<void> {
    await this.rateFeedback(query, translation, 1, context);
  }

  getFeedbackForTranslation(englishWord: string, ibibioWord: string): TranslationFeedback[] {
    return this.feedbacks.filter(feedback => 
      feedback.translation.english?.toLowerCase() === englishWord.toLowerCase() &&
      feedback.translation.ibibio?.toLowerCase() === ibibioWord.toLowerCase()
    );
  }

  getFeedbackStats(): FeedbackStats {
    if (this.feedbacks.length === 0) {
      return {
        totalFeedbacks: 0,
        averageRating: 0,
        topRatedTranslations: [],
        commonCorrections: []
      };
    }

    const totalRating = this.feedbacks.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = totalRating / this.feedbacks.length;

    // Calculate top-rated translations
    const translationRatings = new Map<string, { total: number; count: number }>();
    this.feedbacks.forEach(feedback => {
      const key = `${feedback.translation.english} -> ${feedback.translation.ibibio}`;
      if (!translationRatings.has(key)) {
        translationRatings.set(key, { total: 0, count: 0 });
      }
      const current = translationRatings.get(key)!;
      current.total += feedback.rating;
      current.count += 1;
    });

    const topRatedTranslations = Array.from(translationRatings.entries())
      .map(([translation, stats]) => ({
        translation,
        rating: stats.total / stats.count,
        count: stats.count
      }))
      .filter(item => item.count >= 2) // At least 2 ratings
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    // Calculate common corrections
    const corrections = new Map<string, number>();
    this.feedbacks
      .filter(f => f.userCorrection)
      .forEach(feedback => {
        const key = `${feedback.translation.ibibio} -> ${feedback.userCorrection}`;
        corrections.set(key, (corrections.get(key) || 0) + 1);
      });

    const commonCorrections = Array.from(corrections.entries())
      .map(([correction, count]) => {
        const [original, corrected] = correction.split(' -> ');
        return { original, correction: corrected, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalFeedbacks: this.feedbacks.length,
      averageRating: Math.round(averageRating * 100) / 100,
      topRatedTranslations,
      commonCorrections
    };
  }

  getConfidenceScore(englishWord: string, ibibioWord: string): number {
    const feedbacks = this.getFeedbackForTranslation(englishWord, ibibioWord);
    
    if (feedbacks.length === 0) {
      return 0.5; // Neutral confidence for no feedback
    }

    const totalRating = feedbacks.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = totalRating / feedbacks.length;
    
    // Convert 1-5 rating to 0-1 confidence score
    const baseConfidence = (averageRating - 1) / 4; // Maps 1-5 to 0-1
    
    // Boost confidence for more feedback samples
    const sampleBoost = Math.min(feedbacks.length / 10, 0.1); // Up to 10% boost for 10+ samples
    
    return Math.min(baseConfidence + sampleBoost, 1.0);
  }

  private saveFeedbacks(): void {
    try {
      localStorage.setItem('translation-feedbacks', JSON.stringify(this.feedbacks));
    } catch (error) {
      console.error('Failed to save feedbacks:', error);
    }
  }

  // Clean up old feedbacks (optional - keep last 1000)
  cleanupOldFeedbacks(): void {
    if (this.feedbacks.length > 1000) {
      this.feedbacks = this.feedbacks
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 1000);
      this.saveFeedbacks();
      console.log('Cleaned up old feedbacks, kept most recent 1000');
    }
  }

  exportFeedbacks(): string {
    return JSON.stringify(this.feedbacks, null, 2);
  }

  getRecentFeedbacks(limit: number = 20): TranslationFeedback[] {
    return this.feedbacks
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

export const feedbackService = new FeedbackService();
