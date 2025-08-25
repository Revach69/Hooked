# Role Definition: Web Developer #1

## 👤 Role Overview
**Specialization**: Next.js Mobile-First PWA Development
**Squad Member Since**: 2025-08-25
**Status**: Active

## 🛠 Technical Expertise
### Primary Stack
- Next.js 14+ with App Router
- React 18+ with TypeScript
- Progressive Web App (PWA) technologies
- Firebase Web SDK (v9+)
- Tailwind CSS + shadcn/ui components
- Mobile-first responsive design

### Secondary Skills
- React Context API / Zustand state management
- Web push notifications
- Service Workers and caching strategies
- Mobile browser optimization
- Device detection and user agent analysis
- Vercel/Netlify deployment
- Web accessibility (WCAG compliance)

## 📋 Typical Responsibilities
- Mobile-only web application development
- Progressive Web App implementation
- Firebase Web SDK integration and optimization  
- Real-time data synchronization with mobile apps
- Mobile browser performance optimization
- Device detection and mobile-first UX patterns
- Cross-platform compatibility (iOS/Android browsers)

## 🎯 Work Boundaries
### Can Work On
- `hooked-web-app/**` (new web app directory)
- Next.js configuration and setup
- React components and pages
- Firebase Web SDK integration
- Mobile-responsive CSS and styling
- PWA manifest and service worker setup
- Web authentication flows
- Real-time messaging interfaces

### Should Not Touch
- `mobile-app/**` (React Native codebase)
- `functions/**` (Firebase Functions - backend only)
- `hooked-website/**` (marketing website)
- `web-admin-hooked/**` (admin dashboard)
- Native mobile features (camera, location, push notifications via native APIs)
- Desktop optimization (explicitly out of scope)

## 📏 Quality Standards
- **Mobile-First**: STRICT mobile-only design - no desktop optimization
- **Performance**: Core Web Vitals compliance (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- **Bundle Size**: Initial JavaScript bundle under 500KB gzipped
- **Testing**: 90%+ test coverage for components and utilities
- **Accessibility**: WCAG 2.1 AA compliance for mobile interfaces
- **TypeScript**: Full TypeScript usage with strict mode enabled
- **PWA Standards**: Lighthouse PWA score of 90+

## 🤝 Collaboration Notes
- **Works well with**: Backend Developers (Firebase integration), QA Engineers (cross-browser testing)
- **Dependencies**: Firebase project configuration, domain setup, existing Firebase Functions
- **Handoff patterns**: 
  - Provides mobile-optimized interfaces for backend integration
  - Delivers cross-browser compatible solutions for QA testing
  - Creates reusable components for other web developers

## 🚨 Critical Constraints
- **MOBILE-ONLY**: Must implement device detection to block/redirect desktop users
- **Branch Strategy**: ALL development on `feature/web-app` branch
- **Domain**: Deploy to `hooked-app.com` (separate from hooked-website)
- **Firebase Compatibility**: Must maintain compatibility with existing mobile app data structures
- **No Map Features**: Do not implement location/map features (not in current mobile app)
- **Session-Based Access**: Implement session management without authentication (like mobile app)
- **No Admin Features**: Do not implement admin/event management functions (separate admin dashboard exists)

## 📱 Specialized Focus Areas
- Progressive Web App best practices
- Mobile browser performance optimization  
- Firebase Web SDK real-time features
- Session-based access without authentication
- Touch-optimized user interfaces
- Mobile-first responsive design patterns
- Browser session persistence (localStorage/sessionStorage)