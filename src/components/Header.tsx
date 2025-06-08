
import React from 'react';
import { Globe, Heart } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Ibibio Translator</h1>
              <p className="text-sm text-gray-600">English to Ibibio Translation</p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <nav className="flex space-x-4">
              <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">Dictionary</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">Favorites</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">History</a>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
