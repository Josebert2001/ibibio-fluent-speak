
import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RecentSearch {
  english: string;
  ibibio: string;
  meaning: string;
}

interface RecentSearchesProps {
  searches: RecentSearch[];
  onSearchSelect: (query: string) => void;
}

const RecentSearches = ({ searches, onSearchSelect }: RecentSearchesProps) => {
  return (
    <Card className="w-full max-w-2xl mx-auto bg-white/60 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-lg text-gray-800">
          <Clock className="w-5 h-5 mr-2 text-blue-600" />
          Recent Searches
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {searches.map((search, index) => (
            <div
              key={index}
              onClick={() => onSearchSelect(search.english)}
              className="flex items-center justify-between p-3 rounded-lg bg-white/70 hover:bg-white hover:shadow-md transition-all duration-300 cursor-pointer group"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-1">
                  <span className="font-medium text-gray-800">{search.english}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <span className="font-semibold text-blue-700">{search.ibibio}</span>
                </div>
                <p className="text-sm text-gray-600 truncate">{search.meaning}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentSearches;
