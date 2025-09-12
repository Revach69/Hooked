/**
 * PersistentPageContainer - Core container for persistent pages
 * 
 * Day 1: Discovery ONLY first (as specified in plan)
 * Day 2: Add Matches after ListenerManager is validated
 * 
 * Key Features:
 * - Transform-based show/hide (no mount/unmount)  
 * - Lazy mounting for non-essential pages
 * - Native driver performance optimization for Android
 * - Instant navigation with zero flicker
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Dimensions, Animated } from 'react-native';

// Import the original pages (wrapped with persistent navigation)
import Discovery from '../../app/discovery';
import Matches from '../../app/matches';
import Profile from '../../app/profile';
// Chat will be handled differently since it's dynamic [id] route

interface PersistentPageProps {
  isActive: boolean;
  onNavigate: (pageId: string, params?: any) => void;
}

// Wrapper components that add persistent navigation to original pages
const DiscoveryWrapper: React.FC<PersistentPageProps> = ({ isActive, onNavigate }) => {
  // Props are passed for future use - original pages use global navigation system
  // console.log('🔍 DiscoveryWrapper: isActive =', isActive, 'onNavigate available =', !!onNavigate);
  return <Discovery />;
};

const MatchesWrapper: React.FC<PersistentPageProps> = ({ isActive, onNavigate }) => {
  // Props are passed for future use - original pages use global navigation system  
  // console.log('💕 MatchesWrapper: isActive =', isActive, 'onNavigate available =', !!onNavigate);
  return <Matches />;
};

const ProfileWrapper: React.FC<PersistentPageProps> = ({ isActive, onNavigate }) => {
  // Props are passed for future use - original pages use global navigation system
  // console.log('👤 ProfileWrapper: isActive =', isActive, 'onNavigate available =', !!onNavigate);
  return <Profile />;
};

// Chat wrapper will need special handling for dynamic routes
const ChatWrapper: React.FC<PersistentPageProps & { chatId?: string }> = ({ isActive, onNavigate, chatId }) => {
  // This will be implemented when we handle chat navigation
  // console.log('💬 ChatWrapper: isActive =', isActive, 'chatId =', chatId);
  // console.log('💬 ChatWrapper: onNavigate available =', typeof onNavigate === 'function');
  return null;
};

interface PageRegistry {
  discovery: { mounted: true; component: React.ComponentType<PersistentPageProps> };
  matches: { mounted: boolean; component: React.ComponentType<PersistentPageProps> | null };
  chat: { mounted: boolean; component: React.ComponentType<PersistentPageProps> | null };
  profile: { mounted: boolean; component: React.ComponentType<PersistentPageProps> | null };
  [key: string]: { mounted: boolean; component: React.ComponentType<PersistentPageProps> | null };
}

// Note: DiscoveryPagePersistent is now imported from persistent directory

export const PersistentPageContainer: React.FC = () => {
  // console.log('🏠 PersistentPageContainer: Component rendered');
  const [currentPage, setCurrentPage] = useState('discovery');
  
  // Phase 2: Discovery always mounted, others lazy mounted
  const [pageRegistry, setPageRegistry] = useState<PageRegistry>({
    discovery: { mounted: true, component: DiscoveryWrapper },
    matches: { mounted: false, component: null },
    chat: { mounted: false, component: null },
    profile: { mounted: false, component: null }
  });
  
  const screenWidth = Dimensions.get('window').width;
  
  // Use Animated.Value for better Android performance (as specified in plan)
  const discoveryTranslateX = useRef(new Animated.Value(0)).current;
  const matchesTranslateX = useRef(new Animated.Value(screenWidth)).current;
  const profileTranslateX = useRef(new Animated.Value(screenWidth)).current;
  const chatTranslateX = useRef(new Animated.Value(screenWidth)).current;
  
  // Lazy mount pages on first visit
  const mountPageIfNeeded = async (pageId: string) => {
    if (!pageRegistry[pageId].mounted) {
      // console.log(`🏭 PersistentPageContainer: Lazy mounting ${pageId}`);
      
      // For now, we have direct imports for DiscoveryPagePersistent and MatchesPagePersistent
      let component: React.ComponentType<PersistentPageProps>;
      
      switch (pageId) {
        case 'matches':
          component = MatchesWrapper;
          break;
        case 'discovery':
          component = DiscoveryWrapper;
          break;
        case 'profile':
          component = ProfileWrapper;
          break;
        case 'chat':
          component = ChatWrapper;
          break;
        default:
          console.warn(`🏭 Component for ${pageId} not implemented yet`);
          return;
      }
      
      setPageRegistry(prev => ({
        ...prev,
        [pageId]: { mounted: true, component }
      }));
      
      // console.log(`✅ PersistentPageContainer: Successfully mounted ${pageId}`);
    }
  };

  // Navigation function with transform-based visibility and lazy mounting
  const navigateToPage = React.useCallback(async (targetPage: string, params?: any) => {
    // console.log(`🚀 PersistentPageContainer: Navigating to ${targetPage}`);
    
    if (targetPage === currentPage) {
      // console.log(`🚀 Already on ${targetPage}, skipping navigation`);
      return;
    }
    
    // Phase 2: Support all main pages
    if (!['discovery', 'matches', 'profile', 'chat'].includes(targetPage)) {
      console.warn(`🚀 Page ${targetPage} not yet implemented - staying on ${currentPage}`);
      return;
    }
    
    // Ensure target page is mounted
    await mountPageIfNeeded(targetPage);
    
    // Transform-based navigation with instant transitions - hide all except target
    const pageAnimations = {
      discovery: discoveryTranslateX,
      matches: matchesTranslateX,
      profile: profileTranslateX,
      chat: chatTranslateX,
    };
    
    const animations: Animated.CompositeAnimation[] = [];
    
    // Show target page, hide all others
    Object.entries(pageAnimations).forEach(([pageId, animatedValue]) => {
      const targetValue = pageId === targetPage ? 0 : screenWidth;
      animations.push(
        Animated.timing(animatedValue, {
          toValue: targetValue,
          duration: 0, // Instant as specified in plan
          useNativeDriver: true, // CRITICAL for Android performance
        })
      );
    });
    
    // Run all animations in parallel
    Animated.parallel(animations).start();
    
    setCurrentPage(targetPage);
    
    // Send navigation params to target page via event bus (for chat conversations)
    if (params && targetPage === 'chat') {
      const { crossPageEventBus } = await import('../navigation/CrossPageEventBus');
      crossPageEventBus.emit('chat:switchConversation', params);
    }
    
    // console.log(`✅ PersistentPageContainer: Navigation to ${targetPage} complete`);
  }, [currentPage, pageRegistry, screenWidth, discoveryTranslateX, matchesTranslateX, profileTranslateX, chatTranslateX, mountPageIfNeeded]);

  // Listen for navigation requests from wrapped pages
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupNavigationListener = async () => {
      try {
        const { crossPageEventBus } = await import('../navigation/CrossPageEventBus');
        
        unsubscribe = crossPageEventBus.subscribe('global', 'navigation:request', ({ targetPage, params }) => {
          // console.log('📱 PersistentPageContainer: Navigation request received:', targetPage, params);
          navigateToPage(targetPage, params);
        });
        
        // console.log('📱 PersistentPageContainer: Navigation listener setup complete');
      } catch (error) {
        console.error('📱 PersistentPageContainer: Error setting up navigation listener:', error);
      }
    };
    
    setupNavigationListener();
    
    return () => {
      if (unsubscribe) {
        // console.log('📱 PersistentPageContainer: Cleaning up navigation listener');
        unsubscribe();
      }
    };
  }, [navigateToPage]);

  // Log current state for debugging
  // useEffect(() => {
  //   console.log('🏠 PersistentPageContainer: Current page is', currentPage);
  //   console.log('🏠 PersistentPageContainer: Page registry:', {
  //     discoveryMounted: pageRegistry.discovery.mounted,
  //     matchesMounted: pageRegistry.matches.mounted,
  //     totalMounted: Object.values(pageRegistry).filter(p => p.mounted).length
  //   });
  // }, [currentPage, pageRegistry]);

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* Discovery Page - Always mounted (entry point) */}
      <Animated.View style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        transform: [{ translateX: discoveryTranslateX }],
        opacity: currentPage === 'discovery' ? 1 : 0,
      }}>
        <DiscoveryWrapper 
          isActive={currentPage === 'discovery'}
          onNavigate={navigateToPage}
        />
      </Animated.View>
      
      {/* Matches Page - Will be added in Day 2 after ListenerManager validation */}
      {pageRegistry.matches.mounted && pageRegistry.matches.component && (
        <Animated.View style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          transform: [{ translateX: matchesTranslateX }],
          opacity: currentPage === 'matches' ? 1 : 0,
        }}>
          <pageRegistry.matches.component 
            isActive={currentPage === 'matches'}
            onNavigate={navigateToPage}
          />
        </Animated.View>
      )}
      
      {/* Profile Page - Lazy mounted */}
      {pageRegistry.profile.mounted && pageRegistry.profile.component && (
        <Animated.View style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          transform: [{ translateX: profileTranslateX }],
          opacity: currentPage === 'profile' ? 1 : 0,
        }}>
          <pageRegistry.profile.component 
            isActive={currentPage === 'profile'}
            onNavigate={navigateToPage}
          />
        </Animated.View>
      )}

      {/* Chat Page - Lazy mounted */}
      {pageRegistry.chat.mounted && pageRegistry.chat.component && (
        <Animated.View style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          transform: [{ translateX: chatTranslateX }],
          opacity: currentPage === 'chat' ? 1 : 0,
        }}>
          <pageRegistry.chat.component 
            isActive={currentPage === 'chat'}
            onNavigate={navigateToPage}
          />
        </Animated.View>
      )}
    </View>
  );
};