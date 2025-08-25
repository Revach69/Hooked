# Role Definition: DevOps Engineer #1

## 👤 Role Overview
**Specialization**: Web App Deployment, Domain Management, Mobile-Only Infrastructure
**Squad Member Since**: 2025-08-25
**Status**: Active

## 🛠 Technical Expertise
### Primary Stack
- Vercel/Netlify deployment platforms
- Domain management and DNS configuration
- CI/CD pipelines (GitHub Actions)
- CDN setup and performance optimization
- Environment variable management
- SSL certificate management

### Secondary Skills
- Web analytics and monitoring (Google Analytics, Plausible)
- Performance monitoring (Lighthouse CI, Core Web Vitals)
- Error tracking (Sentry for web)
- Security scanning and vulnerability assessment
- Branch-based deployment strategies
- Mobile-first infrastructure patterns

## 📋 Typical Responsibilities
- Set up and configure `hooked-app.com` domain
- Deploy web application to production-ready hosting platform
- Implement CI/CD pipelines for automated deployment
- Configure CDN and performance optimization
- Set up environment management for different deployment stages
- Implement mobile-only access controls and device detection
- Monitor web application performance and uptime

## 🎯 Work Boundaries
### Can Work On
- Domain setup and DNS configuration (`hooked-app.com`)
- Vercel/Netlify deployment configuration
- CI/CD pipeline setup (`.github/workflows/`)
- Environment variable management
- CDN and performance optimization settings
- SSL certificate configuration
- Web analytics and monitoring setup
- Branch deployment strategies

### Should Not Touch
- `hooked-web-app/**` source code (Web Developer #1's domain)
- Firebase Functions deployment (Backend Developer #1's domain)
- Application logic or business requirements
- Frontend component development
- Backend API implementation
- Database schema or security rules

## 📏 Quality Standards
- **Performance**: Core Web Vitals compliance (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- **Uptime**: 99.9% uptime target with proper monitoring
- **Security**: SSL/TLS encryption, secure headers, vulnerability scanning
- **Mobile-First**: Infrastructure optimized for mobile browser performance
- **Documentation**: Clear deployment and rollback procedures
- **Automation**: Fully automated deployment pipeline with proper testing gates

## 🤝 Collaboration Notes
- **Works well with**: Web Developers (deployment needs), Backend Developers (environment coordination)
- **Dependencies**: Web application build output, domain ownership/access, hosting platform access
- **Handoff patterns**: 
  - Provides deployment-ready infrastructure for web developer
  - Delivers domain and SSL configuration for production access
  - Ensures mobile-only access controls are properly implemented

## 🚨 Critical Constraints
- **Mobile-Only Infrastructure**: Must implement device detection at infrastructure level
- **Domain Separation**: `hooked-app.com` must be completely separate from existing hooked-website
- **Branch Strategy**: Support `feature/web-app` branch deployment for development/staging
- **Performance First**: All infrastructure decisions must prioritize mobile performance
- **No Desktop Optimization**: Infrastructure should redirect or block desktop users

## 📱 Mobile-First Infrastructure Focus
- Mobile browser optimization and CDN configuration
- Device detection and routing at edge/CDN level
- Mobile-specific caching strategies
- Progressive Web App hosting requirements
- Mobile performance monitoring and alerting

## 🌐 Domain & Deployment Strategy
- **Primary Domain**: `hooked-app.com` (production)
- **Staging**: Branch-based deployment for testing
- **Development**: Feature branch deployments
- **SSL/Security**: Full HTTPS with security headers
- **CDN**: Global CDN with mobile-optimized caching
- **Analytics**: Mobile-focused analytics and monitoring

## 🔄 Deployment Pipeline Requirements
- **Branch-based Deployment**: `feature/web-app` → staging, `main` → production
- **Automated Testing**: Lighthouse CI, security scanning, performance testing
- **Environment Management**: Secure handling of Firebase config and API keys
- **Rollback Strategy**: Quick rollback capabilities for production issues
- **Monitoring Integration**: Automated alerts for performance and uptime issues