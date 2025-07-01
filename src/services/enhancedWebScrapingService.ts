
interface ScrapedTranslation {
  ibibio: string;
  meaning: string;
  source: string;
  confidence: number;
  examples?: Array<{ english: string; ibibio: string }>;
  pronunciation?: string;
  cultural?: string;
}

interface ScrapingResult {
  success: boolean;
  translations: ScrapedTranslation[];
  source: string;
  error?: string;
}

class EnhancedWebScrapingService {
  private corsProxy = 'https://api.allorigins.win/get?url=';
  private fallbackProxy = 'https://cors-anywhere.herokuapp.com/';

  async fetchWithCors(url: string, useProxy: boolean = true): Promise<string> {
    const urls = useProxy ? [
      `${this.corsProxy}${encodeURIComponent(url)}`,
      `${this.fallbackProxy}${url}`,
      url // Direct fetch as last resort
    ] : [url];

    for (const fetchUrl of urls) {
      try {
        console.log(`Attempting to fetch: ${fetchUrl}`);
        const response = await fetch(fetchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = fetchUrl.includes('allorigins.win') 
          ? (await response.json()).contents 
          : await response.text();
        
        if (data && data.length > 100) { // Basic check for valid HTML
          console.log(`Successfully fetched from: ${fetchUrl}`);
          return data;
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${fetchUrl}:`, error);
        continue;
      }
    }
    
    throw new Error('Failed to fetch content from all available proxies');
  }

  private parseWithDOM(html: string): Document {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }

  async scrapeGlosbe(query: string): Promise<ScrapingResult> {
    try {
      const searchUrl = `https://glosbe.com/en/ibb/${encodeURIComponent(query)}`;
      console.log(`Scraping Glosbe for: ${query}`);
      
      const html = await this.fetchWithCors(searchUrl);
      const doc = this.parseWithDOM(html);
      
      const translations: ScrapedTranslation[] = [];
      
      // Enhanced selectors for Glosbe
      const translationSelectors = [
        '.translation-item',
        '.phrase-translation',
        '[data-testid="translation"]',
        '.phraselist-item',
        '.translation-text'
      ];
      
      for (const selector of translationSelectors) {
        const elements = doc.querySelectorAll(selector);
        
        elements.forEach((element, index) => {
          if (index >= 5) return; // Limit results
          
          const textContent = element.textContent?.trim();
          if (textContent && textContent.length > 0 && textContent.length < 100) {
            translations.push({
              ibibio: textContent,
              meaning: `Translation from Glosbe.com`,
              source: 'glosbe.com',
              confidence: 0.8 - (index * 0.1), // Decrease confidence for later results
              examples: this.extractExamples(element)
            });
          }
        });
        
        if (translations.length > 0) break; // Stop at first successful selector
      }
      
      // Fallback to more general selectors if no specific translations found
      if (translations.length === 0) {
        const generalElements = doc.querySelectorAll('div, span, p');
        generalElements.forEach((element, index) => {
          if (index >= 20 || translations.length >= 3) return;
          
          const text = element.textContent?.trim();
          if (text && text.length > 2 && text.length < 50 && 
              this.looksLikeIbibio(text) && !this.containsEnglish(text)) {
            translations.push({
              ibibio: text,
              meaning: `Potential translation from Glosbe.com`,
              source: 'glosbe.com',
              confidence: 0.6,
              examples: []
            });
          }
        });
      }
      
      return {
        success: translations.length > 0,
        translations: translations.slice(0, 3), // Limit to top 3
        source: 'glosbe.com',
        error: translations.length === 0 ? 'No translations found' : undefined
      };
      
    } catch (error) {
      console.error('Glosbe scraping error:', error);
      return {
        success: false,
        translations: [],
        source: 'glosbe.com',
        error: error instanceof Error ? error.message : 'Unknown scraping error'
      };
    }
  }

  async scrapeWiktionary(query: string): Promise<ScrapingResult> {
    try {
      const searchUrl = `https://en.wiktionary.org/wiki/${encodeURIComponent(query)}`;
      console.log(`Scraping Wiktionary for: ${query}`);
      
      const html = await this.fetchWithCors(searchUrl);
      const doc = this.parseWithDOM(html);
      
      const translations: ScrapedTranslation[] = [];
      
      // Look for Ibibio section
      const ibibioHeaders = doc.querySelectorAll('h2, h3, h4');
      let ibibioSection: Element | null = null;
      
      ibibioHeaders.forEach(header => {
        if (header.textContent?.toLowerCase().includes('ibibio')) {
          ibibioSection = header.parentElement;
        }
      });
      
      if (ibibioSection) {
        // Extract translations from Ibibio section
        const translationElements = ibibioSection.querySelectorAll('li, p, span');
        translationElements.forEach((element, index) => {
          if (index >= 5) return;
          
          const text = element.textContent?.trim();
          if (text && this.looksLikeIbibio(text)) {
            translations.push({
              ibibio: text,
              meaning: `Ibibio translation from Wiktionary`,
              source: 'wiktionary.org',
              confidence: 0.85,
              examples: []
            });
          }
        });
      }
      
      return {
        success: translations.length > 0,
        translations: translations.slice(0, 2),
        source: 'wiktionary.org',
        error: translations.length === 0 ? 'No Ibibio translations found' : undefined
      };
      
    } catch (error) {
      console.error('Wiktionary scraping error:', error);
      return {
        success: false,
        translations: [],
        source: 'wiktionary.org',
        error: error instanceof Error ? error.message : 'Unknown scraping error'
      };
    }
  }

  private extractExamples(element: Element): Array<{ english: string; ibibio: string }> {
    const examples: Array<{ english: string; ibibio: string }> = [];
    
    // Look for example sentences in the element or its siblings
    const exampleElements = element.querySelectorAll('.example, .usage-example, .sentence');
    
    exampleElements.forEach(exampleEl => {
      const text = exampleEl.textContent?.trim();
      if (text && text.includes(' - ')) {
        const parts = text.split(' - ');
        if (parts.length === 2) {
          examples.push({
            english: parts[0].trim(),
            ibibio: parts[1].trim()
          });
        }
      }
    });
    
    return examples.slice(0, 2); // Limit examples
  }

  private looksLikeIbibio(text: string): boolean {
    // Basic heuristics for Ibibio text
    const ibibioPatterns = [
      /[ụọịẹ]/, // Contains Ibibio-specific characters
      /^[a-zụọịẹ\s]{2,20}$/i, // Reasonable length with potential Ibibio chars
    ];
    
    return ibibioPatterns.some(pattern => pattern.test(text)) && 
           !this.containsEnglish(text);
  }

  private containsEnglish(text: string): boolean {
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const lowerText = text.toLowerCase();
    return englishWords.some(word => lowerText.includes(` ${word} `) || 
                                   lowerText.startsWith(`${word} `) || 
                                   lowerText.endsWith(` ${word}`));
  }

  async searchMultipleSources(query: string): Promise<ScrapingResult[]> {
    console.log(`Starting multi-source scraping for: ${query}`);
    
    const searches = [
      this.scrapeGlosbe(query),
      this.scrapeWiktionary(query)
    ];
    
    const results = await Promise.allSettled(searches);
    
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : {
        success: false,
        translations: [],
        source: 'unknown',
        error: 'Search failed'
      }
    ).filter(result => result.success);
  }
}

export const enhancedWebScrapingService = new EnhancedWebScrapingService();
export type { ScrapedTranslation, ScrapingResult };
