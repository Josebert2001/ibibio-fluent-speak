import { DynamicTool } from '@langchain/core/tools';
import { DictionaryEntry } from '../types/dictionary';

export const createOnlineDictionaryTool = () => {
  return new DynamicTool({
    name: 'online_dictionary_search',
    description: 'Search multiple online dictionaries for English to Ibibio translations. Input should be an English word or phrase.',
    func: async (input: string): Promise<string> => {
      try {
        console.log('Searching online dictionaries for:', input);
        
        // Simulate multiple dictionary searches with timeout
        const searchPromises = [
          searchGlosbe(input),
          searchWiktionary(input),
          searchForvo(input)
        ];

        // Race with timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Search timeout')), 3000);
        });

        const results = await Promise.race([
          Promise.allSettled(searchPromises),
          timeoutPromise
        ]);

        const successfulResults = (results as PromiseSettledResult<any>[])
          .filter(result => result.status === 'fulfilled')
          .map(result => (result as PromiseFulfilledResult<any>).value)
          .filter(result => result && result.translations.length > 0);

        if (successfulResults.length === 0) {
          return JSON.stringify({
            success: false,
            message: 'No translations found in online dictionaries',
            results: []
          });
        }

        // Combine and rank results
        const combinedResults = combineSearchResults(successfulResults);

        return JSON.stringify({
          success: true,
          message: `Found ${combinedResults.length} translation(s) from online sources`,
          results: combinedResults
        });
      } catch (error) {
        console.error('Online dictionary search error:', error);
        return JSON.stringify({
          success: false,
          message: 'Failed to search online dictionaries',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });
};

async function searchGlosbe(query: string): Promise<any> {
  // Simulate Glosbe search
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        source: 'glosbe.com',
        translations: [
          {
            ibibio: `${query}_ibibio_glosbe`,
            meaning: `Glosbe translation for ${query}`,
            confidence: 0.8
          }
        ]
      });
    }, Math.random() * 1000 + 500);
  });
}

async function searchWiktionary(query: string): Promise<any> {
  // Simulate Wiktionary search
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        source: 'wiktionary.org',
        translations: [
          {
            ibibio: `${query}_ibibio_wikt`,
            meaning: `Wiktionary translation for ${query}`,
            confidence: 0.75
          }
        ]
      });
    }, Math.random() * 1000 + 300);
  });
}

async function searchForvo(query: string): Promise<any> {
  // Simulate Forvo search (pronunciation focused)
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        source: 'forvo.com',
        translations: [
          {
            ibibio: `${query}_ibibio_forvo`,
            meaning: `Forvo pronunciation for ${query}`,
            confidence: 0.6,
            pronunciation: `/${query}_pronunciation/`
          }
        ]
      });
    }, Math.random() * 1000 + 800);
  });
}

function combineSearchResults(results: any[]): any[] {
  const translationMap = new Map<string, any>();

  results.forEach(result => {
    result.translations.forEach((translation: any) => {
      const key = translation.ibibio.toLowerCase();
      
      if (!translationMap.has(key)) {
        translationMap.set(key, {
          ...translation,
          sources: [result.source],
          combinedConfidence: translation.confidence
        });
      } else {
        const existing = translationMap.get(key)!;
        existing.sources.push(result.source);
        existing.combinedConfidence = Math.max(existing.combinedConfidence, translation.confidence);
        
        // Boost confidence for multiple sources
        existing.combinedConfidence = Math.min(0.95, existing.combinedConfidence + 0.1);
      }
    });
  });

  return Array.from(translationMap.values())
    .sort((a, b) => b.combinedConfidence - a.combinedConfidence)
    .slice(0, 5);
}

export const createResultValidationTool = () => {
  return new DynamicTool({
    name: 'validate_translation_results',
    description: 'Validate and reconcile translation results from multiple sources. Input should be JSON with local and online results.',
    func: async (input: string): Promise<string> => {
      try {
        const data = JSON.parse(input);
        const { localResults, onlineResults, query } = data;

        const validation = {
          primaryResult: null as any,
          confidence: 0,
          alternatives: [] as any[],
          sources: [] as string[],
          discrepancies: [] as string[]
        };

        // Prioritize local dictionary results
        if (localResults && localResults.length > 0) {
          validation.primaryResult = localResults[0];
          validation.confidence = 95;
          validation.sources.push('local_dictionary');
        }

        // Cross-reference with online results
        if (onlineResults && onlineResults.length > 0) {
          const onlineMatch = onlineResults.find((result: any) => 
            validation.primaryResult && 
            result.ibibio.toLowerCase() === validation.primaryResult.ibibio.toLowerCase()
          );

          if (onlineMatch) {
            validation.confidence = Math.min(100, validation.confidence + 5);
            validation.sources.push(...onlineMatch.sources);
          } else if (!validation.primaryResult) {
            validation.primaryResult = onlineResults[0];
            validation.confidence = onlineResults[0].combinedConfidence * 100;
            validation.sources.push(...onlineResults[0].sources);
          } else {
            validation.discrepancies.push('Online sources provide different translations');
            validation.alternatives = onlineResults.slice(0, 3);
          }
        }

        return JSON.stringify(validation);
      } catch (error) {
        return JSON.stringify({
          error: 'Failed to validate results',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });
};