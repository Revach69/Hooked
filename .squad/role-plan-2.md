## Feature: Mapbox Integration for Hooked Business Discovery
## Role Assignment: Mobile Developer #2 - Expo Specialist

### 🎯 Feature Context
Configure and manage Expo-specific aspects of the Mapbox integration, ensuring proper build configurations, asset management, and deployment settings for the new map feature in the Hooked mobile app.

### 📋 Assigned Tasks

- [ ] Task 1: Expo Navigation Configuration
  - Acceptance: Expo Router properly configured for new map screen navigation
  - Dependencies: Coordinate with Mobile Dev #1 on navigation structure
  
- [ ] Task 2: Mapbox Expo Plugin Configuration
  - Acceptance: Mapbox Expo plugin configured in app.json/eas.json for both platforms
  - Dependencies: Mapbox access tokens from project owner
  
- [ ] Task 3: Location Permission Configuration
  - Acceptance: Location permission strings properly set in app.json for both platforms
  - Dependencies: None
  
- [ ] Task 4: Map Assets Optimization
  - Acceptance: Map icon and related assets optimized and properly bundled
  - Dependencies: Design assets for map icon
  
- [ ] Task 5: Development Build Configuration
  - Acceptance: Development builds working with Mapbox SDK on both platforms
  - Dependencies: Mapbox SDK integration from Mobile Dev #1
  
- [ ] Task 6: EAS Build Profile Updates
  - Acceptance: EAS build profiles updated to include Mapbox dependencies
  - Dependencies: None
  
- [ ] Task 7: OTA Update Strategy
  - Acceptance: OTA update configuration that handles map feature rollout
  - Dependencies: Feature flag implementation

### 🔧 Technical Requirements
- Use existing patterns from: app.json, eas.json, expo.config.js
- Key integration points: Expo Router, EAS Build system
- Performance considerations: Bundle size optimization, asset loading
- Ensure compatibility with Expo SDK 53

### ⏱️ Priority Order
1. Expo navigation configuration (enables feature access)
2. Mapbox Expo plugin setup (required for SDK)
3. Location permission configuration (UX requirement)
4. Development build configuration (enables testing)
5. Map assets optimization (visual polish)
6. EAS build profiles (deployment readiness)
7. OTA update strategy (rollout management)

### 📝 Communication Protocol
- Update role-comm-2.md after each task
- Flag blockers immediately
- Note any scope clarifications needed
- Coordinate with Mobile Dev #1 on native module requirements