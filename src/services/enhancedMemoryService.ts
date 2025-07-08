import { chatSessionManager } from './chatSessionManager';

interface UserProfile {
  id: string;
  learningLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredTopics: string[];
  learningStyle: 'cultural' | 'practical' | 'grammar' | 'mixed';
  streakDays: number;
  totalWordsLearned: number;
  lastActiveDate: string;
  weaknessAreas: string[];
  strengths: string[];
  completedPaths: string[];
  dailyChallengesCompleted: number;
}

interface ConversationMemory {
  topics: Map<string, number>; // topic -> frequency
  words: Map<string, { learned: Date; confidence: number }>; // word -> learning data
  culturalConcepts: Map<string, { discussed: Date; depth: number }>;
  questionsAsked: string[];
  learningProgress: {
    currentPath?: string;
    pathProgress: number;
    lastRecommendation: string;
  };
}

interface FollowUpSuggestion {
  id: string;
  text: string;
  type: 'cultural' | 'linguistic' | 'practical' | 'related';
  priority: number;
  context: string;
}

class EnhancedMemoryService {
  private userProfile: UserProfile | null = null;
  private conversationMemory: ConversationMemory = {
    topics: new Map(),
    words: new Map(),
    culturalConcepts: new Map(),
    questionsAsked: [],
    learningProgress: { pathProgress: 0, lastRecommendation: '' }
  };

  constructor() {
    this.loadUserProfile();
    this.loadConversationMemory();
  }

  // User Profile Management
  getUserProfile(): UserProfile {
    if (!this.userProfile) {
      this.userProfile = this.createDefaultProfile();
      this.saveUserProfile();
    }
    return this.userProfile;
  }

  updateUserProfile(updates: Partial<UserProfile>): void {
    this.userProfile = { ...this.getUserProfile(), ...updates };
    this.saveUserProfile();
  }

  // Learning Progress Tracking
  recordWordLearned(word: string, confidence: number = 0.8): void {
    this.conversationMemory.words.set(word, {
      learned: new Date(),
      confidence
    });
    
    const profile = this.getUserProfile();
    this.updateUserProfile({
      totalWordsLearned: profile.totalWordsLearned + 1
    });
    
    this.saveConversationMemory();
  }

  recordTopicDiscussion(topic: string): void {
    const current = this.conversationMemory.topics.get(topic) || 0;
    this.conversationMemory.topics.set(topic, current + 1);
    this.saveConversationMemory();
  }

  recordCulturalConcept(concept: string, depth: number): void {
    this.conversationMemory.culturalConcepts.set(concept, {
      discussed: new Date(),
      depth
    });
    this.saveConversationMemory();
  }

  // Follow-up Question Generation
  generateFollowUpSuggestions(currentTopic: string, lastMessage: string): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];
    
    // Cultural follow-ups
    if (this.isCulturalTopic(currentTopic)) {
      suggestions.push({
        id: 'cultural-1',
        text: "Tell me more about the cultural significance",
        type: 'cultural',
        priority: 0.9,
        context: currentTopic
      });
      
      suggestions.push({
        id: 'cultural-2',
        text: "How is this practiced in modern times?",
        type: 'cultural',
        priority: 0.8,
        context: currentTopic
      });
    }

    // Linguistic follow-ups
    if (this.containsIbibioWord(lastMessage)) {
      suggestions.push({
        id: 'linguistic-1',
        text: "Show me related words",
        type: 'linguistic',
        priority: 0.85,
        context: currentTopic
      });
      
      suggestions.push({
        id: 'linguistic-2',
        text: "Give me usage examples",
        type: 'linguistic',
        priority: 0.8,
        context: currentTopic
      });
    }

    // Practical follow-ups
    suggestions.push({
      id: 'practical-1',
      text: "How would I use this in conversation?",
      type: 'practical',
      priority: 0.75,
      context: currentTopic
    });

    // Learning path suggestions
    const nextPathSuggestion = this.getNextLearningPathSuggestion();
    if (nextPathSuggestion) {
      suggestions.push({
        id: 'learning-path',
        text: nextPathSuggestion,
        type: 'related',
        priority: 0.7,
        context: 'learning-path'
      });
    }

    return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 4);
  }

  // Memory Analysis
  getConversationContext(limit: number = 50): Array<{role: string, content: string}> {
    const currentSession = chatSessionManager.getCurrentSessionId();
    if (!currentSession) return [];
    
    const session = chatSessionManager.getSession(currentSession);
    if (!session) return [];
    
    return session.messages
      .slice(-limit)
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
  }

  getWeaknessAreas(): string[] {
    const profile = this.getUserProfile();
    return profile.weaknessAreas;
  }

  getStrengths(): string[] {
    const profile = this.getUserProfile();
    return profile.strengths;
  }

  updateLearningAnalysis(topic: string, success: boolean): void {
    const profile = this.getUserProfile();
    
    if (success) {
      if (!profile.strengths.includes(topic)) {
        profile.strengths.push(topic);
      }
      // Remove from weaknesses if it was there
      profile.weaknessAreas = profile.weaknessAreas.filter(w => w !== topic);
    } else {
      if (!profile.weaknessAreas.includes(topic)) {
        profile.weaknessAreas.push(topic);
      }
    }
    
    this.updateUserProfile(profile);
  }

  // Daily Challenge & Streak Management
  updateDailyStreak(): void {
    const profile = this.getUserProfile();
    const today = new Date().toDateString();
    const lastActive = new Date(profile.lastActiveDate).toDateString();
    
    if (lastActive === today) {
      return; // Already active today
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastActive === yesterday.toDateString()) {
      // Continue streak
      this.updateUserProfile({
        streakDays: profile.streakDays + 1,
        lastActiveDate: today
      });
    } else {
      // Reset streak
      this.updateUserProfile({
        streakDays: 1,
        lastActiveDate: today
      });
    }
  }

  // Private helper methods
  private createDefaultProfile(): UserProfile {
    return {
      id: `user_${Date.now()}`,
      learningLevel: 'beginner',
      preferredTopics: [],
      learningStyle: 'mixed',
      streakDays: 0,
      totalWordsLearned: 0,
      lastActiveDate: new Date().toISOString(),
      weaknessAreas: [],
      strengths: [],
      completedPaths: [],
      dailyChallengesCompleted: 0
    };
  }

  private isCulturalTopic(topic: string): boolean {
    const culturalKeywords = [
      'tradition', 'culture', 'ceremony', 'festival', 'custom',
      'belief', 'story', 'folklore', 'ancestor', 'heritage'
    ];
    return culturalKeywords.some(keyword => 
      topic.toLowerCase().includes(keyword)
    );
  }

  private containsIbibioWord(message: string): boolean {
    // Simple heuristic - check if message contains translation markers
    return message.includes('→') || message.includes('Ibibio:') || 
           message.includes('ibibio') || /[àáâãäèéêëìíîïòóôõöùúûü]/.test(message);
  }

  private getNextLearningPathSuggestion(): string | null {
    const profile = this.getUserProfile();
    const progress = this.conversationMemory.learningProgress;
    
    if (!progress.currentPath) {
      return "Would you like to start a structured learning path?";
    }
    
    if (progress.pathProgress < 50) {
      return `Continue with your ${progress.currentPath} path?`;
    }
    
    return "Ready for the next learning level?";
  }

  // Storage methods
  private saveUserProfile(): void {
    try {
      localStorage.setItem('ibibio_user_profile', JSON.stringify(this.userProfile));
    } catch (error) {
      console.error('Failed to save user profile:', error);
    }
  }

  private loadUserProfile(): void {
    try {
      const stored = localStorage.getItem('ibibio_user_profile');
      if (stored) {
        this.userProfile = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }

  private saveConversationMemory(): void {
    try {
      const memoryData = {
        topics: Array.from(this.conversationMemory.topics.entries()),
        words: Array.from(this.conversationMemory.words.entries()),
        culturalConcepts: Array.from(this.conversationMemory.culturalConcepts.entries()),
        questionsAsked: this.conversationMemory.questionsAsked,
        learningProgress: this.conversationMemory.learningProgress
      };
      localStorage.setItem('ibibio_conversation_memory', JSON.stringify(memoryData));
    } catch (error) {
      console.error('Failed to save conversation memory:', error);
    }
  }

  private loadConversationMemory(): void {
    try {
      const stored = localStorage.getItem('ibibio_conversation_memory');
      if (stored) {
        const data = JSON.parse(stored);
        this.conversationMemory = {
          topics: new Map(data.topics || []),
          words: new Map(data.words || []),
          culturalConcepts: new Map(data.culturalConcepts || []),
          questionsAsked: data.questionsAsked || [],
          learningProgress: data.learningProgress || { pathProgress: 0, lastRecommendation: '' }
        };
      }
    } catch (error) {
      console.error('Failed to load conversation memory:', error);
    }
  }
}

export const enhancedMemoryService = new EnhancedMemoryService();