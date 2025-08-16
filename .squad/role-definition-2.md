# Role Definition: Frontend Developer #2 - Web Development (hooked-website)

## 🛠 Tech Stack
- Next.js 14.x with TypeScript 5.x
- Tailwind CSS for styling
- Framer Motion for animations
- React Hook Form for form handling
- Vercel for deployment
- Headless CMS integration (if applicable)

## 📋 Scope & Boundaries
- **Can modify**: 
  - `hooked-website/src/` (all website components and pages)
  - `hooked-website/components/` (web UI components)
  - `hooked-website/app/` (Next.js app router pages)
  - `hooked-website/styles/` (styling and theme files)
  - `hooked-website/lib/` (web-specific utilities)
  - `hooked-website/public/` (static assets)
  - `hooked-website/next.config.ts` (Next.js configuration)
  - Web-specific test files

- **Cannot touch**: 
  - Mobile app code
  - Firebase Functions code
  - Admin dashboard code (web-admin-hooked)
  - Database schema
  - Other agents' work directories

- **Dependencies**: 
  - Can use: Next.js ecosystem, web libraries, CSS frameworks
  - Must avoid: React Native libraries, server-side Firebase Functions

## 📏 Conventions & Best Practices
- **Code Style**:
  - Next.js App Router conventions
  - Tailwind CSS utility classes
  - Mobile-first responsive design
  - Semantic HTML elements
  - Server and client component separation
  
- **Architecture Patterns**:
  - Page-based routing structure
  - Component composition patterns
  - SEO optimization practices
  - Performance-first development
  - Static generation where possible
  
- **Documentation**:
  - Component library documentation
  - SEO implementation guide
  - Performance optimization notes
  - Deployment configuration

## ✅ Task Checklist
- [ ] Website Pages: Build marketing and landing pages
  - Acceptance: Pages are SEO-optimized and responsive
  - Priority: High
  
- [ ] Component Library: Create reusable web components
  - Acceptance: Components follow design system and accessibility standards
  - Priority: High
  
- [ ] Performance Optimization: Implement Next.js best practices
  - Acceptance: Lighthouse scores >90 for all metrics
  - Priority: Medium

- [ ] SEO & Analytics: Implement tracking and optimization
  - Acceptance: Proper meta tags, structured data, and analytics
  - Priority: Medium

## 🧪 Testing Requirements
- [ ] Component unit tests
  - Coverage target: 80%
  - Framework: Jest + React Testing Library
  
- [ ] E2E tests for critical user flows
  - Scenarios to cover: Navigation, form submissions, CTA interactions
  - Framework: Playwright or Cypress
  
- [ ] Performance and SEO testing
  - Format: Lighthouse CI integration
  
- [ ] Accessibility compliance testing
  - Format: Automated axe testing and manual audits

## ⚠️ Risk Mitigation
- **Known Challenges**:
  - SEO optimization: Proper meta tags and structured data
  - Performance on slower connections: Image optimization and lazy loading
  
- **Edge Cases to Handle**:
  - JavaScript disabled scenarios
  - Slow network connections
  - Different browsers and versions
  - Various screen sizes and devices
  
- **Performance Considerations**:
  - Bundle size optimization
  - Image optimization and WebP support
  - Core Web Vitals monitoring
  - CDN and caching strategies

## 🔗 Related Resources
- Feature PRD: `.squad/features/feature-name.md`
- Example code: `.squad/examples/web-boilerplate/`
- Next.js docs: https://nextjs.org/docs
- Tailwind CSS docs: https://tailwindcss.com
- Vercel deployment docs: https://vercel.com/docs

## 📝 Notes for Agent
Focus on building a high-performance, SEO-optimized website that converts visitors effectively. Prioritize Core Web Vitals, accessibility, and mobile-first design. Ensure all pages load quickly and provide excellent user experience across all devices.