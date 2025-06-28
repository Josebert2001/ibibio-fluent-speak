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
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="flex items-center text-base sm:text-lg text-gray-800">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
          Recent Searches
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 sm:space-y-3">
          {searches.slice(0, 4).map((search, index) => (
            <div
              key={index}
              onClick={() => onSearchSelect(search.english)}
              className="flex items-center justify-between p-3 rounded-lg bg-white/70 hover:bg-white hover:shadow-md transition-all duration-300 cursor-pointer group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-1">
                  <span className="font-medium text-gray-800 text-sm sm:text-base truncate">{search.english}</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 group-hover:text-blue-600 transition-colors hidden sm:block" />
                  <span className="font-semibold text-blue-700 text-sm sm:text-base truncate">{search.ibibio}</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{search.meaning}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentSearches;