import React from 'react';
import { Heart, Globe } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-8 sm:mt-12 lg:mt-16">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="text-center space-y-3">
          {/* Main Copyright */}
          <p className="text-sm sm:text-base text-gray-700 font-medium">
            © 2025 Ibi-Voice by <span className="font-bold text-blue-600">JR-Solvy</span>
          </p>
          
          {/* Company Info */}
          <p className="text-xs sm:text-sm text-gray-600">
            A product of <span className="font-semibold text-purple-600">JR Digital Insights</span> | 
            <span className="mx-1">Preserving Language. Empowering Communication.</span>
          </p>
          
          {/* Website and Location */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
              <a 
                href="https://www.jrsolvy.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 transition-colors font-medium"
              >
                www.jrsolvy.com
              </a>
            </div>
            
            <span className="hidden sm:inline text-gray-400">|</span>
            
            <div className="flex items-center space-x-1">
              <span>Made with</span>
              <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 fill-current" />
              <span>in <span className="font-semibold text-green-600">Nigeria</span></span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;