import React from 'react';
import { Globe, Heart } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Globe className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-gray-800">Ibi-Voice</h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">English to Ibibio Translation</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <nav className="flex space-x-4">
              <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">Dictionary</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">Favorites</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">History</a>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;