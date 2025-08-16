# Role Definition: Frontend Developer #1 - React Native Mobile App

## 🛠 Tech Stack
- React Native 0.73.x with TypeScript 5.x
- Expo SDK for development tooling
- React Native Paper for UI components
- React Query for state management
- Jest + React Native Testing Library for testing
- ESLint + Prettier for code quality
- Firebase SDK for React Native

## 📋 Scope & Boundaries
- **Can modify**: 
  - `mobile-app/app/` (all screen components and navigation)
  - `mobile-app/components/` (mobile UI components)
  - `mobile-app/hooks/` (custom React hooks)
  - `mobile-app/lib/` (mobile-specific utilities and services)
  - `mobile-app/types/` (TypeScript type definitions)
  - `mobile-app/assets/` (images, fonts, sounds)
  - `mobile-app/__tests__/` (component and screen tests)
  - `mobile-app/ios/` and `mobile-app/android/` (native configuration)

- **Cannot touch**: 
  - Firebase Functions code
  - Web applications (hooked-website, web-admin-hooked)
  - Database schema
  - Other agents' work directories
  - Root package.json configurations

- **Dependencies**: 
  - Can use: React Native ecosystem, native modules, mobile libraries
  - Must avoid: Web-specific libraries, server frameworks, Firebase Functions dependencies

## 📏 Conventions & Best Practices
- **Code Style**:
  - Functional components with hooks only
  - TypeScript strict mode compliance
  - Named exports for components
  - Consistent file naming (PascalCase for components)
  - Platform-specific code handling (iOS/Android)
  
- **Architecture Patterns**:
  - Screen-based navigation structure
  - Custom hooks for device-specific logic
  - Props interface definitions for all components
  - Context providers for global state
  - Native module integration patterns
  
- **Documentation**:
  - JSDoc comments for complex component props
  - Platform-specific implementation notes
  - Navigation structure documentation
  - Native module usage guides

## ✅ Task Checklist
- [ ] Screen Development: Create mobile app screens and navigation
  - Acceptance: Screens render correctly on iOS and Android
  - Priority: High
  
- [ ] Component Library: Build reusable mobile UI components
  - Acceptance: Components work across platforms with proper styling
  - Priority: High
  
- [ ] Native Integration: Implement platform-specific features
  - Acceptance: Native modules work correctly on both platforms
  - Priority: Medium

- [ ] State Management: Implement mobile-optimized state with React Query
  - Acceptance: Offline support and proper error handling
  - Priority: Medium

## 🧪 Testing Requirements
- [ ] Unit tests for all components and screens
  - Coverage target: 85%
  - Framework: Jest + React Native Testing Library
  
- [ ] Integration tests for navigation flows
  - Scenarios to cover: navigation, push notifications, offline behavior
  
- [ ] Platform-specific testing
  - Format: iOS Simulator and Android Emulator testing
  
- [ ] E2E testing with Detox (if available)
  - Scenarios to cover: Complete user journeys on both platforms

## ⚠️ Risk Mitigation
- **Known Challenges**:
  - Platform differences: Handle iOS/Android UI variations
  - Performance on older devices: Optimize animations and list rendering
  
- **Edge Cases to Handle**:
  - Network connectivity changes
  - App state transitions (background/foreground)
  - Permission handling (camera, notifications, location)
  - Different screen sizes and orientations
  
- **Performance Considerations**:
  - Bundle size optimization for mobile
  - Memory usage monitoring
  - Battery life impact
  - Native module performance

## 🔗 Related Resources
- Feature PRD: `.squad/features/feature-name.md`
- Example code: `.squad/examples/mobile-boilerplate/`
- React Native docs: https://reactnative.dev
- Expo docs: https://docs.expo.dev
- Firebase React Native docs: https://rnfirebase.io

## 📝 Notes for Agent
Focus on creating a native-feeling mobile experience that works seamlessly on both iOS and Android. Prioritize performance, offline capabilities, and platform-specific UI patterns. Always test on both platforms before considering features complete.