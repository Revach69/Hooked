# Discovery Page Analysis

## Suspicious/Potentially Duplicated Code Patterns

### 1. Profile Loading Mechanisms (CRITICAL DUPLICATION)
**Location**: Multiple `useEffect` hooks and functions
- **Line 535-571**: Initial profile loading in main `useEffect` 
- **Line 574-592**: Navigation listener for profile loading
- **Line 435-502**: Profile loading in `initializeSession` function
- **Line 219-268**: Profile loading in `handleRefresh` pull-to-refresh

**Suspicion**: All 4 mechanisms load profiles from the same source (GlobalDataCache/EventProfileAPI) with similar logic. This creates race conditions and unnecessary API calls.

### 2. Image Preloading Systems (PERFORMANCE OVERHEAD)
**Location**: Multiple image caching approaches
- **Line 464-484**: Image preloading in `initializeSession`
- **Line 781-820**: "AGGRESSIVE IMAGE PRELOADING" in real-time listeners
- **Line 2102-2125**: "Hidden Image Pool" pre-rendering

**Suspicion**: 3 different image preloading strategies running simultaneously, potentially loading same images multiple times.

### 3. Listener Setup Patterns (COMPLEXITY OVERHEAD)
**Location**: Multiple listener creation systems
- **Line 720-876**: `setupOtherListeners` function
- **Line 879-960**: "Consolidated listener setup" useEffect
- **Line 683-717**: Message listener setup

**Suspicion**: Two separate systems setting up Firestore listeners with overlapping functionality.

### 4. Event Data Loading (REDUNDANT CACHING)
**Location**: Multiple event loading mechanisms
- **Line 296-357**: Event loading in `initializeSession` with 3-tier caching
- Cache → AsyncStorage → Database fallback

**Suspicion**: Overly complex caching system that may be unnecessary given consent page now loads event data.

### 5. Profile State Management (STATE CONFLICTS)
**Location**: Multiple profile filtering/sorting systems
- **Line 1054-1153**: Main filtering useEffect with caching logic
- **Line 1055-1072**: Complex skip logic for re-filtering
- **Line 1074-1095**: Internal `sortProfilesByPriority` function
- **Line 1097-1150**: Internal `applyFilters` function

**Suspicion**: Overly complex filtering system with cache management that may conflict with new consent-fetched approach.

### 6. Cache Management Systems (OVER-CACHING)
**Location**: Multiple cache strategies
- **Line 557**: `discovery_has_consent_profiles` flag
- **Line 1058**: `${CacheKeys.DISCOVERY_PROFILES}_filtered` cache
- **Line 298**: `CacheKeys.DISCOVERY_EVENT` cache
- **Line 385**: `${CacheKeys.DISCOVERY_CURRENT_USER}_${sessionId}` cache

**Suspicion**: 4+ different cache keys/strategies for similar data, potential conflicts.

### 7. User Activity Tracking (OVERHEAD)
**Location**: Multiple activity systems
- **Line 634-646**: AppState change listener
- **Line 648-659**: Periodic activity updates
- **Line 594-618**: `useFocusEffect` profile refresh

**Suspicion**: 3 different user activity/focus tracking mechanisms running simultaneously.

### 8. Error Handling Patterns (REDUNDANT TRY-CATCH)
**Location**: Multiple error handling systems
- **Line 505-524**: Complex timeout error handling in `initializeSession`
- **Line 344-355**: Database error handling
- **Line 486-501**: Profile load error handling

**Suspicion**: Nested and redundant error handling that may be overly defensive.

### 9. Unused/Obsolete Code (DEAD CODE)
**Location**: Potentially unused functionality
- **Line 1155**: Comment "Images now render directly from original URLs"
- **Line 1157**: Comment "Duplicate initializeSession function removed"
- **Line 27**: `BackgroundDataPreloader` import (may be obsolete after consent changes)
- **Line 933**: Comment "OPTION 1 FIX: Removed dependency..."

**Suspicion**: Comments referring to removed/obsolete code and imports that may no longer be needed.

### 10. Message Status Tracking (DUAL SYSTEMS)
**Location**: Two message status systems
- **Line 661-681**: Periodic refresh for unread status
- **Line 683-717**: Real-time message listener

**Suspicion**: Both polling and real-time approaches for same functionality.

## Summary
The Discovery page has evolved through multiple iterations of fixes, resulting in:
- 4 different profile loading mechanisms
- 3 different image preloading systems  
- 2 different listener setup approaches
- Multiple redundant caching strategies
- Overlapping error handling and activity tracking

This creates potential race conditions, performance overhead, and maintenance complexity. Many of these systems were likely added as patches to fix specific issues but weren't cleaned up when better solutions were implemented (like the recent consent-fetched profiles approach).

## Cleanup Performed ✅

### 1. Removed Redundant Profile Loading
- ✅ **Removed navigation listener** (Lines 574-592) - Made redundant by consent-fetched profiles
- ✅ **Simplified initializeSession** - Removed complex cache checking, now has simple fallback logic
- ✅ **Removed BackgroundDataPreloader import** - No longer needed with direct consent approach

### 2. Eliminated Redundant Image Preloading
- ✅ **Removed image preloading in initializeSession** - Images now handled by consent page
- ✅ **Removed aggressive image preloading in listeners** - Kept only efficient hidden image pool
- ✅ **Maintained hidden image pool** - This is the most efficient approach for modal display

### 3. Simplified Cache Management
- ✅ **Removed filtered profiles cache** - Simplified filtering logic without cache complications
- ✅ **Removed complex re-filtering skip logic** - Filtering is now straightforward
- ✅ **Kept core profile cache** - Still needed for listener updates

### 4. Cleaned Up Dead Code
- ✅ **Removed obsolete comments** - "Images now render directly", "Duplicate function removed"
- ✅ **Updated import comments** - Clarified BackgroundDataPreloader removal reason

## Result
The Discovery page is now cleaner and more maintainable:
- **Single profile loading path**: Consent fetches → Discovery displays (with fallback)
- **Single image optimization**: Hidden image pool for modal performance  
- **Simplified caching**: One cache for profiles, no complex filtered cache
- **Reduced race conditions**: Fewer competing systems loading same data
- **Better performance**: Less redundant work, fewer API calls

The page retains all functionality while being significantly more efficient and maintainable.