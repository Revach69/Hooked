## Feature: Mapbox Integration for Hooked Business Discovery
## Role Assignment: Backend Developer #3

### 🎯 Feature Context
Create backend infrastructure and APIs to support the Mapbox venue discovery feature, including geospatial queries, venue data management, and client differentiation between continuous subscriptions and one-time events.

### 📋 Assigned Tasks

- [ ] Task 1: Venue Data Model Design
  - Acceptance: Firestore schema for venues with geolocation, type, and subscription status
  - Dependencies: Coordinate with Web Dev #7 on admin requirements
  
- [ ] Task 2: Geospatial Query API
  - Acceptance: Firebase Function returning venues within map viewport with efficient querying
  - Dependencies: None
  
- [ ] Task 3: Venue Details API
  - Acceptance: API endpoint returning full venue details when marker is tapped
  - Dependencies: Venue data model completion
  
- [ ] Task 4: Client Type Differentiation Logic
  - Acceptance: Backend logic to distinguish Map Clients (continuous) from regular Clients
  - Dependencies: Admin dashboard requirements from Web Dev #7
  
- [ ] Task 5: Geospatial Indexing Setup
  - Acceptance: Firestore geohashing or GeoFire implementation for efficient location queries
  - Dependencies: Venue data model
  
- [ ] Task 6: Rate Limiting Implementation
  - Acceptance: API rate limiting to prevent abuse of geospatial queries
  - Dependencies: None
  
- [ ] Task 7: Test Data Generation
  - Acceptance: Script to generate test venues with realistic distribution for testing
  - Dependencies: None

### 🔧 Technical Requirements
- Use existing patterns from: functions/src/*.ts
- Key integration points: Firestore, Firebase Functions
- Performance considerations: Query optimization, caching strategy
- Security: Validate all location data, implement rate limiting

### ⏱️ Priority Order
1. Venue data model design (foundation for all APIs)
2. Test data generation (enables frontend testing)
3. Geospatial query API (core functionality)
4. Venue details API (marker interactions)
5. Client type differentiation (business logic)
6. Geospatial indexing (performance optimization)
7. Rate limiting (security hardening)

### 📝 Communication Protocol
- Update role-comm-3.md after each task
- Flag blockers immediately
- Note any scope clarifications needed
- Provide API documentation to Mobile Dev team