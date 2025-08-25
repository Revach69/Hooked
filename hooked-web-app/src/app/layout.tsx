import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from '@/components/SessionProvider';
import { NotificationProvider } from '@/components/NotificationProvider';
import { ToastProvider } from '@/components/Toast';
import MobileLayout from '@/components/MobileLayout';
import { PWAInstallPromptWithSuspense } from '@/components/LazyComponents';
import OfflineBanner from '@/components/OfflineBanner';
import WebVitals from '@/components/WebVitals';
import BrowserCompatProvider from '@/components/BrowserCompatProvider';
import "./globals.css";
import "../styles/browser-compat.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Hooked - Connect at Events",
  description: "Connect with people at events through Hooked's mobile platform",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Hooked',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Hooked',
    'application-name': 'Hooked',
    'msapplication-TileColor': '#9333ea',
    'msapplication-config': '/browserconfig.xml',
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
  themeColor: '#9333ea',
  category: 'social',
  keywords: ['events', 'social', 'networking', 'mobile', 'connections'],
  authors: [{ name: 'Hooked Team' }],
  creator: 'Hooked',
  publisher: 'Hooked',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#9333ea',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
      </head>
      <body className={`${inter.variable} font-sans antialiased h-screen-mobile bg-gray-50 overflow-x-hidden`}>
        <div id="mobile-app-root" className="h-full">
          <BrowserCompatProvider>
            <WebVitals debug={process.env.NODE_ENV === 'development'} />
            <OfflineBanner />
            <ToastProvider>
              <SessionProvider>
                <NotificationProvider>
                  <MobileLayout>
                    {children}
                  </MobileLayout>
                  <PWAInstallPromptWithSuspense />
                </NotificationProvider>
              </SessionProvider>
            </ToastProvider>
          </BrowserCompatProvider>
        </div>
      </body>
    </html>
  );
}
