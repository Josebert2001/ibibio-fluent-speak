import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-8 sm:mt-12 lg:mt-16">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="text-center">
          <p className="text-sm sm:text-base text-gray-600">
            Created by <span className="font-bold text-blue-600">JR-Solvy</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;