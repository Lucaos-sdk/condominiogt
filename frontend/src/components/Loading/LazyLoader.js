import React from 'react';

const LazyLoader = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
        </div>
        <p className="text-gray-600 text-sm">Carregando...</p>
      </div>
    </div>
  );
};

export default LazyLoader;