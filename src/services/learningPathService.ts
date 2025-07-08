interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: string;
  topics: LearningTopic[];
  prerequisites?: string[];
  nextPaths?: string[];
}

interface LearningTopic {
  id: string;
  title: string;
  description: string;
  type: 'vocabulary' | 'culture' | 'grammar' | 'conversation';
  concepts: string[];
  keyWords: string[];
  culturalNotes?: string;
  exercises: Exercise[];
}

interface Exercise {
  id: string;
  type: 'translation' | 'pronunciation' | 'cultural_question' | 'conversation';
  question: string;
  correctAnswer: string;
  alternatives?: string[];
  hint?: string;
  culturalContext?: string;
}

interface DailyChallenge {
  id: string;
  date: string;
  type: 'word_of_day' | 'cultural_fact' | 'translation_challenge' | 'pronunciation';
  title: string;
  content: string;
  difficulty: number;
  reward: number;
  completed: boolean;
}

class LearningPathService {
  private learningPaths: LearningPath[] = [];
  private userProgress: Map<string, number> = new Map(); // pathId -> progress percentage
  private completedChallenges: Set<string> = new Set();

  constructor() {
    this.initializeLearningPaths();
    this.loadProgress();
  }

  private initializeLearningPaths(): void {
    this.learningPaths = [
      {
        id: 'beginner-essentials',
        title: 'Beginner Essentials',
        description: 'Start your Ibibio journey with basic greetings and common words',
        difficulty: 'beginner',
        estimatedDuration: '2-3 weeks',
        topics: [
          {
            id: 'greetings',
            title: 'Greetings & Basic Phrases',
            description: 'Learn how to say hello, goodbye, and other essential greetings',
            type: 'vocabulary',
            concepts: ['greetings', 'politeness', 'time-based greetings'],
            keyWords: ['mme', 'nno', 'uduak', 'ke inyene', 'ke otoro'],
            culturalNotes: 'Ibibio greetings often include inquiries about family and well-being',
            exercises: [
              {
                id: 'greeting-1',
                type: 'translation',
                question: 'How do you say "Good morning" in Ibibio?',
                correctAnswer: 'Uduak usen',
                alternatives: ['Mme usen', 'Nno usen', 'Ke usen'],
                hint: 'Think about the word for "good"'
              }
            ]
          },
          {
            id: 'family-terms',
            title: 'Family & Relationships',
            description: 'Essential family terms and relationship words',
            type: 'vocabulary',
            concepts: ['family structure', 'relationships', 'respect terms'],
            keyWords: ['eka', 'nana', 'papa', 'uwem', 'emi'],
            exercises: [
              {
                id: 'family-1',
                type: 'translation',
                question: 'What is the Ibibio word for "mother"?',
                correctAnswer: 'nana',
                alternatives: ['mama', 'eka', 'emi'],
                culturalContext: 'The term "nana" shows deep respect for mothers in Ibibio culture'
              }
            ]
          }
        ],
        nextPaths: ['cultural-foundations', 'practical-conversations']
      },
      {
        id: 'cultural-foundations',
        title: 'Cultural Foundations',
        description: 'Dive deep into Ibibio culture, traditions, and worldview',
        difficulty: 'intermediate',
        estimatedDuration: '3-4 weeks',
        prerequisites: ['beginner-essentials'],
        topics: [
          {
            id: 'traditional-ceremonies',
            title: 'Traditional Ceremonies',
            description: 'Learn about important Ibibio ceremonies and their significance',
            type: 'culture',
            concepts: ['rites of passage', 'seasonal festivals', 'ancestor veneration'],
            keyWords: ['ekpo', 'mbopo', 'ukom', 'ifa', 'ibok'],
            culturalNotes: 'Ibibio ceremonies connect the community with ancestors and nature',
            exercises: [
              {
                id: 'ceremony-1',
                type: 'cultural_question',
                question: 'What is the significance of the Ekpo masquerade in Ibibio culture?',
                correctAnswer: 'Ekpo represents the spirits of ancestors and serves as a link between the living and the dead',
                hint: 'Think about the spiritual connection'
              }
            ]
          }
        ],
        nextPaths: ['advanced-linguistics']
      },
      {
        id: 'practical-conversations',
        title: 'Practical Conversations',
        description: 'Real-world conversation skills for daily interactions',
        difficulty: 'intermediate',
        estimatedDuration: '2-3 weeks',
        prerequisites: ['beginner-essentials'],
        topics: [
          {
            id: 'market-conversations',
            title: 'Market & Shopping',
            description: 'Navigate markets and shopping situations',
            type: 'conversation',
            concepts: ['bargaining', 'numbers', 'common items'],
            keyWords: ['afia', 'ikot', 'owo', 'kpan', 'daba'],
            exercises: [
              {
                id: 'market-1',
                type: 'conversation',
                question: 'Role-play: You want to buy yam at the market. Start the conversation.',
                correctAnswer: 'Nno mme. Kpan udia k-akwa?',
                hint: 'Start with a greeting, then ask about the price'
              }
            ]
          }
        ]
      }
    ];
  }

  getLearningPaths(): LearningPath[] {
    return this.learningPaths;
  }

  getPath(pathId: string): LearningPath | null {
    return this.learningPaths.find(path => path.id === pathId) || null;
  }

  getRecommendedPaths(userLevel: string, completedPaths: string[]): LearningPath[] {
    return this.learningPaths.filter(path => {
      // Don't recommend completed paths
      if (completedPaths.includes(path.id)) return false;
      
      // Check if prerequisites are met
      if (path.prerequisites) {
        const prereqsMet = path.prerequisites.every(prereq => 
          completedPaths.includes(prereq)
        );
        if (!prereqsMet) return false;
      }
      
      // Match difficulty level
      return path.difficulty === userLevel || 
             (userLevel === 'intermediate' && path.difficulty === 'beginner') ||
             (userLevel === 'advanced' && path.difficulty !== 'advanced');
    });
  }

  getUserProgress(pathId: string): number {
    return this.userProgress.get(pathId) || 0;
  }

  updateProgress(pathId: string, topicId: string): void {
    const path = this.getPath(pathId);
    if (!path) return;
    
    const topicIndex = path.topics.findIndex(topic => topic.id === topicId);
    if (topicIndex === -1) return;
    
    const progressPerTopic = 100 / path.topics.length;
    const currentProgress = this.getUserProgress(pathId);
    const newProgress = Math.min(100, currentProgress + progressPerTopic);
    
    this.userProgress.set(pathId, newProgress);
    this.saveProgress();
  }

  // Daily Challenges
  generateDailyChallenge(): DailyChallenge {
    const today = new Date().toDateString();
    const challengeId = `challenge-${today}`;
    
    // Check if today's challenge already exists
    const existingChallenge = this.getTodaysChallenge();
    if (existingChallenge) return existingChallenge;
    
    const challengeTypes = ['word_of_day', 'cultural_fact', 'translation_challenge', 'pronunciation'];
    const randomType = challengeTypes[Math.floor(Math.random() * challengeTypes.length)] as any;
    
    const challenges = {
      word_of_day: {
        title: 'Word of the Day',
        content: 'Today\'s word is "uduak" (good/well). Can you use it in a sentence?',
        difficulty: 1,
        reward: 10
      },
      cultural_fact: {
        title: 'Cultural Insight',
        content: 'Did you know? In Ibibio culture, it\'s customary to greet elders with both hands as a sign of respect.',
        difficulty: 2,
        reward: 15
      },
      translation_challenge: {
        title: 'Translation Challenge',
        content: 'Translate this Ibibio proverb: "Akwa ibom ikot emi ke ufok"',
        difficulty: 3,
        reward: 20
      },
      pronunciation: {
        title: 'Pronunciation Practice',
        content: 'Practice saying "Nnyong fie" (How are you?) with the correct tonal emphasis.',
        difficulty: 2,
        reward: 15
      }
    };
    
    const challenge = challenges[randomType];
    
    return {
      id: challengeId,
      date: today,
      type: randomType,
      title: challenge.title,
      content: challenge.content,
      difficulty: challenge.difficulty,
      reward: challenge.reward,
      completed: false
    };
  }

  getTodaysChallenge(): DailyChallenge | null {
    const today = new Date().toDateString();
    const challengeId = `challenge-${today}`;
    
    try {
      const stored = localStorage.getItem('ibibio_daily_challenges');
      if (stored) {
        const challenges = JSON.parse(stored);
        return challenges[challengeId] || null;
      }
    } catch (error) {
      console.error('Failed to load daily challenge:', error);
    }
    
    return null;
  }

  completeDailyChallenge(challengeId: string): void {
    try {
      const stored = localStorage.getItem('ibibio_daily_challenges') || '{}';
      const challenges = JSON.parse(stored);
      
      if (challenges[challengeId]) {
        challenges[challengeId].completed = true;
        localStorage.setItem('ibibio_daily_challenges', JSON.stringify(challenges));
        this.completedChallenges.add(challengeId);
      }
    } catch (error) {
      console.error('Failed to complete daily challenge:', error);
    }
  }

  getCompletedChallengesCount(): number {
    return this.completedChallenges.size;
  }

  // Storage methods
  private saveProgress(): void {
    try {
      const progressData = Array.from(this.userProgress.entries());
      localStorage.setItem('ibibio_learning_progress', JSON.stringify(progressData));
    } catch (error) {
      console.error('Failed to save learning progress:', error);
    }
  }

  private loadProgress(): void {
    try {
      const stored = localStorage.getItem('ibibio_learning_progress');
      if (stored) {
        const progressData = JSON.parse(stored);
        this.userProgress = new Map(progressData);
      }
    } catch (error) {
      console.error('Failed to load learning progress:', error);
    }
  }
}

export const learningPathService = new LearningPathService();