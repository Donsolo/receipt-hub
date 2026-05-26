"use client";

import React from 'react';
import PullToRefresh from 'react-simple-pull-to-refresh';

export default function PullToRefreshWrapper({ children }: { children: React.ReactNode }) {
  const handleRefresh = async () => {
    window.location.reload();
  };

  return (
    <PullToRefresh 
      onRefresh={handleRefresh}
      pullingContent={
        <div className="flex justify-center items-center py-4 opacity-50">
           <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
           </svg>
        </div>
      }
      refreshingContent={
        <div className="flex justify-center items-center py-4">
           <div className="w-6 h-6 border-2 border-[var(--text-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
      resistance={3}
    >
      <div className="min-h-[100vh]">
        {children}
      </div>
    </PullToRefresh>
  );
}
