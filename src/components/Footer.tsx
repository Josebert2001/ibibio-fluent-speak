
import React from 'react';
import { Heart, Github, Globe } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2 text-gray-600">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-red-500 fill-current" />
            <span>for Ibibio language preservation</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
              <Globe className="w-5 h-5" />
            </a>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Features</h4>
              <ul className="space-y-1">
                <li>AI-Powered Translation</li>
                <li>Offline Dictionary</li>
                <li>Voice Input & Output</li>
                <li>Cultural Context</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Technology</h4>
              <ul className="space-y-1">
                <li>Groq Llama3-8B-8192</li>
                <li>Langchain Integration</li>
                <li>Online Search</li>
                <li>React Native</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">About</h4>
              <p className="text-gray-600">
                Bridging cultures through intelligent translation and preserving the beautiful Ibibio language for future generations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
