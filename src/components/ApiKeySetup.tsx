import React, { useState, useEffect } from 'react';
import { Key, AlertCircle, CheckCircle, ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { groqService } from '../services/groqService';

const ApiKeySetup = () => {
  const [apiKey, setApiKey] = useState('');
  const [isSet, setIsSet] = useState(false);
  const [isEnvKey, setIsEnvKey] = useState(false);

  useEffect(() => {
    const existingKey = groqService.getApiKey();
    const envKey = import.meta.env.VITE_GROQ_API_KEY;
    
    if (envKey) {
      setIsSet(true);
      setIsEnvKey(true);
      setApiKey('•'.repeat(20) + envKey.slice(-4));
    } else if (existingKey) {
      setIsSet(true);
      setIsEnvKey(false);
      setApiKey('•'.repeat(20) + existingKey.slice(-4));
    }
  }, []);

  const handleSaveKey = () => {
    if (apiKey && !apiKey.includes('•')) {
      groqService.setApiKey(apiKey);
      setIsSet(true);
      setIsEnvKey(false);
      setApiKey('•'.repeat(20) + apiKey.slice(-4));
    }
  };

  const handleUpdateKey = () => {
    if (isEnvKey) {
      // Can't update environment variable from UI
      return;
    }
    setIsSet(false);
    setApiKey('');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Key className="w-5 h-5 mr-2" />
          AI Enhancement Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Production Environment Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Production Setup:</strong> The application uses environment variables for secure API key management.
            <br />
            <strong>Development/Testing:</strong> You can temporarily configure an API key below for testing enhanced features.
          </AlertDescription>
        </Alert>

        {isSet ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">
                API key configured successfully {isEnvKey ? '(production environment)' : '(development mode)'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                value={apiKey}
                readOnly
                className="bg-gray-50"
              />
              {!isEnvKey && (
                <Button variant="outline" onClick={handleUpdateKey}>
                  Update
                </Button>
              )}
            </div>
            {isEnvKey && (
              <p className="text-xs text-gray-500">
                This API key is configured via environment variable for production security.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Groq API key required for AI-enhanced translations</span>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="password"
                placeholder="Enter your Groq API key (development only)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button onClick={handleSaveKey} disabled={!apiKey}>
                Save
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              <p>Get your API key from: <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">
                console.groq.com <ExternalLink className="w-3 h-3 ml-1" />
              </a></p>
            </div>
          </div>
        )}

        {/* Production Deployment Instructions */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-800 mb-3">Production Environment Setup</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Vercel Deployment:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Go to your Vercel project dashboard</li>
              <li>Navigate to Settings → Environment Variables</li>
              <li>Add: <code className="bg-gray-100 px-1 rounded">VITE_GROQ_API_KEY</code> = your_api_key</li>
              <li>Set for: Production, Preview, Development</li>
              <li>Redeploy your application</li>
            </ol>
            
            <p className="mt-3"><strong>Other Platforms:</strong></p>
            <p>Set the environment variable <code className="bg-gray-100 px-1 rounded">VITE_GROQ_API_KEY</code> in your hosting platform's environment configuration.</p>
            
            <p className="text-orange-600 mt-3">
              <strong>Security:</strong> Never commit API keys to your repository. Always use environment variables for production deployments.
            </p>
          </div>
        </div>

        {/* Features Enabled */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-800 mb-3">Enhanced Features</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>With API key configured, you get access to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>AI-powered translation for words not in local dictionary</li>
              <li>Cultural context and pronunciation guides</li>
              <li>Example sentences and usage patterns</li>
              <li>Online dictionary integration</li>
              <li>Enhanced search with multiple sources</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeySetup;