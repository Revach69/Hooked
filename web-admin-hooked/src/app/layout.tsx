import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import ClientOnly from "@/components/ClientOnly";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Hooked Admin Dashboard",
  description: "Admin dashboard for Hooked event management and analytics",
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
      >
        <ClientOnly fallback={<div>Loading...</div>}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ClientOnly>
      </body>
    </html>
  );
}
