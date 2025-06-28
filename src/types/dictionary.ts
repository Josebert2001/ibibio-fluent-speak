export interface DictionaryEntry {
  id: string;
  english: string;
  ibibio: string;
  meaning: string;
  partOfSpeech: string;
  examples?: Array<{
    english: string;
    ibibio: string;
  }>;
  pronunciation?: string;
  cultural?: string;
  category?: string;
}

export interface SearchResult {
  entry: DictionaryEntry;
  confidence: number;
  source: 'dictionary' | 'ai' | 'online';
}

export interface AlternativeTranslation {
  ibibio: string;
  meaning: string;
  context?: string;
  confidence: number;
  usage_notes?: string;
  formality?: 'formal' | 'informal' | 'neutral';
  region?: string;
}

export interface GroqResponse {
  ibibio: string;
  meaning: string;
  confidence: number;
  examples?: Array<{
    english: string;
    ibibio: string;
  }>;
  cultural?: string;
  alternatives?: AlternativeTranslation[];
}