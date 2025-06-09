
import { DictionaryEntry } from '../types/dictionary';

interface CacheEntry {
  entry: DictionaryEntry;
  timestamp: number;
  source: string;
}

class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const cached = localStorage.getItem('ibibio-web-cache');
      if (cached) {
        const data = JSON.parse(cached);
        this.cache = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading cache:', error);
    }
  }

  private saveToLocalStorage() {
    try {
      const data = Object.fromEntries(this.cache);
      localStorage.setItem('ibibio-web-cache', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  get(query: string): DictionaryEntry | null {
    const cached = this.cache.get(query.toLowerCase());
    
    if (!cached) return null;
    
    // Check if cache entry is expired
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY) {
      this.cache.delete(query.toLowerCase());
      this.saveToLocalStorage();
      return null;
    }
    
    return cached.entry;
  }

  set(query: string, entry: DictionaryEntry, source: string) {
    this.cache.set(query.toLowerCase(), {
      entry,
      timestamp: Date.now(),
      source
    });
    this.saveToLocalStorage();
  }

  clear() {
    this.cache.clear();
    localStorage.removeItem('ibibio-web-cache');
  }

  getStats() {
    return {
      totalEntries: this.cache.size,
      sources: [...new Set([...this.cache.values()].map(entry => entry.source))]
    };
  }
}

export const cacheService = new CacheService();
