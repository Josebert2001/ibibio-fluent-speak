
import React from 'react';
import ChatInterface from '../components/ChatInterface';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ibibio Language Assistant
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Chat with your AI assistant to learn Ibibio language and culture. 
            Ask questions, get translations, and explore the rich heritage of the Ibibio people.
          </p>
        </div>
        <ChatInterface />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
