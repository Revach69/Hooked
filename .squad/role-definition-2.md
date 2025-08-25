# Role Definition: Backend Developer #1

## 👤 Role Overview
**Specialization**: Firebase Web SDK & Cross-Platform Backend Integration
**Squad Member Since**: 2025-08-25
**Status**: Active

## 🛠 Technical Expertise
### Primary Stack
- Firebase Web SDK v9+ (modular SDK)
- Firebase Functions (Node.js/TypeScript)
- Firestore database optimization for web clients
- Firebase Authentication web flows
- Firebase Security Rules for web applications
- Real-time data synchronization patterns

### Secondary Skills
- Web push notification infrastructure
- Firebase Hosting and deployment
- Cross-platform data consistency patterns
- Performance monitoring for web applications
- Firebase Extensions and third-party integrations
- API design for web client optimization

## 📋 Typical Responsibilities
- Optimize existing Firebase Functions for web client compatibility
- Ensure cross-platform data synchronization between web and mobile apps
- Implement web-specific Firebase Security Rules
- Set up web push notification infrastructure
- Optimize Firestore queries for web performance
- Maintain data consistency across platforms
- Create web-specific API endpoints when needed

## 🎯 Work Boundaries
### Can Work On
- `functions/**` - Firebase Functions modifications for web compatibility
- Firebase Security Rules (firestore.rules)
- Firebase configuration for web clients
- Cross-platform data synchronization logic
- Web push notification setup
- Firestore indexing for web query optimization
- Firebase Extensions configuration

### Should Not Touch
- `hooked-web-app/**` - Frontend web application (Web Developer #1's domain)
- `mobile-app/**` - React Native mobile application
- `hooked-website/**` - Marketing website
- `web-admin-hooked/**` - Admin dashboard
- Domain setup and web hosting (DevOps Engineer's domain)
- Frontend authentication flows (handled by Web Developer #1)

## 📏 Quality Standards
- **Cross-Platform Compatibility**: All changes must maintain compatibility with existing mobile app
- **Performance**: Optimize for web client bundle size and query efficiency  
- **Security**: Implement proper security rules for web client access
- **Documentation**: Document all web-specific Firebase configurations
- **Testing**: Unit tests for all Firebase Functions modifications
- **Data Consistency**: Ensure seamless data sync between web and mobile platforms

## 🤝 Collaboration Notes
- **Works well with**: Web Developers (Firebase SDK integration), QA Engineers (backend testing)
- **Dependencies**: Existing Firebase project structure, current mobile app data models
- **Handoff patterns**: 
  - Provides optimized Firebase configurations for web integration
  - Delivers documented APIs for web developer implementation
  - Ensures backend changes don't break mobile app functionality

## 🚨 Critical Constraints
- **No Breaking Changes**: Must maintain backward compatibility with existing mobile app
- **Web-First Optimization**: Focus on web client performance and bundle size
- **Data Model Consistency**: Use existing data structures - no schema changes
- **Security Parity**: Web clients must have same session-based security as mobile clients
- **Real-time Features**: Maintain real-time functionality across platforms
- **No Authentication Required**: Support session-based access like mobile app

## 📱 Web-Specific Focus Areas
- Firebase Web SDK v9+ modular architecture
- Firestore offline persistence for web
- Web push notification implementation
- Cross-platform authentication flows
- Web client security rule optimization
- Bundle size optimization for web clients

## 🔄 Cross-Platform Considerations
- **Data Compatibility**: Ensure web and mobile users can interact within same events
- **Session Management**: Web users access events via session IDs without authentication (like mobile)
- **Real-time Updates**: Maintain real-time messaging and notifications across platforms
- **Security Rules**: Web clients need appropriate session-based permissions
- **Performance**: Optimize for web while maintaining mobile performance
- **Single-Platform Access**: Users access either iOS OR web, not simultaneously