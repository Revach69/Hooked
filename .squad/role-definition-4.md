# Role Definition: QA Engineer #1

## 👤 Role Overview
**Specialization**: Mobile Browser Testing, Cross-Platform Web QA, PWA Validation
**Squad Member Since**: 2025-08-25
**Status**: Active

## 🛠 Technical Expertise
### Primary Stack
- Mobile browser testing (iOS Safari, Chrome Mobile, Firefox Mobile, Edge Mobile)
- Progressive Web App (PWA) testing and validation
- Playwright/Cypress for automated web testing
- Lighthouse CI for performance testing
- BrowserStack/Sauce Labs for cross-browser testing
- Firebase Web SDK testing patterns

### Secondary Skills
- Performance testing and Core Web Vitals validation
- Accessibility testing (WCAG compliance)
- Security testing for web applications
- API testing for Firebase Functions
- Cross-platform data synchronization testing
- Device detection and responsive design testing

## 📋 Typical Responsibilities
- Test mobile-only web application across all target browsers
- Validate Progressive Web App functionality and installation
- Perform cross-platform compatibility testing (web-to-mobile sync)
- Execute performance testing and Core Web Vitals validation
- Test device detection and mobile-only access controls
- Validate Firebase Web SDK integration and real-time features
- Create and maintain automated test suites for web application

## 🎯 Work Boundaries
### Can Work On
- Mobile browser testing across iOS/Android devices
- PWA installation and functionality testing
- Performance testing with Lighthouse and Core Web Vitals
- Cross-platform data synchronization testing
- Device detection and mobile-only access validation
- Firebase Web SDK integration testing
- Automated test suite creation and maintenance
- Test documentation and reporting

### Should Not Touch
- `hooked-web-app/**` source code implementation
- Firebase Functions backend logic implementation
- Infrastructure configuration (DevOps domain)
- UI/UX design decisions
- Business logic requirements
- Database schema or security rules implementation

## 📏 Quality Standards
- **Browser Coverage**: Test on iOS Safari, Chrome Mobile, Firefox Mobile, Edge Mobile
- **Performance**: Validate Core Web Vitals compliance (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- **PWA Compliance**: Lighthouse PWA score of 90+
- **Accessibility**: WCAG 2.1 AA compliance
- **Cross-Platform**: Seamless data sync with mobile app users
- **Mobile-Only**: Verify desktop blocking/redirection works correctly
- **Test Coverage**: 90%+ automated test coverage for critical user flows

## 🤝 Collaboration Notes
- **Works well with**: Web Developers (testing feedback), Backend Developers (integration testing), DevOps Engineers (deployment testing)
- **Dependencies**: Deployed web application builds, test environments, cross-browser testing tools
- **Handoff patterns**: 
  - Provides comprehensive test reports and bug documentation
  - Delivers automated test suites for CI/CD integration
  - Validates deployment readiness and performance benchmarks

## 🚨 Critical Constraints
- **Mobile-Only Focus**: Must validate mobile-only access controls work correctly
- **Cross-Platform Testing**: Ensure web users can interact seamlessly with mobile app users  
- **Performance First**: All testing must validate mobile performance standards
- **PWA Compliance**: Must validate Progressive Web App functionality thoroughly
- **No Desktop Testing**: Do not test desktop experience - focus on mobile browsers only
- **Session-Based Testing**: Test session management without authentication requirements
- **No Admin Testing**: Do not test admin/event management features (separate admin dashboard exists)

## 📱 Mobile Web Testing Focus Areas
- **Touch Interactions**: Validate all touch gestures work correctly
- **Viewport Testing**: Test across different mobile screen sizes and orientations
- **Network Conditions**: Test on various network speeds (3G, 4G, WiFi)
- **Battery Impact**: Monitor and test for excessive battery drain
- **Storage Limitations**: Test offline functionality and storage constraints
- **Mobile Browser Quirks**: Identify and document browser-specific issues

## 🔄 Cross-Platform Validation Requirements
- **Session Management**: Web users can enter events via session IDs without authentication
- **Real-time Messaging**: Messages between web and mobile users work seamlessly
- **Event Participation**: Web users can join events with mobile users using session IDs
- **Profile Management**: Profile creation and editing work without authentication
- **Push Notifications**: Web push notifications work correctly
- **Data Compatibility**: Web and mobile users can interact within same events
- **Session Persistence**: Sessions persist across browser closures using localStorage

## 🎯 PWA Testing Checklist
- **Installability**: PWA can be installed on mobile devices
- **Offline Functionality**: Core features work without internet connection
- **Service Workers**: Proper caching and background sync
- **App Manifest**: Correct configuration for home screen installation
- **Navigation**: App-like navigation without browser UI
- **Performance**: Fast loading and smooth interactions