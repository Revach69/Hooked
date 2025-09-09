import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  serverExternalPackages: ['firebase'],
  outputFileTracingRoot: __dirname,
  
  // Redirects configuration
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/login',
        permanent: false,
      },
    ];
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://firebasestorage.googleapis.com https://*.firebasestorage.app https://*.cloudfunctions.net https://us-central1-hooked-69.cloudfunctions.net https://australia-southeast2-hooked-69.cloudfunctions.net https://europe-west3-hooked-69.cloudfunctions.net https://asia-northeast1-hooked-69.cloudfunctions.net https://southamerica-east1-hooked-69.cloudfunctions.net https://me-west1-hooked-69.cloudfunctions.net https://us-central1-hooked-development.cloudfunctions.net https://australia-southeast2-hooked-development.cloudfunctions.net https://europe-west3-hooked-development.cloudfunctions.net https://asia-northeast1-hooked-development.cloudfunctions.net https://southamerica-east1-hooked-development.cloudfunctions.net https://me-west1-hooked-development.cloudfunctions.net; frame-src 'self' https://www.google.com https://hooked-69.firebaseapp.com https://hooked-development.firebaseapp.com; object-src 'none'; base-uri 'self'; form-action 'self';"
          }
        ]
      }
    ];
  },
  
  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Disable source maps in production for security
  productionBrowserSourceMaps: false,
  
  // Note: appDir is enabled by default in Next.js 13+
  // Server components are also enabled by default
  
  // Image optimization settings
  images: {
    domains: ['firebasestorage.googleapis.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Webpack configuration for security
  webpack: (config, { dev, isServer }) => {
    // Add security headers in development
    if (dev) {
      config.devServer = {
        ...config.devServer,
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
        }
      };
    }
    // Add alias for @ to src
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@'] = require('path').resolve(__dirname, 'src');
    return config;
  },
};

export default nextConfig;
