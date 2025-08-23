import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import GoogleAnalytics from "../components/GoogleAnalytics";
import SocialLinks from "../components/SocialLinks";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hooked - Meet Singles IRL at Events | Real-Life Dating App",
  description: "Connect with singles at events in real life. Scan QR codes at parties, weddings, conferences & more. No swiping, just real connections.",
  keywords: "dating app, singles events, real life dating, event networking, QR code dating, party dating, conference dating, wedding dating",
  authors: [{ name: "Hooked" }],
  creator: "Hooked",
  publisher: "Hooked",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://hooked-app.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Hooked - Meet Singles IRL at Events",
    description: "Connect with singles at events in real life. Scan QR codes at parties, weddings, conferences & more.",
    url: 'https://hooked-app.com',
    siteName: 'Hooked',
    images: [
      {
        url: '/Hooked Full Logo.png',
        width: 1200,
        height: 630,
        alt: 'Hooked - Real-life dating app for events',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Hooked - Meet Singles IRL at Events",
    description: "Connect with singles at events in real life. Scan QR codes at parties, weddings, conferences & more.",
    images: ['/Hooked Full Logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preload critical images for faster loading */}
        <link 
          rel="preload" 
          href="/Hooked Full Logo.png" 
          as="image" 
          type="image/png"
        />
        <link 
          rel="preload" 
          href="/Site Image.png" 
          as="image" 
          type="image/png"
          media="(max-width: 767px)"
        />
        <link 
          rel="preload" 
          href="/about - hero.JPG" 
          as="image" 
          type="image/jpeg"
          media="(max-width: 767px)"
        />
        
        {/* Structured Data for Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Hooked",
              "url": "https://hooked-app.com",
              "logo": "https://hooked-app.com/Hooked Full Logo.png",
              "description": "Real-life dating app for events",
              "sameAs": [
                "https://instagram.com/joinhooked",
                "https://www.linkedin.com/company/the-hooked-app"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "email": "contact@hooked-app.com",
                "contactType": "customer service"
              }
            })
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col dark-mode-bg`}
      >
        {/* Google Analytics */}
        <GoogleAnalytics />
        
        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="dark-mode-card border-t dark-mode-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
              {/* Quick links - Centered on mobile, left on desktop */}
              <div className="flex flex-wrap justify-center md:justify-start gap-6 md:gap-8 w-full md:w-auto">
                <Link href="/contact" className="dark-mode-text hover:text-purple-600 dark:hover:text-purple-400 underline transition-colors">
                  Contact
                </Link>
                <Link href="/faq" className="dark-mode-text hover:text-purple-600 dark:hover:text-purple-400 underline transition-colors">
                  FAQ
                </Link>
                <Link href="/privacy" className="dark-mode-text hover:text-purple-600 dark:hover:text-purple-400 underline transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="dark-mode-text hover:text-purple-600 dark:hover:text-purple-400 underline transition-colors">
                  Terms and Conditions
                </Link>
              </div>
              
              {/* Copyright - Center */}
              <div className="text-center order-3 md:order-2">
                <p className="text-gray-600 dark:text-gray-400">
                  © 2025 Hooked. All rights reserved.
                </p>
              </div>
              
              {/* Social icons - Right */}
              <SocialLinks />
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
