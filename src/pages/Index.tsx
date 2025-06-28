import React from 'react';
import TranslationInterface from '../components/TranslationInterface';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <TranslationInterface />
      </main>
      <Footer />
    </div>
  );
};

export default Index;