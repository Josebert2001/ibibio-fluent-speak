
class VoiceService {
  private synthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.loadVoices();
    
    // Voices may load asynchronously
    this.synthesis.addEventListener('voiceschanged', () => {
      this.loadVoices();
    });
  }

  private loadVoices(): void {
    this.voices = this.synthesis.getVoices();
  }

  speak(text: string, language: string = 'en-US'): void {
    if (!this.synthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Stop any current speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a suitable voice
    const preferredVoice = this.voices.find(voice => 
      voice.lang.startsWith(language) || 
      voice.lang.startsWith('en')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
    };
    
    this.synthesis.speak(utterance);
  }

  stop(): void {
    this.synthesis.cancel();
  }

  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
}

export const voiceService = new VoiceService();
