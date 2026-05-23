'use client';

import { useEffect } from 'react';

export default function NotFound() {
  useEffect(() => {
    // This script runs when a 404 page is loaded on GitHub Pages
    const pathSegmentsToKeep = 1;
    const l = window.location;
    
    // Redirect to the root with the current path as a parameter
    const newPath = 
      l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
      l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
      l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
      (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
      l.hash;

    l.replace(newPath);
  }, []);

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-8"></div>
      <h1 className="text-xl font-black text-white uppercase tracking-widest animate-pulse">
        Re-Routing to Royale...
      </h1>
    </div>
  );
}
