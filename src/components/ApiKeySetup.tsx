
import React, { useState, useEffect } from 'react';
import { Key, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { groqService } from '../services/groqService';

const ApiKeySetup = () => {
  const [apiKey, setApiKey] = useState('');
  const [isSet, setIsSet] = useState(false);

  useEffect(() => {
    const existingKey = groqService.getApiKey();
    if (existingKey) {
      setIsSet(true);
      setApiKey('•'.repeat(20) + existingKey.slice(-4));
    }
  }, []);

  const handleSaveKey = () => {
    if (apiKey && !apiKey.includes('•')) {
      groqService.setApiKey(apiKey);
      setIsSet(true);
      setApiKey('•'.repeat(20) + apiKey.slice(-4));
    }
  };

  const handleUpdateKey = () => {
    setIsSet(false);
    setApiKey('');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Key className="w-5 h-5 mr-2" />
          Groq API Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSet ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">API key configured successfully</span>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                value={apiKey}
                readOnly
                className="bg-gray-50"
              />
              <Button variant="outline" onClick={handleUpdateKey}>
                Update
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Groq API key required for AI-powered translations</span>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="password"
                placeholder="Enter your Groq API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button onClick={handleSaveKey} disabled={!apiKey}>
                Save
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              <p>Get your API key from: <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.groq.com</a></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiKeySetup;
