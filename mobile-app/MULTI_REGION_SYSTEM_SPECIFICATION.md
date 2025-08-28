# Multi-Region System Specification
## Event-Based Regional Backend Infrastructure

### 📋 Overview

This document outlines the implementation of a multi-region backend system for the Hooked platform, designed to provide optimal performance for events hosted in different geographical locations. The system will automatically route event data and storage to the most appropriate Firebase region based on the event's country.

### 🎯 Goals & Objectives

#### Primary Goals
1. **Reduce Latency**: Minimize database and storage access times for users based on their geographical location
2. **Improve User Experience**: Faster app responsiveness for events in different regions
3. **Scalability**: Support for events in any country without code changes
4. **Cost Efficiency**: Only provision resources when needed for new regions
5. **Zero Runtime Impact**: Region assignment at event creation to avoid mobile app performance impact

#### Success Metrics
- **Latency Reduction**: 50-80% improvement in database/storage response times for regional events
- **User Satisfaction**: Improved app performance scores in target regions
- **Operational Efficiency**: Automated region selection without manual intervention
- **Performance Impact**: Zero additional latency for mobile app region determination

### 🔄 Current Architecture

```
Current Setup:
├── Database: me-west1 (Israel)
├── Storage: me-west1 (Israel)  
├── Functions: us-central1 (US)
└── Events: Primarily Israel-based
```

**Limitations:**
- International events experience high latency (200-400ms vs 20-50ms for Israel)
- No regional optimization for events outside the primary region
- Manual region management required for new countries
- Poor user experience for events in distant geographical locations

### 🏗️ Proposed System Architecture

```
Multi-Region System:
├── Region Assignment: Country → Region (at event creation)
├── Dynamic Configuration: Event-specific Firebase instances
├── Fallback Strategy: Default to Israel (me-west1)
├── Admin Control: Manual region provisioning
└── Mobile App: Uses pre-assigned region (no runtime determination)
```

### 📊 Regional Mapping Strategy

#### Phase 1: Initial Regions
| Country | Database Region | Storage Region | Functions Region | Priority |
|---------|----------------|----------------|------------------|----------|
| Israel | me-west1 | me-west1 | us-central1 | Default |
| Australia | australia-southeast1 | australia-southeast1 | australia-southeast1 | High |

#### Phase 2: Expansion Regions
| Country | Database Region | Storage Region | Functions Region | Priority |
|---------|----------------|----------------|------------------|----------|
| United States | us-central1 | us-central1 | us-central1 | Medium |
| United Kingdom | europe-west2 | europe-west2 | europe-west2 | Medium |
| Germany | europe-west3 | europe-west3 | europe-west3 | Medium |
| Canada | northamerica-northeast1 | northamerica-northeast1 | northamerica-northeast1 | Medium |
| Brazil | southamerica-east1 | southamerica-east1 | southamerica-east1 | Medium |
| Japan | asia-northeast1 | asia-northeast1 | asia-northeast1 | Medium |
| Singapore | asia-southeast1 | asia-southeast1 | asia-southeast1 | Medium |

### 🔧 Technical Requirements

#### 1. Region Configuration System
```typescript
interface RegionConfig {
  database: string;
  storage: string;
  functions: string;
  projectId?: string; // For separate projects per region
  isActive: boolean;
}

interface CountryRegionMapping {
  [country: string]: RegionConfig;
}
```

#### 2. Dynamic Firebase Configuration
- Event-specific Firebase app instances
- Region-aware database connections
- Automatic fallback to default region
- Configuration validation and error handling

#### 3. Event Model Updates
```typescript
interface Event {
  // ... existing fields
  country: string;           // Already exists
  region: string;           // Already exists - will be auto-populated at creation
  regionConfig?: RegionConfig; // New: cached region configuration for performance
}
```

#### 4. Admin Dashboard Enhancements
- Region information display in event forms
- Region status indicators
- Manual region override capabilities
- Region performance metrics
- Real-time region assignment preview during event creation

### 🚀 Implementation Plan

#### Phase 1: Foundation (Week 1-2)
**Files to Create/Modify:**
- `src/lib/regionUtils.ts` - Region mapping and utilities
- `src/lib/firebaseRegionConfig.ts` - Dynamic Firebase configuration
- Update `src/lib/firebaseApi.ts` - Region-aware database access
- Update `src/components/EventForm.tsx` - Region assignment and display

**Key Features:**
- Region mapping configuration
- Dynamic Firebase config factory
- Event-specific database connections
- Region assignment at event creation
- Region display in admin dashboard

**Mobile App Updates Required:**
- Update Firebase configuration for region support
- Add region utilities (shared with web-admin)
- Update event service to use region-specific connections
- Maintain backward compatibility for existing events

#### Phase 2: Regional Implementation (Week 3-4)
**Tasks:**
- Create regional Firebase projects (starting with highest priority regions)
- Configure region-specific resources
- Test with events in target regions
- Monitor performance improvements

**Success Criteria:**
- Regional events use appropriate regional endpoints
- Latency reduced by 60-80% in target regions
- No impact on existing events in default region

#### Phase 3: Automation & Monitoring (Week 5-6)
**Features:**
- Region health monitoring
- Automatic region selection validation
- Performance metrics dashboard
- Error handling and fallback mechanisms

#### Phase 4: Expansion Readiness (Future)
**Capabilities:**
- Automated region provisioning via Google Cloud Console
- Cross-region data synchronization
- Region migration tools
- Cost monitoring and optimization
- Pre-created regional resources for instant activation

### 📁 File Structure & Implementation

#### 1. Region Utilities (`src/lib/regionUtils.ts`)
```typescript
export const COUNTRY_REGION_MAPPING: CountryRegionMapping = {
  'Israel': {
    database: 'me-west1',
    storage: 'me-west1',
    functions: 'us-central1',
    isActive: true
  },
  'Australia': {
    database: 'australia-southeast1',
    storage: 'australia-southeast1', 
    functions: 'australia-southeast1',
    isActive: true
  },
  'United States': {
    database: 'us-central1',
    storage: 'us-central1',
    functions: 'us-central1',
    isActive: false // Will be activated when needed
  },
  'United Kingdom': {
    database: 'europe-west2',
    storage: 'europe-west2',
    functions: 'europe-west2',
    isActive: false
  },
  'Germany': {
    database: 'europe-west3',
    storage: 'europe-west3',
    functions: 'europe-west3',
    isActive: false
  }
  // Additional countries can be added as needed
};

export const DEFAULT_REGION: RegionConfig = {
  database: 'me-west1',
  storage: 'me-west1',
  functions: 'us-central1',
  isActive: true
};

export function getRegionForCountry(country: string): RegionConfig {
  return COUNTRY_REGION_MAPPING[country] || DEFAULT_REGION;
}

export function isRegionActive(country: string): boolean {
  const region = getRegionForCountry(country);
  return region.isActive;
}
```

#### 2. Dynamic Firebase Configuration (`src/lib/firebaseRegionConfig.ts`)
```typescript
export function getFirebaseConfigForRegion(region: RegionConfig) {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}-${region.storage}`,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
    databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}-${region.database}.firebaseio.com`,
  };
}

export function getEventSpecificFirebaseApp(eventCountry: string) {
  const region = getRegionForCountry(eventCountry);
  const config = getFirebaseConfigForRegion(region);
  
  // Create unique app name for region
  const appName = `event-${region.database}`;
  
  try {
    return getApp(appName);
  } catch {
    return initializeApp(config, appName);
  }
}
```

#### 3. Enhanced Firebase API (`src/lib/firebaseApi.ts`)
```typescript
// Add region-aware database access
export function getEventSpecificDb(eventCountry: string) {
  const app = getEventSpecificFirebaseApp(eventCountry);
  return getFirestore(app);
}

export function getEventSpecificStorage(eventCountry: string) {
  const app = getEventSpecificFirebaseApp(eventCountry);
  return getStorage(app);
}

// Update existing functions to use event-specific connections
export async function getEvent(eventId: string, eventCountry?: string) {
  const db = eventCountry ? getEventSpecificDb(eventCountry) : getDbInstance();
  // ... rest of function
}
```

#### 4. Admin Dashboard Updates (`src/components/EventForm.tsx`)
```typescript
// Add region information display
{formData.country && (
  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
      Region Configuration
    </h4>
    <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
      <p><strong>Database:</strong> {getRegionForCountry(formData.country).database}</p>
      <p><strong>Storage:</strong> {getRegionForCountry(formData.country).storage}</p>
      <p><strong>Functions:</strong> {getRegionForCountry(formData.country).functions}</p>
      <p><strong>Status:</strong> 
        <span className={`ml-1 px-2 py-1 rounded text-xs ${
          isRegionActive(formData.country) 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
        }`}>
          {isRegionActive(formData.country) ? 'Active' : 'Pending Setup'}
        </span>
      </p>
    </div>
  </div>
)}
```

### 🔄 User Flow

#### Event Creation Flow
1. **Admin selects country** in event form
2. **System immediately assigns region** based on country mapping
3. **Region information displayed** in form with status indicator
4. **Event saved with region configuration** cached in event data
5. **Mobile app uses pre-assigned region** when event becomes active (no runtime determination)

#### Event Access Flow (Mobile App)
1. **User opens event** in mobile app
2. **App reads pre-assigned region** from event data (no calculation needed)
3. **App connects to region-specific Firebase** instance
4. **All database/storage operations** use regional endpoints
5. **Fallback to default region** if regional connection fails
6. **Performance monitoring** tracks latency improvements per region

### 🛡️ Error Handling & Fallback Strategy

#### Primary Fallback Chain
1. **Event-specific region** (e.g., australia-southeast1, europe-west2, etc.)
2. **Default region** (me-west1 - Israel) - deterministic fallback
3. **Error logging** and admin notification

#### Error Scenarios
- **Region not configured**: Fallback to default
- **Region temporarily unavailable**: Retry with exponential backoff
- **Configuration error**: Log error and use default
- **Network issues**: Graceful degradation

### 📊 Monitoring & Analytics

#### Performance Metrics
- **Latency per region**: Database and storage response times
- **Error rates**: Region-specific failure rates
- **User experience**: App performance scores by region
- **Cost tracking**: Resource usage per region

#### Health Checks
- **Region availability**: Regular connectivity tests
- **Configuration validation**: Region mapping integrity
- **Performance alerts**: Latency threshold monitoring
- **Cost alerts**: Budget limits per region

### 🔒 Security Considerations

#### Data Residency
- **Regional compliance**: Ensure data stays in appropriate regions
- **Privacy regulations**: GDPR, CCPA compliance per region
- **Audit trails**: Track data access by region

#### Access Control
- **Region-specific permissions**: Admin access controls
- **Configuration security**: Secure region mapping storage
- **API security**: Region-aware authentication

### 💰 Cost Management

#### Resource Optimization
- **Pre-created regional resources**: Create buckets/databases ahead of time (Blaze plan)
- **Pay-per-use model**: Only charged for actual usage, not idle resources
- **Usage monitoring**: Track costs per region
- **Resource scaling**: Adjust capacity based on usage
- **Cost alerts**: Budget notifications per region

#### Regional Resource Creation
- **Storage Buckets**: Created via Firebase Console (simpler) or Google Cloud Console (advanced control)
- **Database Instances**: Created via Firebase Console or Google Cloud Console
- **Functions**: Deployed to specific regions via Firebase CLI
- **Cost Structure**: 
  - Storage: $0.026/GB/month (only for stored data)
  - Bandwidth: $0.12/GB (only when accessed)
  - Operations: $0.06/100K reads, $0.18/100K writes

#### Billing Strategy
- **Blaze plan benefits**: Create resources ahead of time, pay only for usage
- **Separate billing accounts**: Per-region cost tracking
- **Usage quotas**: Prevent runaway costs
- **Optimization recommendations**: Cost-saving suggestions
- **Regional resource management**: Google Cloud Console for bucket creation

### 🧪 Testing Strategy

#### Unit Tests
- **Region mapping logic**: Country to region conversion
- **Configuration generation**: Firebase config creation
- **Fallback mechanisms**: Error handling scenarios

#### Integration Tests
- **Regional connectivity**: Database and storage access
- **Event creation flow**: End-to-end region assignment
- **Mobile app integration**: Region-specific connections

#### Performance Tests
- **Latency benchmarks**: Before/after regional implementation
- **Load testing**: Regional capacity testing
- **Failover testing**: Region failure scenarios

### 📈 Success Metrics & KPIs

#### Technical Metrics
- **Latency reduction**: 50-80% improvement target
- **Error rate reduction**: <1% regional failures
- **Availability**: 99.9% uptime per region

#### Business Metrics
- **User satisfaction**: Improved app ratings in target regions
- **Event success**: Higher engagement in regional events
- **Cost efficiency**: Optimal resource utilization

### 🚀 Deployment Strategy

#### Staged Rollout
1. **Development**: Test with development events
2. **Staging**: Validate with test events
3. **Production**: Gradual rollout to new events
4. **Migration**: Existing events (if needed)

#### Rollback Plan
- **Configuration rollback**: Revert region mapping changes
- **Code rollback**: Deploy previous version
- **Data migration**: Move data back to default region

### 📚 Documentation Requirements

#### Technical Documentation
- **API documentation**: Region-aware endpoints
- **Configuration guide**: Region setup instructions
- **Troubleshooting guide**: Common issues and solutions

#### Operational Documentation
- **Deployment procedures**: Region provisioning steps
- **Monitoring setup**: Alert configuration
- **Maintenance procedures**: Regular health checks

### 🎯 Next Steps

#### Immediate Actions (Week 1)
1. **Create region utilities** (`regionUtils.ts`)
2. **Implement dynamic Firebase config** (`firebaseRegionConfig.ts`)
3. **Update admin dashboard** with region assignment and display
4. **Set up first regional Firebase project** (starting with highest priority region)
5. **Create regional storage buckets** via Firebase Console
6. **Update mobile app** with region support (backward compatible)

#### Short-term Goals (Month 1)
1. **Complete first regional implementation**
2. **Validate performance improvements**
3. **Set up monitoring and alerts**
4. **Document procedures**
5. **Plan expansion to additional regions**

#### Long-term Vision (3-6 months)
1. **Automated region provisioning**
2. **Advanced monitoring dashboard**
3. **Multi-region expansion** (support for 10+ regions)
4. **Cost optimization features**
5. **Global event support** with optimal regional routing

---

*This specification provides a comprehensive roadmap for implementing the multi-region system. The modular approach allows for incremental implementation while maintaining system stability and performance. The system is designed to scale globally, supporting events in any geographical location with optimal performance.*
