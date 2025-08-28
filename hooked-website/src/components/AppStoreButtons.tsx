'use client';

import { trackCTAButton } from './GoogleAnalytics';

export default function AppStoreButtons() {
  return (
    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
      {/* App Store Button */}
      <a 
        href="https://apps.apple.com/app/hooked/id6748921014" 
        target="_blank" 
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
        aria-label="Download Hooked on the App Store"
        onClick={() => trackCTAButton('app_store_download', 'footer')}
      >
        <img 
          src="/Apple Store Badge.png" 
          alt="Download on the App Store" 
          className="h-12 w-[160px] object-contain"
        />
      </a>

      {/* Play Store Button */}
      <a 
        href="https://play.google.com/store/apps/details?id=com.hookedapp.app" 
        target="_blank" 
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
        aria-label="Get Hooked on Google Play"
        onClick={() => trackCTAButton('play_store_download', 'footer')}
      >
        <img 
          src="/Play Store Badge.png" 
          alt="Get it on Google Play" 
          className="h-12 w-[160px] object-contain"
        />
      </a>
    </div>
  );
}