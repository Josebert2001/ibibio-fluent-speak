
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

export interface GroqResponse {
  ibibio: string;
  meaning: string;
  confidence: number;
  examples?: Array<{
    english: string;
    ibibio: string;
  }>;
  cultural?: string;
}
