'use client';

import { useEffect, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function JoinInstantContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [showFallback, setShowFallback] = useState(false);
  const [userAgent, setUserAgent] = useState('');

  useEffect(() => {
    setUserAgent(navigator.userAgent);
  }, []);

  useEffect(() => {
    if (!code) {
      window.location.href = 'https://hooked-app.com';
      return;
    }

    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    
    if (isIOS) {
      // iOS - automatically open App Store modal on page load
      window.open('https://apps.apple.com/app/hooked/id6748921014', '_blank');
      
      // Show fallback UI after short delay in case modal didn't work
      setTimeout(() => {
        setShowFallback(true);
      }, 1500);
    } else {
      // Android/Desktop - show fallback UI immediately
      setShowFallback(true);
    }
  }, [code, userAgent]);

  const handleOpenApp = () => {
    const appSchemeUrl = `hooked://join?code=${code}`;
    window.location.href = appSchemeUrl;
  };

  const handleAppStore = () => {
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    
    if (isIOS) {
      // For iOS, open App Store URL directly - iOS Safari will show native modal
      window.open('https://apps.apple.com/app/hooked/id6748921014', '_blank');
    } else {
      // Android - direct to Play Store
      const storeUrl = 'https://play.google.com/store/apps/details?id=com.hookedapp.app';
      window.location.href = storeUrl;
    }
  };

  if (showFallback) {
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Logo */}
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-2xl font-bold">💕</span>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Event</h1>
          <p className="text-gray-600 mb-6">
            Event Code: <span className="font-mono font-bold text-purple-600">#{code}</span>
          </p>
          
          {isIOS ? (
            <>
              <div className="space-y-3 mb-6">
                <button
                  onClick={handleAppStore}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-pink-600 hover:to-purple-700 transition-colors"
                >
                  📱 Download from App Store
                </button>
                
                <p className="text-sm text-gray-500">
                  Already have the app? Open it directly:
                </p>
                
                <button
                  onClick={handleOpenApp}
                  className="w-full bg-gray-900 text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  🚀 Open in The Hooked App
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600">
                  Having trouble? Make sure you have the latest version of The Hooked App installed.
                </p>
              </div>
            </>
          ) : isAndroid ? (
            <>
              <div className="bg-gradient-to-r from-orange-50 to-pink-50 border-2 border-orange-200 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-center mb-3">
                  <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-full p-2">
                    <span className="text-white text-xl">🚀</span>
                  </div>
                </div>
                <h2 className="font-bold text-gray-900 mb-2 text-lg">Android Beta Access</h2>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Our Android app is in beta! Follow these simple steps to join the exclusive beta program.
                </p>
              </div>
              
              <div className="space-y-5">
                <div className="bg-white border-2 border-purple-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-3">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3 shadow-md">1</div>
                    <h3 className="font-bold text-gray-900 text-lg">Join Beta Group</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 ml-11 leading-relaxed">
                    Join our Google Group to unlock beta access
                  </p>
                  <div className="ml-11">
                    <a
                      href="https://groups.google.com/g/hooked-beta/about"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 text-center shadow-lg"
                    >
                      🔗 Join Beta Group
                    </a>
                  </div>
                </div>
                
                <div className="bg-white border-2 border-green-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-3">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3 shadow-md">2</div>
                    <h3 className="font-bold text-gray-900 text-lg">Download App</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 ml-11 leading-relaxed">
                    Once approved, download the beta from Play Store
                  </p>
                  <div className="ml-11">
                    <a
                      href="https://play.google.com/apps/testing/com.hookedapp.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-block bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 text-center shadow-lg"
                    >
                      📱 Get Beta App
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-xs text-purple-700 text-center font-medium">
                  ⏱️ Beta access may take a few minutes after joining the group
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-6">
                This link is designed for mobile devices. To join the event:
              </p>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-semibold text-gray-900 mb-2">Option 1: Use your phone</p>
                  <p className="text-sm text-gray-600">
                    Scan this QR code or open this link on your mobile device
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-semibold text-gray-900 mb-2">Option 2: Download the app</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={handleAppStore}
                      className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                    >
                      📱 App Store
                    </button>
                    <button
                      onClick={() => window.open('https://play.google.com/store/apps/details?id=com.hookedapp.app', '_blank')}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      📱 Play Store
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Loading screen for when fallback hasn't loaded yet
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
      <div className="text-center p-8">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-2xl">💕</span>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Loading...</h1>
        <p className="text-gray-600 mb-4">
          {code ? `Event code: #${code}` : 'Setting up...'}
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
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