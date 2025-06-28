import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dictionaryService } from '../services/dictionaryService';
import { DictionaryEntry } from '../types/dictionary';

const DictionaryUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const text = await file.text();
      let data: any[];

      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        // Simple CSV parser - assumes header row
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        data = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const entry: any = {};
            headers.forEach((header, index) => {
              entry[header] = values[index] || '';
            });
            return entry;
          });
      } else {
        throw new Error('Unsupported file format. Please use JSON or CSV.');
      }

      // Validate and transform data with support for custom field names
      const entries: DictionaryEntry[] = data.map((item, index) => ({
        id: item.id || `entry-${index}`,
        // Support multiple field name variations
        english: item.english || item.English || item.english_definition || item.english_word || '',
        ibibio: item.ibibio || item.Ibibio || item.ibibio_word || item.ibibio_translation || '',
        meaning: item.meaning || item.Meaning || item.english_definition || item.definition || '',
        partOfSpeech: item.partOfSpeech || item.part_of_speech || item['Part of Speech'] || item.pos || 'unknown',
        examples: item.examples || [],
        pronunciation: item.pronunciation || item.Pronunciation || item.phonetic || '',
        cultural: item.cultural || item.Cultural || item.context || '',
        category: item.category || item.Category || item.type || ''
      }));

      // Filter out invalid entries (must have both english and ibibio)
      const validEntries = entries.filter(entry => 
        entry.english && entry.ibibio && entry.meaning
      );

      if (validEntries.length === 0) {
        throw new Error('No valid entries found in the file. Make sure your file has "english_definition" and "ibibio_word" fields (or similar variations).');
      }

      await dictionaryService.saveDictionary(validEntries);
      setSuccess(`Successfully uploaded ${validEntries.length} dictionary entries! ${validEntries.length < entries.length ? `(${entries.length - validEntries.length} entries were skipped due to missing required fields)` : ''}`);
      
      // Clear the input
      event.target.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload dictionary');
    } finally {
      setUploading(false);
    }
  };

  const stats = dictionaryService.getStats();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Dictionary Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>Current dictionary: <span className="font-medium">{stats.totalEntries} entries</span></p>
          {stats.isLoaded && (
            <p className="text-green-600">✓ Dictionary loaded successfully</p>
          )}
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <label htmlFor="dictionary-upload" className="cursor-pointer">
            <span className="text-sm text-gray-600">
              Upload your Ibibio dictionary (JSON or CSV format)
            </span>
            <input
              id="dictionary-upload"
              type="file"
              accept=".json,.csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <Button 
              variant="outline" 
              className="mt-2" 
              disabled={uploading}
              asChild
            >
              <span>
                {uploading ? 'Uploading...' : 'Choose File'}
              </span>
            </Button>
          </label>
        </div>

        {error && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Supported field names:</strong></p>
          <p>• English: english, English, english_definition, english_word</p>
          <p>• Ibibio: ibibio, Ibibio, ibibio_word, ibibio_translation</p>
          <p>• Meaning: meaning, Meaning, english_definition, definition</p>
          <p>• Part of Speech: partOfSpeech, part_of_speech, "Part of Speech", pos</p>
          <p>• Other fields: pronunciation, cultural, category, examples</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DictionaryUpload;