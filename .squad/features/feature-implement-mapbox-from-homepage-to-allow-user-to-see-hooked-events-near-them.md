# Feature: Mapbox Integration for Hooked Business Discovery

## 📋 Overview
Integrate Mapbox mapping technology into the Hooked mobile app to provide users with an interactive map view showing clubs, restaurants, and venues where Hooked is integrated. This feature enables location-based discovery of Hooked-integrated businesses, transforming the user experience from web-only browsing (currently on hooked-website IRL page) to mobile-first map exploration similar to popular business discovery apps.

## 🎯 Problem Statement
Currently, users have NO way to see Hooked events or integrated venues in the mobile app - this functionality only exists on the hooked-website IRL page. The future vision is for Hooked to be integrated in clubs and restaurants, and users need a mobile map interface to discover where Hooked is available. Without this core discovery mechanism, the mobile app lacks its primary value proposition of helping users find Hooked-integrated venues near them.

## 👤 User Stories

**Primary User Stories:**
- As a mobile user, I want to see a map showing nearby clubs and restaurants with Hooked integration so that I can discover where Hooked is available near me
- As a venue explorer, I want to pan and zoom the map to find Hooked-integrated businesses in different neighborhoods so that I can explore new areas
- As a business-conscious user, I want to tap on venue markers to see business details and Hooked integration status so that I can decide which venues to visit
- As a privacy-aware user, I want to control location permissions so that I can choose whether to share my location or browse venues manually

**Secondary User Stories:**
- As a frequent user, I want the map to show different types of venues (continuous clients vs one-time events) so that I can understand the Hooked integration level
- As a social user, I want to see venue operating hours and current Hooked activity so that I can plan my visits effectively  
- As a user with limited data, I want the map to load efficiently and cache venue data so that I can browse locations without excessive data usage

## ✅ Functional Requirements

### Must Have (MVP)
- [ ] **Homepage Navigation**: Add third button to mobile app homepage with map icon for map access (non-disruptive to existing flow)
- [ ] **Map Integration**: Implement Mapbox SDK integration in the mobile app with basic map rendering
- [ ] **Location Services**: Request and handle user location permissions with fallback to default city view
- [ ] **Venue Markers**: Display venue markers on the map with distinct styling for continuous clients vs one-time events
- [ ] **Marker Interaction**: Enable tap interactions on venue markers to show business details (name, address, hours, Hooked integration status)
- [ ] **Current Location**: Show user's current location on the map with appropriate privacy controls
- [ ] **Map Controls**: Implement zoom in/out, pan, and center-to-location functionality
- [ ] **Client Data Integration**: Connect map markers to client/venue data from Firebase backend
- [ ] **Admin Dashboard Integration**: Create admin interface for managing map clients (continuous subscription clients)
- [ ] **Client Type Differentiation**: Visually distinguish between "Map Clients" (continuous) and regular event clients by different pages in the dashboard (pages should be: Events/Clients/Forms/Map Clients. where Clients are one timers and Map Clients are continous and subscribed)
- [ ] **Loading States**: Display appropriate loading indicators while fetching location and venue data
- [ ] **Error Handling**: Handle location permission denied, network failures, and map loading errors gracefully
- [ ] **Performance Optimization**: Implement map clustering for areas with many venues to avoid overcrowding

### Nice to Have
- [ ] **Custom Map Styling**: Apply Hooked brand styling to the map appearance matching the reference app design
- [ ] **Venue Filtering**: Allow users to filter visible venues by type (bars, clubs, restaurants, parties), integration status
- [ ] **Search/Navigate**: Enable search for specific venues or addresses on the map
- [ ] **Venue Categories**: Allow using the venue's own logo for marking it on the map. for image fallback - Use different marker icons/colors for different venue types (bars, clubs, restaurants)
- [ ] **Offline Support**: Cache map tiles and basic venue data for offline browsing
- [ ] **Heat Map View**: Show venue density heat maps for popular areas with Hooked integration
- [ ] **List/Map Toggle**: Allow users to switch between map view and traditional list view
- [ ] **Driving Directions**: Integration with device navigation apps for getting directions to venues - not a must if its too complicated. if easy - have a navigation button that opens "Open in Maps/Google Maps/Waze"
- [ ] **Real-time Status**: Show if venues are currently active with Hooked (live events happening)
- [ ] **Advanced Admin Features**: Bulk venue management, analytics dashboard for map client performance

## 🔧 Technical Considerations

**Architecture Impacts:**
- Add Mapbox React Native SDK as a new dependency to the mobile app
- Create new location services integration layer for handling GPS and location permissions.
- Extend existing event data models to include proper geospatial indexing
- Implement map state management for zoom level, center point, and selected markers

**Performance Considerations:**
- Implement efficient event clustering to handle areas with high event density
- Use map viewport-based data fetching to only load events in visible area plus buffer
- Implement marker recycling and virtualization for smooth performance with many events
- Cache map tiles appropriately to reduce data usage and improve load times
- Debounce map movement events to avoid excessive API calls during panning

**Security Requirements:**
- Handle location permissions securely with clear privacy explanations in both platforms (info.plist and androidmanifest.xml etc)
- Validate and sanitize all location data before sending to backend
- Implement rate limiting on geospatial queries to prevent abuse
- Ensure event location data is properly validated and doesn't expose sensitive information

**Integration Points:**
- Firebase Functions: Create new venue/client APIs with geospatial queries for map display
- Admin Dashboard (web-admin-hooked): New "Map Clients" management interface for continuous subscription clients
- Mobile App State: Integrate map state with existing app navigation and state management  
- Client Management: Differentiate between "Map Clients" (continuous subscriptions) and "Clients" (one-time events)
- Push Notifications: Consider location-based notification triggers for nearby venue activities
- Analytics: Track map usage patterns, popular venues, and map client performance

## 📏 Scope Boundaries

### In Scope
- Mapbox map integration accessible via third button on mobile app homepage (separate from existing event flow)
- Map button UI implementation with map icon (third button alongside existing navigation)
- Venue markers display and interaction for Hooked-integrated businesses
- Admin dashboard "Map Clients" management interface (requires Next.js developer)
- User location services with privacy controls
- Integration with client/venue data from Firebase backend
- Client type differentiation (continuous vs one-time)
- Basic map controls (zoom, pan, center)
- Error handling and loading states
- Performance optimization for venue marker clustering

### Out of Scope
- Social features like sharing map views or user reviews
- Real-time collaborative map features or live user tracking
- Integration with external business listing APIs (Yelp, Google Places)
- In-app booking or reservation system
- Advanced geofencing or location-based automation
- Payment processing for venue subscriptions (handled separately)

## 🧪 Testing Criteria

**Unit Test Coverage Requirements:**
- Location services wrapper functions (permission handling, GPS access)
- Event data transformation for map marker display
- Map state management and event handlers
- Error handling for network failures and permission denials
- Geospatial query logic and data formatting

**Integration Test Scenarios:**
- End-to-end flow: App launch → Location permission → Map load → Event markers display
- Location permission variations: granted, denied, initially denied then granted
- Network conditions: offline, slow network, intermittent connectivity
- Map interaction flows: zoom, pan, marker tap, location center
- Backend integration: event data fetching and geospatial queries

**User Acceptance Criteria:**
- Map loads within 3 seconds on typical mobile connection
- Event markers appear correctly positioned relative to actual venue locations
- User can successfully grant location permission and see their position
- Tapping event markers displays relevant event information
- Map performance remains smooth with 50+ visible event markers
- App gracefully handles location permission denial with helpful messaging

## 📊 Success Metrics

**Primary Metrics:**
- **Map Engagement Rate**: % of users who interact with the map on homepage visits
- **Event Discovery via Map**: % of event views/joins that originated from map marker taps
- **Location Permission Grant Rate**: % of users who grant location access when prompted
- **Map Session Duration**: Average time users spend interacting with the map view

**Secondary Metrics:**
- **Map Performance**: Average map load time and frame rate during interactions
- **User Retention**: Impact on 7-day retention for users who engage with map feature
- **Event Geographic Distribution**: Analysis of whether map helps users discover events in new areas
- **Feature Adoption**: % of daily active users who use map view vs. traditional list view

## 🚀 Implementation Notes

**Squad Requirements:**
- ✅ **COMPLETED**: Web Developer #7 (Next.js/Admin Dashboard Specialist) has been added to the squad
- The admin "Map Clients" management interface is a must-have dependency for the mobile map functionality
- Squad now has all necessary roles: Mobile Developers (React Native + Expo), Backend Developer, Web Developer, QA Engineer, Data Engineer, DevOps Engineer

**Development Approach:**
- **CRITICAL**: All development must be done on a dedicated feature branch (`feature/mapbox-integration`) - NOT on main branch
- **Git Workflow**: Create feature branch from current main/develop state before starting work
- Start with admin dashboard client management interface (dependency for mobile app)
- Add third button to homepage with map icon (preserves existing user flow)
- Implement basic Mapbox integration and venue markers in parallel with admin work
- Use feature flags to gradually roll out map functionality to user segments
- Implement comprehensive error boundaries around map components to prevent app crashes
- Consider battery usage implications and optimize location services accordingly

**Parallel Work Management (Branch + PR Workflow):**
```bash
# Setup: Create and switch to feature branch
git checkout -b feature/mapbox-integration
# Squad works on this branch

# When you need to fix bugs:
git add . && git commit -m "WIP: mapbox progress"
git checkout main
git pull origin main
# Fix bug, commit, push
git checkout feature/mapbox-integration
# Continue feature work
```

**Managing Parallel Work:**
- **Commit Early & Often**: Save feature progress before switching to bug fixes
- **Clear Commit Messages**: Use "WIP:" for work-in-progress commits
- **Quick Context Switching**: Branch switching is fast, rebuilds are manageable
- **Simple Workflow**: Easier to understand and maintain than worktrees

**Keeping Feature Branch Current (CRITICAL):**
```bash
# After significant bug fixes to main, update feature branch:
git checkout feature/mapbox-integration
git fetch origin
git rebase origin/main  # This will show conflicts immediately

# Handle conflicts during rebase:
# 1. Git will pause and show conflicted files
# 2. Edit files to resolve conflicts (keep both changes when possible)
# 3. git add resolved-file.tsx
# 4. git rebase --continue
```

**Conflict Prevention Strategies:**
- **Regular Sync**: Rebase feature branch after important bug fixes
- **Small Commits**: Make frequent, focused commits for easier conflict resolution
- **File Coordination**: Avoid working on same files simultaneously when possible  
- **Modular Changes**: Keep feature changes in separate files/functions
- **Testing**: Run full test suite after each rebase to catch logic conflicts

**Complete Branch + PR Workflow:**
```bash
# 1. SETUP: Create feature branch
git checkout -b feature/mapbox-integration
git push -u origin feature/mapbox-integration

# 2. DAILY DEVELOPMENT:
# Squad commits to feature branch:
git add . && git commit -m "Add map component"
git push origin feature/mapbox-integration

# You switch for bug fixes:
git add . && git commit -m "WIP: mapbox progress"
git checkout main
git pull origin main
# Fix bug, commit, push
git checkout feature/mapbox-integration

# 3. SYNC: Keep feature current (after bug fixes)
git checkout feature/mapbox-integration
git rebase origin/main
git push --force-with-lease origin feature/mapbox-integration

# 4. FINAL: Pull Request when complete
# GitHub UI: Create PR from feature/mapbox-integration → main
# Review, test, then merge
```

**Benefits of Branch + PR Workflow:**
- **Simplicity**: Standard Git workflow, easy to understand
- **Flexibility**: Can still work on bugs while feature is in progress
- **Safety**: Pull request review before merging to main
- **No Complex Setup**: Uses basic Git features, no worktree setup needed

**Tips for Smooth Branch Switching:**
- **Save Progress**: Always commit before switching (even with "WIP:" messages)
- **Metro/Expo**: May need to restart dev servers after switching branches
- **Dependencies**: Run `npm install` if package.json changed between branches
- **Clean State**: Use `git status` to ensure no uncommitted changes before switching

**Priority Considerations:**
- **Phase 1**: Admin dashboard "Map Clients" management interface (Web Developer #7)
- **Phase 2**: Mobile app Mapbox integration and basic venue markers (Mobile Developers #1 & #2)
- **Phase 3**: Backend API development for venue/client data (Backend Developer #3)
- **Phase 4**: Advanced map interactions and client type differentiation
- **Phase 5**: Testing and quality assurance across platforms (QA Engineer #4)
- Prioritize mobile performance and smooth touch interactions over feature richness
- Ensure location privacy is handled transparently and gives users control

**Squad Allocation Summary:**
- **Web Developer #7**: Admin dashboard Map Clients management interface
- **Mobile Developer #1**: React Native map integration, native modules, platform-specific code
- **Mobile Developer #2**: Expo configuration, build setup, app distribution
- **Backend Developer #3**: Firebase Functions for venue APIs, geospatial queries
- **QA Engineer #4**: Cross-platform testing, device testing, map performance testing
- **DevOps Engineer #6**: CI/CD for feature branch, deployment configuration
- **Data Engineer #5**: Analytics for map usage, venue performance metrics (if needed)

**Conflict Minimization for Mapbox Feature:**
- **New Files First**: Create new components before modifying existing ones
- **Isolated Changes**: Keep map functionality in dedicated files/modules
- **Homepage Minimal**: Only add third button to homepage, avoid other homepage changes
- **API Separation**: Create new Firebase Functions, don't modify existing ones
- **Dependencies**: Document all new package.json dependencies for conflict awareness
- **Testing Isolation**: Map tests in separate files to avoid test conflicts

**Technical Debt Prevention:**
- Create abstraction layer around Mapbox to enable future map provider changes
- Implement proper coordinate system handling and validation throughout
- Design map state management to be testable and predictable
- Document performance benchmarks and monitoring for future optimization
- Separate client management logic to support both one-time events and continuous subscriptions

## 🚫 Third-Party Actions Required (Manual Intervention)

**These actions cannot be performed by AI agents and require human intervention:**

### Account Setup & Billing
- [x] **Mapbox Account Creation**: ✅ COMPLETED - Mapbox account created
- [x] **Mapbox SDK License**: ✅ COMPLETED - Appropriate pricing tier subscribed
- [x] **API Key Generation**: ✅ COMPLETED - Public and secret access tokens available (contact project owner for tokens when needed)
- [x] **Billing Setup**: ✅ COMPLETED - Payment method and usage limits configured

### App Store & Distribution
- [ ] **Location Permission Descriptions**: Update App Store privacy descriptions for location usage
- [ ] **App Store Screenshots**: Create new screenshots showing map functionality for app store listings
- [ ] **Privacy Policy Updates**: Update privacy policy to include location data and Mapbox usage

### Legal & Compliance
- [ ] **Mapbox Terms of Service**: Review and accept Mapbox terms of service and data usage policies
- [ ] **GDPR Compliance**: Ensure location data handling complies with privacy regulations
- [ ] **User Consent**: Implement proper user consent flows for location tracking

### External Integrations
- [ ] **Apple Maps/Google Maps**: Configure deep linking for navigation features (if implemented)
- [ ] **Firebase Quota**: Monitor and adjust Firebase quotas for increased geospatial queries
- [ ] **CDN Configuration**: Set up CDN for map tile caching if needed

### Business Operations
- [ ] **Map Client Onboarding**: Establish business processes for signing up continuous subscription clients
- [ ] **Venue Data Collection**: Create processes for collecting venue coordinates, business hours, and details
- [ ] **Client Support**: Set up support processes for map client management and troubleshooting

**Note for Development Team:** 
- ✅ **Mapbox Ready**: Account setup complete - public and secret access tokens available from project owner when needed by agents
- Remaining third-party requirements (App Store, legal compliance) can be handled in parallel with development
- The squad can begin technical implementation immediately
