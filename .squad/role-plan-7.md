## Feature: Mapbox Integration for Hooked Business Discovery
## Role Assignment: Web Developer #7 - Next.js/Admin Dashboard Specialist

### 🎯 Feature Context
Create the admin dashboard interface for managing Map Clients (continuous subscription venues) as a critical dependency for the mobile map feature. This enables business operations to manage which venues appear on the map.

### 📋 Assigned Tasks

- [ ] Task 1: Map Clients Page Creation
  - Acceptance: New "Map Clients" page in admin dashboard navigation
  - Dependencies: None
  
- [ ] Task 2: Map Client CRUD Interface
  - Acceptance: Forms for creating, reading, updating, deleting Map Client venues
  - Dependencies: Backend data model from Backend Dev #3
  
- [ ] Task 3: Venue Location Input Component
  - Acceptance: Map picker or coordinate input for setting venue locations
  - Dependencies: Mapbox API keys from project owner
  
- [ ] Task 4: Client Type Differentiation UI
  - Acceptance: Clear visual distinction between Map Clients and regular Clients pages
  - Dependencies: None
  
- [ ] Task 5: Subscription Management Interface
  - Acceptance: UI for managing continuous subscription status and details
  - Dependencies: Backend client differentiation logic from Backend Dev #3
  
- [ ] Task 6: Bulk Venue Import
  - Acceptance: CSV/Excel import functionality for adding multiple venues
  - Dependencies: Backend bulk API from Backend Dev #3
  
- [ ] Task 7: Map Preview Component
  - Acceptance: Admin can preview how venues will appear on mobile map
  - Dependencies: Same marker styling as mobile app

### 🔧 Technical Requirements
- Use existing patterns from: web-admin-hooked/src/components/*
- Key integration points: Firebase Admin SDK, Next.js App Router
- Performance considerations: Pagination for large venue lists
- Follow existing admin dashboard design patterns

### ⏱️ Priority Order
1. Map Clients page creation (foundation)
2. Map Client CRUD interface (core functionality)
3. Client type differentiation UI (business requirement)
4. Venue location input component (data entry)
5. Subscription management interface (business operations)
6. Map preview component (quality assurance)
7. Bulk venue import (efficiency feature)

### 📝 Communication Protocol
- Update role-comm-7.md after each task
- Flag blockers immediately
- Note any scope clarifications needed
- Coordinate with Backend Dev #3 on API requirements