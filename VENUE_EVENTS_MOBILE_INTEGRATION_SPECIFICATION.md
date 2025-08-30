# Venue Events Mobile Integration Specification

Based on comprehensive mobile app codebase analysis, this specification details the integration strategy for venue events system with the existing Hooked mobile app.

## Executive Summary

**Integration Assessment**: ✅ **LOW RISK - EXCELLENT FOUNDATION**

The mobile app has outstanding architecture for venue events integration:
- ✅ **QR Scanner**: Robust implementation with camera permissions
- ✅ **Location Services**: Expo Location 18.1.6 with proper permissions configured  
- ✅ **Maps Integration**: Mapbox SDK with venue system and user location
- ✅ **Event System**: Extensible architecture with QR code workflows
- ✅ **Authentication**: Anonymous Firebase auth with session management
- ✅ **Push Notifications**: Comprehensive system with real-time Firestore listeners

**Key Finding**: Current app already has location permissions configured and working location services, contradicting initial assumption of no location permissions.

## Current Architecture Strengths

### **1. Existing QR & Location Infrastructure**
```typescript
// Already implemented and working:
✅ QR Code Scanner with camera permissions
✅ Expo Location with foreground permissions  
✅ Background location permissions configured
✅ Mapbox SDK with user location tracking
✅ Distance calculations and venue filtering
✅ Proper permission handling and user consent flows
```

### **2. Event System Foundation**
```typescript
// Current event architecture:
interface Event {
  id: string;
  name: string;
  event_code: string;      // Already uses QR codes
  starts_at: Timestamp;
  expires_at: Timestamp;
  location: string;        // Can be extended for venue integration
  timezone: string;
}

// Join flow: QR scan → validation → profile creation
// Perfect foundation for venue-specific events
```

### **3. Services Architecture**
```typescript
// Well-structured service layer:
- AppInitializationService: Boot sequence with retry logic
- AuthService: Anonymous Firebase authentication
- GlobalNotificationService: Real-time Firestore listeners  
- EventAPI: Complete CRUD with error handling
- LocationService: Already handling user location
```

## Integration Strategy

### **Phase 1: Data Model Extensions (Week 5)**

#### **1.1 Extend Event Model**
```typescript
// Enhanced Event interface
interface Event {
  // ... existing fields
  venue_id?: string;                    // Link to map client venue
  event_type: 'regular' | 'venue_based'; // New field to distinguish event types
  
  // For venue-based events only:
  locationSettings?: {
    venueId: string;
    qrCodeId: string;
    locationRadius: number;
    kFactor: number;                    // Radius multiplier
    venueRules: string;
    locationTips: string;
    requiresPreciseLocation: boolean;   // Whether to request high accuracy GPS
  };
}
```

#### **1.2 Extend EventProfile Model** 
```typescript
// Enhanced EventProfile for venue context
interface EventProfile {
  // ... existing eventProfile fields
  
  // Additional fields for venue events only:
  venueEventData?: {
    venueId: string;
    joinedAt: Date;
    currentLocationState: 'active' | 'paused' | 'inactive';
    lastLocationCheck: Date;
    profileVisibleInVenue: boolean;     // Auto-managed by location state
    totalTimeInVenue: number;           // seconds
    lastKnownDistance?: number;         // meters from venue center
  };
}
```

#### **1.3 New Venue Location Service**
```typescript
// /lib/services/VenueLocationService.ts
export class VenueLocationService {
  // High-level location verification
  async verifyUserAtVenue(
    userLocation: Location,
    venueId: string,
    radiusMeters: number
  ): Promise<{ withinRadius: boolean; distance: number; accuracy: number }>;
  
  // Request precise location permissions specifically for venue events
  async requestVenueLocationPermissions(): Promise<boolean>;
  
  // Background location monitoring setup
  async startVenueLocationMonitoring(eventId: string, venueId: string): Promise<void>;
  async stopVenueLocationMonitoring(): Promise<void>;
  
  // Smart location polling based on battery and distance
  calculateOptimalPingInterval(
    distance: number, 
    batteryLevel: number,
    isMoving: boolean
  ): number;
}
```

### **Phase 2: QR Flow Enhancement (Week 5)**

#### **2.1 Enhanced QR Code Parsing**
```typescript
// Update existing QR scanner to handle venue events
// /lib/components/QRCodeScanner.tsx

interface VenueEventQR {
  type: 'venue_event';
  venueId: string;
  qrCodeId: string;
  eventName: string;
  venueName: string;
}

// Enhanced QR validation in join flow
async function validateQRCode(code: string): Promise<{
  eventType: 'regular' | 'venue_based';
  event?: Event;
  venueData?: VenueEventQR;
  requiresLocation?: boolean;
}>;
```

#### **2.2 Venue-Specific Join Flow**
```typescript
// Enhanced /app/join.tsx with venue validation
const venueJoinFlow = async (qrData: VenueEventQR) => {
  // 1. Request nonce from server (server-side validation)
  const nonceResult = await requestEventNonce({
    staticQRData: JSON.stringify(qrData),
    location: await getCurrentLocation(),
    sessionId: getSessionId()
  });
  
  if (!nonceResult.success) {
    // Handle failure reasons: outside_radius, venue_closed, etc.
    showLocationTips(nonceResult.locationTips);
    return;
  }
  
  // 2. Verify tokenized entry (server validates nonce + location)
  const entryResult = await verifyTokenizedEntry({
    nonce: nonceResult.nonce,
    location: await getCurrentLocation()
  });
  
  if (entryResult.success) {
    // Join venue event successfully
    navigateToEvent(entryResult.eventId);
  }
};
```

### **Phase 3: Location Monitoring System (Week 6)**

#### **3.1 Venue Ping Service**
```typescript
// /lib/services/VenuePingService.ts
export class VenuePingService {
  private pingInterval?: NodeJS.Timeout;
  private currentVenues: Set<string> = new Set();
  
  // Start location monitoring for active venue events
  async startPinging(eventIds: string[]): Promise<void> {
    // Smart interval calculation based on:
    // - User movement speed
    // - Distance from venues  
    // - Battery level
    // - Number of active venue events
  }
  
  // Batch ping multiple venues efficiently
  async performVenuePing(): Promise<void> {
    const venues = Array.from(this.currentVenues).map(async (venueId) => {
      const location = await getCurrentLocation();
      return { venueId, location };
    });
    
    // Batch call to server
    const results = await venuePing({
      venues: await Promise.all(venues),
      batteryLevel: await getBatteryLevel(),
      movementSpeed: this.calculateMovementSpeed()
    });
    
    // Process state changes
    this.handleStateChanges(results);
  }
  
  // Handle server-authoritative state changes
  private handleStateChanges(results: VenuePingResult[]): void {
    results.forEach(result => {
      if (result.stateChanged) {
        this.updateUserVisibility(result.venueId, result.profileVisible);
        this.showStateChangeNotification(result.userMessage);
      }
    });
  }
}
```

#### **3.2 Background Location Handling**
```typescript
// Enhanced background task management
// Integrate with existing app state management in _layout.tsx

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

const VENUE_LOCATION_TASK = 'venue-location-background';

// Background task for venue location monitoring
TaskManager.defineTask(VENUE_LOCATION_TASK, ({ data, error }) => {
  if (error) {
    console.error('Venue location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data as any;
    // Process locations and update venue states
    VenuePingService.processBatchedLocations(locations);
  }
});

// Start background location for venue events
async function startVenueLocationTracking() {
  const { granted } = await Location.requestBackgroundPermissionsAsync();
  if (!granted) return false;
  
  await Location.startLocationUpdatesAsync(VENUE_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 60000,        // 1 minute minimum
    distanceInterval: 50,       // 50 meters
    deferredUpdatesInterval: 300000, // 5 minutes maximum
    foregroundService: {
      notificationTitle: "Venue Event Active",
      notificationBody: "Hooked is monitoring your venue presence"
    }
  });
}
```

### **Phase 4: UI Integration Points**

#### **4.1 Map Screen Enhancement**
```typescript
// /app/map.tsx - Enhanced venue indicators
const VenueMarker = ({ venue, hasActiveEvent }: VenueMarkerProps) => {
  return (
    <MapPin coordinate={venue.coordinates}>
      {hasActiveEvent && (
        <ActiveEventIndicator 
          eventName={venue.eventName}
          participantCount={venue.activeParticipants}
        />
      )}
    </MapPin>
  );
};

// Enhanced venue modal with event join
const VenueModal = ({ venue }: VenueModalProps) => {
  const hasActiveEvent = venue.eventHubSettings?.enabled;
  
  return (
    <Modal>
      {/* ... existing venue info */}
      
      {hasActiveEvent && (
        <VenueEventSection>
          <Text>{venue.eventHubSettings.eventName}</Text>
          <Text>{venue.eventHubSettings.venueRules}</Text>
          
          <Button 
            onPress={() => initiateVenueEventJoin(venue)}
            icon="qr-code"
          >
            I'm Here - Join Event
          </Button>
        </VenueEventSection>
      )}
    </Modal>
  );
};
```

#### **4.2 Event Home Screen Updates**
```typescript
// Enhanced /app/home.tsx for venue events
const EventHome = () => {
  const { event, venueEventData } = useCurrentEvent();
  const isVenueEvent = event?.event_type === 'venue_based';
  
  return (
    <Screen>
      {isVenueEvent && venueEventData && (
        <VenueStatusBanner
          state={venueEventData.currentLocationState}
          venueName={event.venue_name}
          distance={venueEventData.lastKnownDistance}
        />
      )}
      
      {/* ... rest of event UI */}
    </Screen>
  );
};

const VenueStatusBanner = ({ state, venueName, distance }) => {
  const statusMessages = {
    active: "You're at the venue - visible to others",
    paused: "You've stepped away - profile hidden but matches preserved",
    inactive: "Event session ended - scan QR to rejoin"
  };
  
  return (
    <Banner state={state}>
      <Text>{statusMessages[state]}</Text>
      {distance && <Text>~{Math.round(distance)}m from venue</Text>}
    </Banner>
  );
};
```

#### **4.3 Enhanced Notifications**
```typescript
// Enhanced /lib/notifications/NotificationManager.ts
export class NotificationManager {
  // ... existing notification handling
  
  // Venue-specific notifications
  async sendVenueStateNotification(
    eventId: string, 
    state: 'active' | 'paused' | 'inactive',
    message: string
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Venue Event Update",
        body: message,
        data: { eventId, venueState: state }
      },
      trigger: null // Immediate
    });
  }
  
  // Location permission reminders
  async requestLocationPermissionReminder(): Promise<void> {
    // Smart reminders when venue events are available
  }
}
```

### **Phase 5: Privacy & User Experience**

#### **5.1 Enhanced Permission Handling**
```typescript
// /lib/services/PermissionService.ts
export class PermissionService {
  // Venue-specific location permissions
  async requestVenueLocationPermissions(): Promise<{
    granted: boolean;
    canRequestAgain: boolean;
    showRationale: boolean;
  }> {
    // Progressive permission requests:
    // 1. Foreground location for venue verification
    // 2. Background location for continuous monitoring (optional)
    // 3. Precise location for better accuracy (optional)
  }
  
  // Educational permission UI
  showLocationPermissionEducation() {
    // Show benefits: automatic presence detection, seamless experience
    // Address privacy concerns: venue-only, temporary, deletable
  }
}
```

#### **5.2 Privacy Controls**
```typescript
// Enhanced privacy settings in user profile
interface PrivacySettings {
  venueLocationTracking: boolean;        // Enable venue location monitoring
  backgroundLocationUpdates: boolean;    // Allow background location
  venueDataRetention: 'session' | '24h' | '7days'; // How long to keep venue data
  shareVenuePresence: boolean;          // Show venue presence to matches
}

// Privacy-first defaults
const defaultPrivacySettings: PrivacySettings = {
  venueLocationTracking: true,    // Required for venue events
  backgroundLocationUpdates: false, // Opt-in for better experience
  venueDataRetention: 'session', // Clear after event ends
  shareVenuePresence: true       // Core feature
};
```

## Implementation Plan

### **Week 5: Foundation & QR Enhancement**
1. **Day 1-2**: Extend Event and EventProfile data models
2. **Day 3-4**: Create VenueLocationService with permission handling
3. **Day 4-5**: Enhance QR scanner for venue event codes  
4. **Day 5-7**: Implement server integration (requestEventNonce, verifyTokenizedEntry)

### **Week 6: Location Monitoring & UI**
1. **Day 1-2**: Implement VenuePingService with smart polling
2. **Day 3-4**: Background location monitoring setup
3. **Day 5-6**: Map screen venue event indicators
4. **Day 7**: Enhanced notifications and state management

## Risk Mitigation Strategies

### **Battery Optimization**
```typescript
// Smart polling intervals based on context
const calculatePingInterval = (context: {
  distanceFromVenue: number;
  batteryLevel: number;
  isMoving: boolean;
  accuracyLevel: number;
}) => {
  let baseInterval = 60; // seconds
  
  // Further away = less frequent pings
  if (context.distanceFromVenue > 200) baseInterval *= 1.5;
  
  // Low battery = reduce frequency
  if (context.batteryLevel < 20) baseInterval *= 2;
  
  // Stationary users need less frequent checks
  if (!context.isMoving) baseInterval *= 1.3;
  
  // Poor GPS = reduce frequency to prevent flapping
  if (context.accuracyLevel > 100) baseInterval *= 1.2;
  
  return Math.max(30, Math.min(300, baseInterval)); // 30s - 5min range
};
```

### **Privacy Protection**
```typescript
// Minimal data retention
const VenueDataManager = {
  // Automatically purge venue location data
  scheduleDataCleanup(eventId: string, delayHours: number = 24) {
    setTimeout(() => {
      this.purgeVenueData(eventId);
    }, delayHours * 3600000);
  },
  
  // User-initiated data deletion
  async deleteAllVenueData(userId: string) {
    await AsyncStorage.removeItem(`venue_data_${userId}`);
    await this.clearLocationHistory(userId);
  }
};
```

### **Offline Resilience**
```typescript
// Queue pings when offline, sync when back online
class OfflineVenuePingQueue {
  private pendingPings: VenuePing[] = [];
  
  async queuePing(ping: VenuePing) {
    this.pendingPings.push(ping);
    await AsyncStorage.setItem('pending_venue_pings', JSON.stringify(this.pendingPings));
  }
  
  async syncPendingPings() {
    if (this.pendingPings.length > 0) {
      // Batch sync with server
      await this.batchSyncPings(this.pendingPings);
      this.pendingPings = [];
    }
  }
}
```

## Success Metrics

### **Technical Performance**
- Location accuracy: >85% of pings within 50m accuracy
- Battery impact: <5% additional drain during venue events
- Network efficiency: <1MB data usage per hour of venue monitoring
- Response times: <2s for QR scan to nonce generation

### **User Experience**  
- Join success rate: >90% for users within venue radius
- False positive rate: <2% for users outside venue
- Permission acceptance: >70% for location permissions
- State change accuracy: >95% correct active/paused transitions

### **Security Metrics**
- Token replay prevention: 0% successful replay attacks
- Mock location detection: >80% detection rate
- Rate limiting effectiveness: 0% successful spam attempts
- Fraud prevention: <1% false positive blocks

## Conclusion

The venue events integration has **excellent architectural compatibility** with the existing mobile app. The foundation is already in place with:

✅ **QR scanning system** ready for extension
✅ **Location services** configured and working  
✅ **Event system** designed for extensibility
✅ **Maps integration** with venue data
✅ **Push notifications** for real-time updates
✅ **Anonymous authentication** for security
✅ **Offline-first architecture** for reliability

**Estimated Implementation**: **2 weeks** for core functionality with low integration risk.

**Key Success Factors**:
1. **Leverage existing infrastructure** instead of rebuilding
2. **Progressive permission requests** to maintain user trust
3. **Battery-conscious design** with smart polling intervals
4. **Privacy-first approach** with minimal data retention
5. **Robust error handling** building on existing patterns

The integration can proceed with confidence based on the strong architectural foundation already present in the mobile app.