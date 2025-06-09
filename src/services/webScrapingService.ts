
class WebScrapingService {
  private corsProxy = 'https://api.allorigins.win/get?url=';

  async fetchWithCors(url: string): Promise<string> {
    try {
      const proxyUrl = `${this.corsProxy}${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.contents;
    } catch (error) {
      console.error('Web scraping error:', error);
      throw new Error('Failed to fetch web content');
    }
  }

  parseGlosbeResults(html: string): Array<{
    ibibio: string;
    meaning: string;
    examples?: Array<{ english: string; ibibio: string }>;
  }> {
    // Basic HTML parsing - in a real implementation, you'd use cheerio
    const results: Array<{
      ibibio: string;
      meaning: string;
      examples?: Array<{ english: string; ibibio: string }>;
    }> = [];

    // Simple regex-based parsing for demonstration
    // This would be much more robust with cheerio
    const translationMatches = html.match(/<div[^>]*class="[^"]*translation[^"]*"[^>]*>(.*?)<\/div>/gi);
    
    if (translationMatches) {
      translationMatches.slice(0, 3).forEach((match, index) => {
        // Extract text content (very basic, would use cheerio in real implementation)
        const textContent = match.replace(/<[^>]*>/g, '').trim();
        if (textContent && textContent.length > 0) {
          results.push({
            ibibio: textContent,
            meaning: `Translation found from Glosbe.com`,
            examples: []
          });
        }
      });
    }

    return results;
  }
}

export const webScrapingService = new WebScrapingService();
