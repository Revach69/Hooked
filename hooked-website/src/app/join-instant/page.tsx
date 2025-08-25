'use client';

import { useEffect, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function JoinInstantContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [userAgent, setUserAgent] = useState('');

  useEffect(() => {
    setUserAgent(navigator.userAgent);
  }, []);

  useEffect(() => {
    if (!code) {
      window.location.href = 'https://hooked-app.com';
      return;
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    
    if (isMobile) {
      if (isIOS) {
        // Try to open the app with custom scheme
        const appUrl = `hooked://join?code=${code}`;
        
        // Create invisible iframe to attempt app launch
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = appUrl;
        document.body.appendChild(iframe);
        
        // Clean up iframe after attempt
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 100);
        
        // If app didn't open (page still visible), redirect to App Store
        setTimeout(() => {
          if (!document.hidden) {
            // Redirect directly to App Store
            window.location.href = 'https://apps.apple.com/app/hooked/id6748921014';
          }
        }, 1000);
      } else if (isAndroid) {
        // For Android: Try Intent URL with direct Play Store fallback
        const intentUrl = `intent://join?code=${code}#Intent;scheme=hooked;package=com.hookedapp.app;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.hookedapp.app;end`;
        
        // Android Intent URLs handle the fallback automatically
        window.location.href = intentUrl;
      } else {
        // Other mobile OS - redirect to home page
        window.location.href = 'https://hooked-app.com';
      }
    } else {
      // Desktop - redirect to home page after brief delay
      setTimeout(() => {
        window.location.href = 'https://hooked-app.com';
      }, 2000);
    }
  }, [code, userAgent]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
      <div className="text-center p-8">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-2xl">💕</span>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Opening The Hooked App...</h1>
        <p className="text-gray-600 mb-4">
          {code ? `Joining event: #${code}` : 'Redirecting...'}
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-4">
          If the app doesn&apos;t open automatically, we&apos;ll show you download options
        </p>
      </div>
    </div>
  );
}

export default function JoinInstant() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="text-center p-8">
          <h1 className="text-3xl font-bold mb-4">Loading...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      </div>
    }>
      <JoinInstantContent />
    </Suspense>
  );
}