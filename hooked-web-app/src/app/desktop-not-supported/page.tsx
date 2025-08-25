'use client';

import { DevicePhoneMobileIcon, QrCodeIcon } from '@heroicons/react/24/outline';

export default function DesktopNotSupportedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-center text-white">
        <div className="mb-8">
          <DevicePhoneMobileIcon className="h-16 w-16 mx-auto mb-4 text-white/80" />
          <h1 className="text-3xl font-bold mb-2">Mobile Only</h1>
          <p className="text-white/80 text-lg">
            Hooked is designed exclusively for mobile devices
          </p>
        </div>

        <div className="space-y-6 mb-8">
          <div className="flex items-start space-x-3">
            <QrCodeIcon className="h-6 w-6 mt-1 flex-shrink-0 text-white/80" />
            <div className="text-left">
              <h3 className="font-semibold mb-1">Access via Mobile</h3>
              <p className="text-white/70 text-sm">
                Open this link on your mobile device or scan a QR code at an event
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <DevicePhoneMobileIcon className="h-6 w-6 mt-1 flex-shrink-0 text-white/80" />
            <div className="text-left">
              <h3 className="font-semibold mb-1">Optimized Experience</h3>
              <p className="text-white/70 text-sm">
                Our mobile-first design ensures the best experience on phones and tablets
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-white/60 text-sm">
            Visit <strong>hooked-app.com</strong> on your mobile device
          </p>
          
          <div className="border-t border-white/20 pt-4">
            <p className="text-white/40 text-xs">
              Having trouble? Contact support for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}