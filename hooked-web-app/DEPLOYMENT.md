# Hooked Web App Deployment Guide

## 📋 Overview
Production-ready deployment setup for the Hooked mobile-only web application using Vercel with comprehensive CI/CD, performance monitoring, and mobile-first infrastructure.

## 🏗️ Infrastructure Architecture

### Domain & Hosting
- **Primary Domain**: `hooked-app.com` (production)
- **Staging**: Branch-based deployments via Vercel previews
- **Platform**: Vercel with global CDN (IAD1, FRA1, HKG1)
- **SSL/TLS**: Full HTTPS with HSTS and security headers

### Mobile-Only Access Control
- **Server-side**: Next.js middleware with enhanced device detection
- **CDN-level**: Vercel rewrites and redirects for desktop blocking
- **Fallback**: `/mobile-only-access` page for desktop users

## 🚀 Deployment Process

### Automatic Deployments
```bash
# Production (main branch)
git push origin main  # → Auto-deploy to hooked-app.com

# Staging (feature/web-app branch)  
git push origin feature/web-app  # → Auto-deploy to preview URL

# Pull Requests (to develop/main)
# → Auto-deploy preview + performance tests
```

### Manual Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to staging
vercel --prod=false

# Deploy to production
vercel --prod
```

## ⚙️ Environment Configuration

### Required Secrets (GitHub/Vercel)
```bash
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID_WEB_APP=your_project_id

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

### Environment Files
- `.env.example` - Template with all required variables
- `.env.local` - Local development (not committed)
- Vercel Dashboard - Production environment variables

## 📊 Performance Monitoring

### Core Web Vitals Targets
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms  
- **CLS (Cumulative Layout Shift)**: < 0.1
- **Speed Index**: < 3.0s
- **Time to Interactive**: < 3.5s

### Monitoring Tools
- **Lighthouse CI**: Automated performance testing in CI/CD
- **Vercel Analytics**: Real-time performance metrics
- **Firebase Performance**: Client-side monitoring
- **Error Tracking**: Console errors and crash reporting

## 🔒 Security Configuration

### Security Headers (Implemented)
- `Strict-Transport-Security` with HSTS preloading
- `Content-Security-Policy` with Firebase allowlist
- `X-Frame-Options: DENY` for clickjacking protection
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Mobile-Specific Security
- Enhanced device detection middleware
- Desktop user blocking at infrastructure level
- Mobile-optimized CSP policies
- Progressive Web App security considerations

## 📱 Mobile-First Features

### Device Detection Strategy
1. **Next.js Middleware**: Primary mobile device detection
2. **Vercel Rewrites**: CDN-level routing based on User-Agent
3. **Client-side**: Additional UA parsing for edge cases
4. **Fallback**: Manual mobile-only access page

### Progressive Web App (PWA)
- Service worker for offline functionality
- Mobile app-like experience
- Install prompts and shortcuts
- Background sync capabilities

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
Trigger: Push to main, develop, feature/web-app
Steps:
1. Lint & Type Check
2. Build Verification  
3. Playwright Tests (Mobile-focused)
4. Deploy (Staging/Production)
5. Lighthouse Performance Tests
6. Comment PR with Preview Links
```

### Branch Strategy
- `main` → Production deployment (hooked-app.com)
- `feature/web-app` → Staging deployment (preview URL)
- `develop` → Integration testing (preview URL)
- Pull Requests → Automated testing + preview deployment

## 📈 Performance Optimization

### Build Configuration
- **Next.js 15** with Turbopack for faster builds
- **Bundle Analysis** for size optimization
- **Image Optimization** with Next.js Image component
- **Code Splitting** for route-based chunks

### CDN & Caching
- **Global CDN** with mobile-optimized edge locations
- **Static Assets**: 1 year cache for immutable files
- **HTML Pages**: Revalidation strategy with stale-while-revalidate
- **API Routes**: 30-second max duration with appropriate caching

## 🚨 Monitoring & Alerting

### Uptime Monitoring
- **Target**: 99.9% uptime
- **Monitoring**: Vercel built-in uptime tracking
- **Alerts**: Email notifications for downtime
- **Status Page**: Integrated with Vercel status

### Error Tracking
- Client-side error boundaries
- Firebase Crashlytics integration
- Console error capture and reporting
- Performance regression alerts

## 🛠️ Development Commands

```bash
# Local development
npm run dev              # Start development server
npm run build           # Production build
npm run start           # Production server locally
npm run lint            # ESLint checking

# Testing
npm run test            # Playwright tests
npm run test:mobile     # Mobile-focused tests
npm run test:performance # Performance tests

# Deployment
vercel                  # Deploy to preview
vercel --prod          # Deploy to production
```

## 📝 Maintenance

### Regular Tasks
- Monitor Core Web Vitals weekly
- Review security headers monthly
- Update dependencies quarterly
- Performance audit after major releases

### Rollback Strategy
```bash
# Quick rollback via Vercel CLI
vercel rollback [deployment-url]

# Or via Vercel Dashboard
# 1. Go to project deployments
# 2. Select previous stable deployment
# 3. Click "Promote to Production"
```

## 🔗 Related Documentation
- [Vercel Deployment Docs](https://vercel.com/docs/deployments)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)

---

**Last Updated**: August 25, 2025  
**Next Review**: September 25, 2025