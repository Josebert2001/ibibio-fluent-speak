interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  source: string;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly FREQUENT_SEARCH_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  private searchFrequency: Map<string, number> = new Map();

  constructor() {
    this.loadFromStorage();
    // Clean expired entries every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  private loadFromStorage(): void {
    try {
      const cacheData = localStorage.getItem('ibibio-search-cache');
      const frequencyData = localStorage.getItem('ibibio-search-frequency');
      
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        if (parsed && typeof parsed === 'object') {
          this.cache = new Map(Object.entries(parsed));
        }
      }
      
      if (frequencyData) {
        const parsed = JSON.parse(frequencyData);
        if (parsed && typeof parsed === 'object') {
          this.searchFrequency = new Map(Object.entries(parsed).map(([k, v]) => [k, Number(v)]));
        }
      }
    } catch (error) {
      console.error('Error loading cache:', error);
      // Reset cache on error
      this.cache.clear();
      this.searchFrequency.clear();
    }
  }

  private saveToStorage(): void {
    try {
      const cacheData = Object.fromEntries(this.cache);
      const frequencyData = Object.fromEntries(this.searchFrequency);
      
      localStorage.setItem('ibibio-search-cache', JSON.stringify(cacheData));
      localStorage.setItem('ibibio-search-frequency', JSON.stringify(frequencyData));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  get<T>(key: string): T | null {
    if (!key || typeof key !== 'string') return null;
    
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }
    
    // Update search frequency
    this.searchFrequency.set(key, (this.searchFrequency.get(key) || 0) + 1);
    
    return entry.data;
  }

  set<T>(key: string, data: T, source: string, customTtl?: number): void {
    if (!key || typeof key !== 'string' || !data) return;
    
    const frequency = this.searchFrequency.get(key) || 0;
    const ttl = customTtl || (frequency > 5 ? this.FREQUENT_SEARCH_TTL : this.DEFAULT_TTL);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      source
    });
    
    this.saveToStorage();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    if (!key || typeof key !== 'string') return;
    
    this.cache.delete(key);
    this.searchFrequency.delete(key);
    this.saveToStorage();
  }

  clear(): void {
    this.cache.clear();
    this.searchFrequency.clear();
    localStorage.removeItem('ibibio-search-cache');
    localStorage.removeItem('ibibio-search-frequency');
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`Cleaned ${cleaned} expired cache entries`);
      this.saveToStorage();
    }
  }

  getStats() {
    return {
      totalEntries: this.cache.size,
      frequentSearches: Array.from(this.searchFrequency.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10),
      cacheHitRate: this.calculateHitRate()
    };
  }

  private calculateHitRate(): number {
    const totalSearches = Array.from(this.searchFrequency.values()).reduce((sum, freq) => sum + freq, 0);
    const cachedSearches = this.cache.size;
    return totalSearches > 0 ? (cachedSearches / totalSearches) * 100 : 0;
  }
}

export const cacheManager = new CacheManager();