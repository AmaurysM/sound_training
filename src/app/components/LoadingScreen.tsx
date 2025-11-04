'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean; 
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  fullScreen = true,
}) => {
  return (
    <div
      className={`${
        fullScreen ? 'min-h-screen bg-gray-50' : 'p-4'
      } flex items-center justify-center`}
    >
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
