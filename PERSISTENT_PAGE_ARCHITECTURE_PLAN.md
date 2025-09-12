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

## 🔧 **Enhanced Implementation Plan**

### **Phase 1: Performance-Optimized Core Navigation (Week 1)**

#### **1.1 Create Enhanced PersistentPageManager**
**File**: `lib/navigation/PersistentPageManager.tsx`

```typescript
interface PageState {
  id: string;
  component: React.ComponentType<any>;
  isVisible: boolean;
  isMounted: boolean;
  isHibernated: boolean;
  lastVisited: number;
  scrollPosition?: { x: number; y: number };
  formData?: Record<string, any>;
  uiState?: Record<string, any>;
  transform: { translateX: number; opacity: number };
}

interface PageRegistry {
  discovery: { mounted: true; component: DiscoveryPagePersistent };  // Always mounted
  matches: { mounted: boolean; component: MatchesPagePersistent | null };  // Lazy mount
  chat: { mounted: boolean; component: ChatPagePersistent | null };
  profile: { mounted: boolean; component: ProfilePagePersistent | null };
}

class PersistentPageManager {
  private pages = new Map<string, PageState>();
  private currentPageId: string = 'discovery';
  private screenWidth: number = Dimensions.get('window').width;
  private listeners = new Set<(pageId: string) => void>();
  private pageRegistry: PageRegistry;
  
  // Performance-optimized show/hide with transforms
  showPage(pageId: string): void {
    const page = this.pages.get(pageId);
    if (page) {
      page.isVisible = true;
      page.transform = { translateX: 0, opacity: 1 };
      page.lastVisited = Date.now();
    }
  }
  
  hidePage(pageId: string): void {
    const page = this.pages.get(pageId);
    if (page) {
      page.isVisible = false;
      page.transform = { translateX: this.screenWidth, opacity: 0 };
      // Don't unmount - just hide with transform
    }
  }
  
  // Lazy mounting strategy
  async mountPageOnDemand(pageId: string): Promise<void> {
    if (!this.pageRegistry[pageId].mounted) {
      this.pageRegistry[pageId].mounted = true;
      this.pageRegistry[pageId].component = await this.loadPageComponent(pageId);
    }
  }
  
  // Memory management
  hibernatePage(pageId: string): void;
  revivePage(pageId: string): void;
}
```

#### **1.2 Create Performance-Optimized PersistentPageContainer**
**File**: `lib/components/PersistentPageContainer.tsx`

```typescript
export const PersistentPageContainer: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('discovery');
  const [pageRegistry, setPageRegistry] = useState<PageRegistry>({
    discovery: { mounted: true, component: DiscoveryPagePersistent },
    matches: { mounted: false, component: null },
    chat: { mounted: false, component: null },
    profile: { mounted: false, component: null }
  });
  const screenWidth = Dimensions.get('window').width;
  
  // Lazy mount pages on first visit
  const mountPageIfNeeded = async (pageId: string) => {
    if (!pageRegistry[pageId].mounted) {
      const component = await import(`../persistent/${pageId}PagePersistent`);
      setPageRegistry(prev => ({
        ...prev,
        [pageId]: { mounted: true, component: component.default }
      }));
    }
  };
  
  const navigateToPage = async (targetPage: string) => {
    // Ensure target page is mounted
    await mountPageIfNeeded(targetPage);
    setCurrentPage(targetPage);
  };

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* Discovery Page - Always mounted (entry point) */}
      <View style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        transform: [{ translateX: currentPage === 'discovery' ? 0 : screenWidth }],
        opacity: currentPage === 'discovery' ? 1 : 0,
      }}>
        <DiscoveryPagePersistent 
          isActive={currentPage === 'discovery'}
          onNavigate={navigateToPage}
        />
      </View>
      
      {/* Matches Page - Lazy mounted */}
      {pageRegistry.matches.mounted && (
        <View style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          transform: [{ translateX: currentPage === 'matches' ? 0 : screenWidth }],
          opacity: currentPage === 'matches' ? 1 : 0,
        }}>
          <MatchesPagePersistent 
            isActive={currentPage === 'matches'}
            onNavigate={navigateToPage}
          />
        </View>
      )}
      
      {/* Continue for Chat, Profile with lazy mounting... */}
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

#### **1.3 Create Critical Infrastructure Components**

##### **Firebase ListenerManager**
**File**: `lib/navigation/ListenerManager.ts`

```typescript
class ListenerManager {
  private activeListeners = new Map<string, () => void>();
  private pageListeners = new Map<string, Set<string>>();
  
  registerListener(pageId: string, listenerId: string, unsubscribe: () => void) {
    const key = `${pageId}_${listenerId}`;
    
    // Prevent duplicate listeners for same page
    if (this.activeListeners.has(key)) {
      this.activeListeners.get(key)!();
      console.log(`ListenerManager: Cleaned up duplicate listener ${key}`);
    }
    
    this.activeListeners.set(key, unsubscribe);
    
    // Track listeners per page
    if (!this.pageListeners.has(pageId)) {
      this.pageListeners.set(pageId, new Set());
    }
    this.pageListeners.get(pageId)!.add(listenerId);
  }
  
  // Clean up page-specific listeners (not global ones)
  cleanupPageListeners(pageId: string) {
    const listenerIds = this.pageListeners.get(pageId);
    if (listenerIds) {
      listenerIds.forEach(listenerId => {
        const key = `${pageId}_${listenerId}`;
        const unsubscribe = this.activeListeners.get(key);
        if (unsubscribe) {
          unsubscribe();
          this.activeListeners.delete(key);
        }
      });
      this.pageListeners.delete(pageId);
    }
  }
  
  // Clean up ALL listeners when event changes
  cleanupAllListeners() {
    this.activeListeners.forEach(unsubscribe => unsubscribe());
    this.activeListeners.clear();
    this.pageListeners.clear();
    console.log('ListenerManager: Cleaned up all Firebase listeners');
  }
}

export const listenerManager = new ListenerManager();
```

##### **CrossPageEventBus**
**File**: `lib/navigation/CrossPageEventBus.ts`

```typescript
import { EventEmitter } from 'events';

type CrossPageEvents = {
  'profileLiked': { profileId: string; eventId: string };
  'profileSkipped': { profileId: string; eventId: string };
  'matchCreated': { matchId: string; partnerName: string };
  'messageReceived': { conversationId: string; message: any };
  'messageRead': { conversationId: string; messageIds: string[] };
  'userProfileUpdated': { userId: string; changes: any };
};

class CrossPageEventBus {
  private events = new EventEmitter();
  private pageSubscriptions = new Map<string, Set<string>>();
  
  emit<K extends keyof CrossPageEvents>(
    event: K, 
    data: CrossPageEvents[K]
  ) {
    console.log(`CrossPageEventBus: Broadcasting ${event}`, data);
    this.events.emit(event, data);
  }
  
  subscribe<K extends keyof CrossPageEvents>(
    pageId: string,
    event: K, 
    handler: (data: CrossPageEvents[K]) => void
  ) {
    const wrappedHandler = (data: CrossPageEvents[K]) => {
      console.log(`CrossPageEventBus: ${pageId} received ${event}`);
      handler(data);
    };
    
    this.events.on(event, wrappedHandler);
    
    // Track subscriptions for cleanup
    if (!this.pageSubscriptions.has(pageId)) {
      this.pageSubscriptions.set(pageId, new Set());
    }
    this.pageSubscriptions.get(pageId)!.add(event);
    
    return () => {
      this.events.off(event, wrappedHandler);
      this.pageSubscriptions.get(pageId)?.delete(event);
    };
  }
  
  // Clean up page subscriptions when hibernating
  cleanupPageSubscriptions(pageId: string) {
    this.pageSubscriptions.delete(pageId);
  }
}

export const crossPageEventBus = new CrossPageEventBus();
```

##### **PageHibernation System**
**File**: `lib/navigation/PageHibernation.ts`

```typescript
interface HibernatedPageState {
  pageId: string;
  scrollPosition: { x: number; y: number };
  formData: Record<string, any>;
  essentialData: any;
  hibernatedAt: number;
}

class PageHibernation {
  private hibernatedPages = new Map<string, HibernatedPageState>();
  private memoryThreshold = 0.8; // 80% memory usage triggers hibernation
  
  async hibernatePage(pageId: string) {
    console.log(`PageHibernation: Hibernating ${pageId} due to memory pressure`);
    
    // 1. Extract and save essential state
    const state = this.extractPageState(pageId);
    this.hibernatedPages.set(pageId, {
      pageId,
      scrollPosition: state.scrollPosition,
      formData: state.formData,
      essentialData: state.essentialData,
      hibernatedAt: Date.now()
    });
    
    // 2. Clean up Firebase listeners
    listenerManager.cleanupPageListeners(pageId);
    
    // 3. Clear image references (keep skeleton UI)
    this.clearPageImages(pageId);
    
    // 4. Unmount heavy components
    this.unmountHeavyComponents(pageId);
  }
  
  async revivePage(pageId: string): Promise<void> {
    const hibernatedState = this.hibernatedPages.get(pageId);
    if (!hibernatedState) return;
    
    console.log(`PageHibernation: Reviving ${pageId}`);
    
    // 1. Restore component tree
    await this.restorePageComponents(pageId);
    
    // 2. Restore state
    this.restorePageState(pageId, hibernatedState);
    
    // 3. Re-establish Firebase listeners
    this.restorePageListeners(pageId);
    
    // 4. Clean up hibernation data
    this.hibernatedPages.delete(pageId);
  }
  
  // Check memory pressure and hibernate pages if needed
  async checkMemoryPressureAndHibernate(): Promise<void> {
    const memoryUsage = await this.getMemoryUsage();
    if (memoryUsage > this.memoryThreshold) {
      const pagesToHibernate = this.selectPagesForHibernation();
      for (const pageId of pagesToHibernate) {
        await this.hibernatePage(pageId);
      }
    }
  }
  
  private selectPagesForHibernation(): string[] {
    // Hibernate least recently used pages first
    // Never hibernate the current active page
    return [];
  }
}

export const pageHibernation = new PageHibernation();
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

#### **Critical Hooks for Page Management**

##### **usePersistentPage Hook**
**File**: `lib/hooks/usePersistentPage.ts`

```typescript
interface PersistentPageOptions {
  pageId: string;
  onActivate?: () => void;
  onDeactivate?: () => void;
  backgroundRefreshInterval?: number;
}

export const usePersistentPage = (options: PersistentPageOptions) => {
  const { pageId, onActivate, onDeactivate, backgroundRefreshInterval = 30000 } = options;
  const [isActive, setIsActive] = useState(false);
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  
  // Register with PersistentPageManager
  useEffect(() => {
    const unregister = persistentPageManager.registerPage(pageId, {
      onShow: () => {
        setIsActive(true);
        onActivate?.();
      },
      onHide: () => {
        setIsActive(false);
        onDeactivate?.();
      }
    });
    
    return unregister;
  }, [pageId]);
  
  // Firebase listener management
  const registerListener = useCallback((listenerId: string, unsubscribe: () => void) => {
    listenerManager.registerListener(pageId, listenerId, unsubscribe);
  }, [pageId]);
  
  // Cross-page event subscription
  const subscribeToEvent = useCallback(<K extends keyof CrossPageEvents>(
    event: K, 
    handler: (data: CrossPageEvents[K]) => void
  ) => {
    return crossPageEventBus.subscribe(pageId, event, handler);
  }, [pageId]);
  
  // Background data refresh for inactive pages
  useEffect(() => {
    if (!isActive && backgroundRefreshInterval > 0) {
      const interval = setInterval(() => {
        // Only refresh data, don't update UI when inactive
        refreshDataSilently();
      }, backgroundRefreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [isActive, backgroundRefreshInterval]);
  
  return {
    isActive,
    scrollPosition,
    setScrollPosition,
    registerListener,
    subscribeToEvent,
    emitEvent: crossPageEventBus.emit.bind(crossPageEventBus)
  };
};
```

##### **usePageVisibility Hook**
**File**: `lib/hooks/usePageVisibility.ts`

```typescript
export const usePageVisibility = (pageId: string) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHibernated, setIsHibernated] = useState(false);
  
  useEffect(() => {
    const unsubscribe = persistentPageManager.subscribeToVisibility(pageId, (visible, hibernated) => {
      setIsVisible(visible);
      setIsHibernated(hibernated);
    });
    
    return unsubscribe;
  }, [pageId]);
  
  // Performance optimization: don't render heavy components when not visible
  const shouldRenderHeavyComponents = isVisible && !isHibernated;
  
  // Memory optimization: use skeleton UI when hibernated
  const shouldUseSkeletonUI = isHibernated;
  
  return {
    isVisible,
    isHibernated,
    shouldRenderHeavyComponents,
    shouldUseSkeletonUI
  };
};
```

### **New Files**
```
lib/navigation/
├── PersistentPageManager.tsx
├── ListenerManager.ts           # NEW - Firebase listener management
├── CrossPageEventBus.ts         # NEW - State synchronization
├── PageHibernation.ts           # NEW - Memory management
├── NavigationState.ts
└── types.ts

lib/components/
├── PersistentPageContainer.tsx
└── PageTransition.tsx

lib/hooks/
├── usePersistentPage.ts         # NEW - Page registration hook
└── usePageVisibility.ts         # NEW - Visibility optimization hook

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