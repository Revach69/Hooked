import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

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
              <div className="flex space-x-4 order-2 md:order-3">
                <a href="https://instagram.com/joinhooked" target="_blank" rel="noopener noreferrer" className="dark-mode-text hover:text-purple-600 dark:hover:text-purple-400 transition-colors" aria-label="Follow Hooked on Instagram">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="https://www.linkedin.com/company/the-hooked-app/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="dark-mode-text hover:text-purple-600 dark:hover:text-purple-400 transition-colors" aria-label="Connect with Hooked on LinkedIn">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
