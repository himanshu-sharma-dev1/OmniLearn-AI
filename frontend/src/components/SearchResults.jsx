// src/components/SearchResults.jsx
import React from 'react';
import { X, Loader, AlertCircle } from 'lucide-react';

const SearchResults = ({ results, isLoading, onClose }) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl h-3/4 flex flex-col">
        <header className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Search Results</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X size={24} />
          </button>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader size={48} className="animate-spin text-blue-600" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="p-4 border rounded-md bg-gray-50">
                  <p className="text-gray-800">{result.content}</p>
                  <div className="text-sm text-gray-500 mt-2">
                    Source: {result.source} (Page: {result.page_number})
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center h-full text-gray-500">
              <AlertCircle size={48} className="mb-4" />
              <p>No results found.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SearchResults;