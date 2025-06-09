
import { DynamicTool } from '@langchain/core/tools';
import { webScrapingService } from './webScrapingService';
import { DictionaryEntry } from '../types/dictionary';

export const createGlosbeSearchTool = () => {
  return new DynamicTool({
    name: 'glosbe_search',
    description: 'Search for English to Ibibio translations on Glosbe.com. Input should be an English word or phrase.',
    func: async (input: string): Promise<string> => {
      try {
        console.log('Searching Glosbe for:', input);
        
        const searchUrl = `https://glosbe.com/en/ibb/${encodeURIComponent(input)}`;
        const html = await webScrapingService.fetchWithCors(searchUrl);
        
        const results = webScrapingService.parseGlosbeResults(html);
        
        if (results.length === 0) {
          return JSON.stringify({
            success: false,
            message: 'No translations found on Glosbe',
            results: []
          });
        }

        return JSON.stringify({
          success: true,
          message: `Found ${results.length} translation(s) on Glosbe`,
          results: results.map(result => ({
            ibibio: result.ibibio,
            meaning: result.meaning,
            source: 'glosbe.com',
            confidence: 0.8
          }))
        });
      } catch (error) {
        console.error('Glosbe search error:', error);
        return JSON.stringify({
          success: false,
          message: 'Failed to search Glosbe',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });
};
