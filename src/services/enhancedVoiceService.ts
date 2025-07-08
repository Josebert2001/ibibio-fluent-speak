// Speech recognition types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface PronunciationScore {
  word: string;
  score: number; // 0-100
  feedback: string;
  suggestions: string[];
}

interface VoiceCommand {
  pattern: RegExp;
  action: string;
  description: string;
}

class EnhancedVoiceService {
  private synthesis: SpeechSynthesis;
  private recognition: any | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isListening = false;
  private currentVoiceSettings = {
    rate: 0.8,
    pitch: 1.0,
    volume: 1.0,
    voiceIndex: 0
  };

  private voiceCommands: VoiceCommand[] = [
    {
      pattern: /repeat (that|this)/i,
      action: 'repeat_last',
      description: 'Repeat the last pronunciation'
    },
    {
      pattern: /translate (.+)/i,
      action: 'translate',
      description: 'Translate a word or phrase'
    },
    {
      pattern: /how do you say (.+)/i,
      action: 'translate',
      description: 'Ask for translation'
    },
    {
      pattern: /(tell me about|what is) (.+)/i,
      action: 'cultural_info',
      description: 'Get cultural information'
    },
    {
      pattern: /slower|slow down/i,
      action: 'slower',
      description: 'Reduce speech rate'
    },
    {
      pattern: /faster|speed up/i,
      action: 'faster',
      description: 'Increase speech rate'
    }
  ];

  private lastSpokenText = '';
  private onVoiceCommandCallback?: (command: string, params?: string[]) => void;
  private onTranscriptCallback?: (result: VoiceRecognitionResult) => void;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.loadVoices();
    this.initializeRecognition();
    
    // Voices may load asynchronously
    this.synthesis.addEventListener('voiceschanged', () => {
      this.loadVoices();
    });
  }

  private loadVoices(): void {
    this.voices = this.synthesis.getVoices();
  }

  private initializeRecognition(): void {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new (window as any).SpeechRecognition();
    }

    if (this.recognition) {
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        const results = Array.from(event.results);
        const lastResult = results[results.length - 1] as any;
        
        const transcript = lastResult[0].transcript;
        const confidence = lastResult[0].confidence || 0.8;
        const isFinal = lastResult.isFinal || false;

        const result: VoiceRecognitionResult = {
          transcript,
          confidence,
          isFinal
        };

        // Check for voice commands
        if (isFinal) {
          this.processVoiceCommand(transcript);
        }

        // Notify listeners
        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(result);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    }
  }

  // Enhanced speech synthesis
  speak(text: string, language: string = 'en-US', options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voiceType?: 'formal' | 'casual' | 'elder' | 'youth';
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Stop any current speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply voice settings
      const settings = { ...this.currentVoiceSettings, ...options };
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;
      
      // Try to find a suitable voice
      const preferredVoice = this.findBestVoice(language, options?.voiceType);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onend = () => {
        this.lastSpokenText = text;
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        reject(new Error('Speech synthesis failed'));
      };
      
      this.synthesis.speak(utterance);
    });
  }

  // Voice recognition
  startListening(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      if (this.isListening) {
        resolve();
        return;
      }

      try {
        this.recognition.start();
        this.isListening = true;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  // Voice commands processing
  private processVoiceCommand(transcript: string): void {
    for (const command of this.voiceCommands) {
      const match = transcript.match(command.pattern);
      if (match) {
        const params = match.slice(1); // Extract captured groups
        
        switch (command.action) {
          case 'repeat_last':
            if (this.lastSpokenText) {
              this.speak(this.lastSpokenText);
            }
            break;
          case 'slower':
            this.adjustSpeechRate(-0.2);
            break;
          case 'faster':
            this.adjustSpeechRate(0.2);
            break;
          default:
            if (this.onVoiceCommandCallback) {
              this.onVoiceCommandCallback(command.action, params);
            }
            break;
        }
        break;
      }
    }
  }

  // Pronunciation scoring (basic implementation)
  async scorePronunciation(targetWord: string, userAudio?: Blob): Promise<PronunciationScore> {
    // This is a simplified implementation
    // In a real app, you'd use more sophisticated audio analysis
    
    // For now, return a mock score based on confidence from speech recognition
    const mockScore = Math.floor(Math.random() * 40) + 60; // 60-100 range
    
    const feedback = this.generatePronunciationFeedback(targetWord, mockScore);
    const suggestions = this.generatePronunciationSuggestions(targetWord, mockScore);
    
    return {
      word: targetWord,
      score: mockScore,
      feedback,
      suggestions
    };
  }

  private generatePronunciationFeedback(word: string, score: number): string {
    if (score >= 90) {
      return "Excellent pronunciation! You've got it right.";
    } else if (score >= 75) {
      return "Good job! Your pronunciation is clear and understandable.";
    } else if (score >= 60) {
      return "Not bad! Try to focus on the tonal emphasis.";
    } else {
      return "Keep practicing! Pay attention to the vowel sounds.";
    }
  }

  private generatePronunciationSuggestions(word: string, score: number): string[] {
    const suggestions = [];
    
    if (score < 75) {
      suggestions.push("Listen to the audio again and focus on tone");
      suggestions.push("Break the word into syllables");
    }
    
    if (score < 60) {
      suggestions.push("Practice vowel sounds separately");
      suggestions.push("Try speaking more slowly");
    }
    
    return suggestions;
  }

  // Voice settings
  private findBestVoice(language: string, voiceType?: string): SpeechSynthesisVoice | null {
    // Try to find voice by language
    let voice = this.voices.find(v => v.lang.startsWith(language));
    
    // Fallback to English
    if (!voice) {
      voice = this.voices.find(v => v.lang.startsWith('en'));
    }
    
    // Voice type preferences (when multiple voices available)
    if (voiceType && this.voices.length > 1) {
      const typePreferences = {
        formal: ['female', 'british', 'standard'],
        casual: ['male', 'american', 'natural'],
        elder: ['mature', 'deep', 'authoritative'],
        youth: ['young', 'bright', 'energetic']
      };
      
      const preferences = typePreferences[voiceType] || [];
      for (const pref of preferences) {
        const preferredVoice = this.voices.find(v => 
          v.name.toLowerCase().includes(pref) && 
          v.lang.startsWith(language)
        );
        if (preferredVoice) {
          voice = preferredVoice;
          break;
        }
      }
    }
    
    return voice || null;
  }

  adjustSpeechRate(delta: number): void {
    this.currentVoiceSettings.rate = Math.max(0.1, Math.min(2.0, 
      this.currentVoiceSettings.rate + delta
    ));
  }

  adjustSpeechPitch(delta: number): void {
    this.currentVoiceSettings.pitch = Math.max(0.1, Math.min(2.0, 
      this.currentVoiceSettings.pitch + delta
    ));
  }

  adjustVolume(volume: number): void {
    this.currentVoiceSettings.volume = Math.max(0, Math.min(1, volume));
  }

  // Event listeners
  setOnVoiceCommand(callback: (command: string, params?: string[]) => void): void {
    this.onVoiceCommandCallback = callback;
  }

  setOnTranscript(callback: (result: VoiceRecognitionResult) => void): void {
    this.onTranscriptCallback = callback;
  }

  // Utility methods
  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  isRecognitionSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  getCurrentSettings() {
    return { ...this.currentVoiceSettings };
  }

  getVoiceCommands(): VoiceCommand[] {
    return this.voiceCommands;
  }
}

export const enhancedVoiceService = new EnhancedVoiceService();