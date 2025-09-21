import React, { useState, useEffect } from 'react';

const MobileDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    const info: string[] = [];
    
    // Check user agent
    info.push(`User Agent: ${navigator.userAgent}`);
    
    // Check viewport
    info.push(`Viewport: ${window.innerWidth}x${window.innerHeight}`);
    
    // Check APIs
    info.push(`Fetch API: ${typeof fetch !== 'undefined' ? '✅' : '❌'}`);
    info.push(`LocalStorage: ${typeof localStorage !== 'undefined' ? '✅' : '❌'}`);
    info.push(`Service Worker: ${'serviceWorker' in navigator ? '✅' : '❌'}`);
    info.push(`Speech Recognition: ${('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) ? '✅' : '❌'}`);
    info.push(`Clipboard API: ${navigator.clipboard ? '✅' : '❌'}`);
    
    // Check PWA
    info.push(`PWA Installable: ${window.matchMedia('(display-mode: standalone)').matches ? '✅' : '❌'}`);
    
    // Check HTTPS
    info.push(`HTTPS: ${location.protocol === 'https:' ? '✅' : '❌'}`);
    
    setDebugInfo(info);
  }, []);

  const [showDebug, setShowDebug] = useState(false);

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="bg-red-600 text-white p-2 rounded-full text-xs"
      >
        Debug
      </button>
      
      {showDebug && (
        <div className="absolute bottom-12 left-0 bg-black/90 text-white p-4 rounded-lg max-w-xs text-xs">
          <div className="font-bold mb-2">Mobile Debug Info:</div>
          {debugInfo.map((info, index) => (
            <div key={index} className="mb-1">{info}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileDebug;