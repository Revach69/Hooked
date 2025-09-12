# Instagram-Style Persistent Page Architecture Plan
**Target Branch**: `develop2` (based on `main`)  
**Date**: September 12, 2025  
**Status**: 📋 **TECHNICAL PLAN**

---

## 🎯 **Objective**

Create Instagram/TikTok-style persistent page navigation where:
- ✅ All pages stay "alive" once loaded (never unmount)
- ✅ Navigation = show/hide pages (not mount/unmount)
- ✅ Scroll positions, form states, UI states preserved
- ✅ Background data refresh while pages stay mounted
- ✅ Smooth, zero-flicker navigation experience

---

## 📊 **Current Main Branch Analysis**

### **Current Navigation System**
- **Expo Router Stack**: Standard mount/unmount navigation
- **Page Lifecycle**: Full component remount on each visit
- **State Management**: Local component state resets on navigation
- **Performance**: Basic image caching via `ImageCacheService`

### **Existing Assets to Build Upon**
1. **ImageCacheService** (`lib/services/ImageCacheService.ts`) - Basic image caching foundation
2. **AsyncStorageUtils** (`lib/asyncStorageUtils.ts`) - Local storage utilities
3. **GlobalDataCache** (`lib/cache/GlobalDataCache.ts`) - 5-minute TTL in-memory cache
4. **Performance Monitoring** - Hooks and utilities for tracking
5. **Notification System** - Robust push notification handling

---

## 🏗 **New Architecture Overview**

### **Core Paradigm Shift**
```
OLD: Mount → Use → Unmount → Remount → Use → Unmount
NEW: Mount → Show → Hide → Show → Hide (forever mounted)
```

### **System Components**
```
┌─────────────────────────────────────────────────────────────────┐
│                 PersistentPageManager                          │
│           (Replaces Expo Router Stack Navigation)              │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                PersistentPageContainer                         │
│    (Keeps all pages mounted, controls visibility)             │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│              Enhanced State Persistence                        │
│  (Scroll, forms, UI states preserved across navigation)       │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│              Background Data Refresh                           │
│        (Hidden pages continue receiving updates)              │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                Smart Memory Management                         │
│      (Cleanup when event changes or app backgrounds)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 **Implementation Plan**

### **Phase 1: Core Persistent Navigation (Week 1)**

#### **1.1 Create PersistentPageManager**
**File**: `lib/navigation/PersistentPageManager.tsx`

```typescript
interface PageState {
  id: string;
  component: React.ComponentType<any>;
  isVisible: boolean;
  isLoaded: boolean;
  lastVisited: number;
  scrollPosition?: { x: number; y: number };
  formData?: Record<string, any>;
  uiState?: Record<string, any>;
}

class PersistentPageManager {
  private pages = new Map<string, PageState>();
  private currentPageId: string = 'discovery';
  private listeners = new Set<(pageId: string) => void>();
  
  // Instagram approach: Keep all pages mounted but show/hide
  showPage(pageId: string): void;
  hidePage(pageId: string): void;
  preloadPage(pageId: string): void;
  getPageState(pageId: string): PageState;
  preserveScrollPosition(pageId: string, position: {x: number, y: number}): void;
  preserveFormData(pageId: string, data: Record<string, any>): void;
}
```

#### **1.2 Create PersistentPageContainer**
**File**: `lib/components/PersistentPageContainer.tsx`

```typescript
export const PersistentPageContainer: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('discovery');
  const [loadedPages, setLoadedPages] = useState(new Set(['discovery']));
  
  // Pre-load pages on first visit for instant subsequent access
  const preloadPage = (pageId: string) => {
    if (!loadedPages.has(pageId)) {
      setLoadedPages(prev => new Set([...prev, pageId]));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Discovery Page - Always mounted after first load */}
      <DiscoveryPagePersistent 
        style={{ 
          display: currentPage === 'discovery' ? 'flex' : 'none',
          flex: 1 
        }}
        isActive={currentPage === 'discovery'}
        onNavigate={(page) => {
          preloadPage(page);
          setCurrentPage(page);
        }}
      />
      
      {/* Matches Page - Mounted after first visit */}
      {loadedPages.has('matches') && (
        <MatchesPagePersistent 
          style={{ 
            display: currentPage === 'matches' ? 'flex' : 'none',
            flex: 1 
          }}
          isActive={currentPage === 'matches'}
          onNavigate={(page) => {
            preloadPage(page);
            setCurrentPage(page);
          }}
        />
      )}
      
      {/* Continue for Chat, Profile, etc. */}
    </View>
  );
};
```

#### **1.3 Replace Expo Router in _layout.tsx**
**Modification**: `app/_layout.tsx`

```typescript
// OLD: Expo Router Stack
<Stack 
  screenOptions={{ 
    headerShown: false,
    gestureEnabled: false,
    animation: 'none',
  }} 
/>

// NEW: Persistent Page System
<PersistentPageContainer />
```

### **Phase 2: Enhanced Page Components (Week 1-2)**

#### **2.1 Create Persistent Page Wrappers**
Transform existing pages to persistent versions:

**Files**:
- `app/persistent/DiscoveryPagePersistent.tsx`
- `app/persistent/MatchesPagePersistent.tsx`
- `app/persistent/ChatPagePersistent.tsx`
- `app/persistent/ProfilePagePersistent.tsx`

**Key Features**:
```typescript
interface PersistentPageProps {
  style: ViewStyle;
  isActive: boolean;
  onNavigate: (pageId: string) => void;
}

const DiscoveryPagePersistent: React.FC<PersistentPageProps> = ({ 
  style, 
  isActive, 
  onNavigate 
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [profiles, setProfiles] = useState([]);
  
  // Preserve scroll position when becoming inactive
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    if (isActive && scrollPosition.y > 0) {
      // Restore scroll position when page becomes active
      scrollViewRef.current?.scrollTo({ 
        y: scrollPosition.y, 
        animated: false 
      });
    }
  }, [isActive]);
  
  const handleScroll = (event: any) => {
    if (!isActive) return; // Only track scroll when active
    
    const { y } = event.nativeEvent.contentOffset;
    setScrollPosition({ x: 0, y });
    
    // Persist to PersistentPageManager
    PersistentPageManager.preserveScrollPosition('discovery', { x: 0, y });
  };
  
  // Background data refresh even when inactive
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isActive) {
        // Background refresh without UI updates
        await refreshDataSilently();
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [isActive]);
  
  return (
    <View style={style}>
      <ScrollView 
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        {/* Existing discovery page content */}
      </ScrollView>
    </View>
  );
};
```

### **Phase 3: Advanced State Persistence (Week 2)**

#### **3.1 Enhanced State Management**
**File**: `lib/state/PersistentStateManager.ts`

```typescript
interface PersistentState {
  discovery: {
    profiles: any[];
    filters: FilterSettings;
    scrollPosition: { x: number; y: number };
    selectedInterests: string[];
    likedProfiles: Set<string>;
    viewedProfiles: Set<string>;
  };
  matches: {
    matches: any[];
    scrollPosition: { x: number; y: number };
    unreadMessages: Set<string>;
    mutedMatches: Set<string>;
  };
  chat: {
    conversations: Map<string, any>;
    activeConversation: string | null;
    scrollPositions: Map<string, number>;
    draftMessages: Map<string, string>;
  };
  profile: {
    userProfile: any;
    editFormData: Record<string, any>;
    scrollPosition: { x: number; y: number };
  };
}

class PersistentStateManager {
  private state: PersistentState;
  
  // Instagram approach: Never lose user's place
  preserveDiscoveryState(state: Partial<PersistentState['discovery']>): void;
  preserveMatchesState(state: Partial<PersistentState['matches']>): void;
  preserveChatState(conversationId: string, state: any): void;
  restorePageState(pageId: string): any;
  
  // Smart cleanup when event changes
  clearEventSpecificData(eventId: string): void;
  
  // Memory management
  cleanupOldData(): void;
}
```

#### **3.2 Smart Data Preloading**
**File**: `lib/services/DataPreloadService.ts`

```typescript
class DataPreloadService {
  // Pre-load data for pages that haven't been visited yet
  async preloadMatchesData(eventId: string, sessionId: string): Promise<void>;
  async preloadChatData(eventId: string, sessionId: string): Promise<void>;
  async preloadProfileData(sessionId: string): Promise<void>;
  
  // Background refresh for inactive pages
  async refreshDiscoveryInBackground(): Promise<void>;
  async refreshMatchesInBackground(): Promise<void>;
  
  // Smart loading based on user patterns
  async predictNextPageAndPreload(currentPage: string, userHistory: string[]): Promise<void>;
}
```

### **Phase 4: Memory Management & Optimization (Week 2-3)**

#### **4.1 Memory Pressure Handler**
**File**: `lib/memory/MemoryManager.ts`

```typescript
class MemoryManager {
  private memoryWarningThreshold = 0.8; // 80% of available memory
  
  // Monitor memory usage
  async checkMemoryPressure(): Promise<boolean>;
  
  // Smart cleanup strategies
  async handleMemoryPressure(): Promise<void> {
    // 1. Clear old image cache
    // 2. Limit cached conversations
    // 3. Compress large data structures
    // 4. Clear expired cache entries
  }
  
  // Event-based cleanup
  async cleanupOnEventChange(oldEventId: string): Promise<void> {
    // Clear all data from previous event
    await AsyncStorageUtils.removeItem(`persistent_state_${oldEventId}`);
    await this.clearImageCache(oldEventId);
  }
}
```

#### **4.2 Performance Monitoring**
**File**: `lib/performance/PersistentPageMetrics.ts`

```typescript
interface PageMetrics {
  pageId: string;
  mountTime: number;
  firstInteractionTime: number;
  backgroundRefreshCount: number;
  memoryUsage: number;
  scrollRestorationTime: number;
}

class PersistentPageMetrics {
  // Track page performance
  recordPageMount(pageId: string): void;
  recordPageSwitch(fromPage: string, toPage: string): void;
  recordScrollRestoration(pageId: string, time: number): void;
  recordBackgroundRefresh(pageId: string): void;
  
  // Instagram-style analytics
  getNavigationSpeed(): number; // Time to show page
  getStatePreservationRate(): number; // % of successful state restoration
  getMemoryEfficiency(): number; // Memory per persistent page
}
```

### **Phase 5: Integration & Testing (Week 3)**

#### **5.1 Gradual Migration Strategy**
1. **Week 1**: Implement core persistent navigation for Discovery page only
2. **Week 2**: Add Matches and Chat persistence
3. **Week 3**: Add Profile page and polish
4. **Week 4**: Testing and optimization

#### **5.2 Fallback System**
```typescript
// Graceful degradation if persistent system fails
const PersistentPageFallback: React.FC = () => {
  const [persistentSystemEnabled, setPersistentSystemEnabled] = useState(true);
  
  if (!persistentSystemEnabled) {
    // Fall back to original Expo Router
    return (
      <Stack 
        screenOptions={{ 
          headerShown: false,
          gestureEnabled: false,
          animation: 'none',
        }} 
      />
    );
  }
  
  return <PersistentPageContainer />;
};
```

---

## 🎛 **Configuration & Settings**

### **Environment Variables**
```bash
# Enable/disable persistent navigation
PERSISTENT_NAVIGATION_ENABLED=true

# Memory management settings
MAX_PERSISTENT_PAGES=4
MEMORY_WARNING_THRESHOLD=0.8
BACKGROUND_REFRESH_INTERVAL=30000

# Cache settings
PERSISTENT_STATE_TTL=86400000  # 24 hours
IMAGE_CACHE_MAX_SIZE=50
```

### **Feature Flags**
```typescript
interface PersistentNavigationConfig {
  enabled: boolean;
  maxPersistentPages: number;
  backgroundRefreshEnabled: boolean;
  memoryManagementEnabled: boolean;
  scrollRestorationEnabled: boolean;
  formDataPersistenceEnabled: boolean;
}
```

---

## 📈 **Expected Performance Results**

### **Navigation Speed**
- **Current**: 200-500ms (mount/unmount cycle)
- **Target**: 0-50ms (show/hide transition)

### **State Preservation**
- **Scroll Positions**: 100% preserved
- **Form Data**: 100% preserved  
- **View States**: 100% preserved
- **Loading States**: Eliminated on revisit

### **Memory Usage**
- **Additional Memory**: ~30-60MB for 4 persistent pages
- **Memory Benefits**: Reduced garbage collection, fewer allocations
- **CPU Benefits**: No remount/render cycles

### **User Experience**
- **Navigation**: Instant page switches
- **Context**: Never lose your place
- **Forms**: Draft messages/filters preserved
- **Loading**: No loading spinners on revisit

---

## 🚀 **Implementation Timeline**

### **Week 1: Foundation**
- ✅ Create PersistentPageManager
- ✅ Build PersistentPageContainer  
- ✅ Convert Discovery page to persistent
- ✅ Replace Expo Router in _layout.tsx

### **Week 2: Expansion**
- ✅ Convert Matches page to persistent
- ✅ Convert Chat page to persistent
- ✅ Add state persistence (scroll, forms)
- ✅ Implement background data refresh

### **Week 3: Polish**
- ✅ Convert Profile page to persistent
- ✅ Add memory management
- ✅ Performance optimization
- ✅ Error handling and fallbacks

### **Week 4: Testing**
- ✅ Cross-platform testing
- ✅ Memory leak testing
- ✅ Performance benchmarking
- ✅ User acceptance testing

---

## 🔒 **Risk Mitigation**

### **Technical Risks**
1. **Memory Leaks**: Implement comprehensive cleanup
2. **Performance**: Monitor and optimize re-renders
3. **State Conflicts**: Careful state management architecture
4. **Platform Differences**: Test thoroughly on iOS/Android

### **User Experience Risks**
1. **Stale Data**: Implement smart background refresh
2. **Confusion**: Clear visual indicators for active page
3. **Battery Usage**: Optimize background processes

### **Rollback Plan**
- Feature flag to disable persistent navigation
- Automatic fallback to Expo Router on errors
- Gradual rollout with A/B testing capability

---

## 📚 **Files to Create/Modify**

### **New Files**
```
lib/navigation/
├── PersistentPageManager.tsx
├── NavigationState.ts
└── types.ts

lib/components/
├── PersistentPageContainer.tsx
└── PageTransition.tsx

lib/state/
├── PersistentStateManager.ts
└── StateSerializer.ts

lib/memory/
├── MemoryManager.ts
└── CleanupScheduler.ts

app/persistent/
├── DiscoveryPagePersistent.tsx
├── MatchesPagePersistent.tsx
├── ChatPagePersistent.tsx
└── ProfilePagePersistent.tsx
```

### **Modified Files**
```
app/_layout.tsx                 # Replace Expo Router
lib/services/ImageCacheService.ts  # Enhance for persistent pages
lib/asyncStorageUtils.ts        # Add persistent state utilities
```

---

## ✅ **Success Criteria**

1. **Navigation Speed**: < 50ms page transitions
2. **State Preservation**: 100% scroll/form state preserved
3. **Memory Usage**: < 100MB additional memory for full persistence
4. **User Satisfaction**: Smooth Instagram-like experience
5. **Stability**: < 0.1% crash rate increase
6. **Battery Impact**: < 5% additional battery usage

---

This architecture will transform the app from a traditional navigation system to a true Instagram/TikTok-style persistent experience where users never lose their place and navigation feels instant and fluid.

**Ready to begin implementation on `develop2` branch!** 🚀