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
          Groq API Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Environment Variable Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>For Production:</strong> Set the <code className="bg-gray-100 px-1 rounded">VITE_GROQ_API_KEY</code> environment variable in your Vercel deployment settings.
            <br />
            <strong>For Development:</strong> You can temporarily set the API key below for testing.
          </AlertDescription>
        </Alert>

        {isSet ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">
                API key configured successfully {isEnvKey ? '(from environment variable)' : '(from localStorage)'}
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
                This API key is set via environment variable and cannot be changed from the UI.
              </p>
            )}
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
                placeholder="Enter your Groq API key (for development only)"
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

        {/* Vercel Deployment Instructions */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-800 mb-3">Vercel Environment Variable Setup</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Step 1:</strong> Go to your Vercel project dashboard</p>
            <p><strong>Step 2:</strong> Navigate to Settings → Environment Variables</p>
            <p><strong>Step 3:</strong> Add a new environment variable:</p>
            <div className="bg-gray-50 p-3 rounded-lg font-mono text-xs">
              <div>Name: <code className="bg-white px-1 rounded">VITE_GROQ_API_KEY</code></div>
              <div>Value: <code className="bg-white px-1 rounded">your_groq_api_key_here</code></div>
              <div>Environment: <code className="bg-white px-1 rounded">Production, Preview, Development</code></div>
            </div>
            <p><strong>Step 4:</strong> Redeploy your application</p>
            <p className="text-orange-600">
              <strong>Important:</strong> Never commit API keys to your repository. Always use environment variables for sensitive data.
            </p>
          </div>
        </div>

        {/* Local Development Instructions */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-800 mb-3">Local Development Setup</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>For local development, create a <code className="bg-gray-100 px-1 rounded">.env.local</code> file in your project root:</p>
            <div className="bg-gray-50 p-3 rounded-lg font-mono text-xs">
              <code>VITE_GROQ_API_KEY=your_groq_api_key_here</code>
            </div>
            <p className="text-orange-600">
              <strong>Note:</strong> Add <code className="bg-gray-100 px-1 rounded">.env.local</code> to your <code className="bg-gray-100 px-1 rounded">.gitignore</code> file to prevent accidental commits.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeySetup;