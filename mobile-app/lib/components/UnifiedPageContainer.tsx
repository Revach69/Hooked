/**
 * UnifiedPageContainer - Single container for all app pages
 * 
 * Handles all pages with transform-based navigation:
 * - Home, Join, Consent (session-less pages)
 * - Discovery, Matches, Profile (session-required pages)  
 * - Chat (dynamic conversations)
 * 
 * Features:
 * - Transform-based show/hide (no mount/unmount)
 * - Lazy mounting for performance
 * - Deep linking support
 * - Session-aware routing
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Dimensions, Animated } from 'react-native';
import { unifiedNavigator, NavigationState, NavigationPage } from '../navigation/UnifiedNavigator';
import { crossPageEventBus } from '../navigation/CrossPageEventBus';
import { NavigationErrorBoundary } from './NavigationErrorBoundary';

// Import all pages
import Home from '../../app/home';
import Join from '../../app/join';
import Consent from '../../app/consent';
import Discovery from '../../app/discovery';
import Matches from '../../app/matches';
import Profile from '../../app/profile';
import Chat from '../../app/chat';

// Removed ProfileImageCacheProvider - using develop branch modal pattern

interface PageRegistry {
  [key: string]: {
    mounted: boolean;
    component: React.ComponentType<any> | null;
  };
}

// Page wrapper components - memoized for performance
const HomeWrapper: React.FC = React.memo(function HomeWrapper() {
  console.log('🏠 HomeWrapper: Rendering');
  return <Home />;
});

const JoinWrapper: React.FC = React.memo(function JoinWrapper() {
  console.log('🔗 JoinWrapper: Rendering');
  return <Join />;
});

const ConsentWrapper: React.FC = React.memo(function ConsentWrapper() {
  console.log('📝 ConsentWrapper: Rendering');  
  return <Consent />;
});

const DiscoveryWrapper: React.FC = React.memo(function DiscoveryWrapper() {
  console.log('🔍 DiscoveryWrapper: Rendering');
  return <Discovery />;
});

const MatchesWrapper: React.FC = React.memo(function MatchesWrapper() {
  console.log('💕 MatchesWrapper: Rendering');
  return <Matches />;
});

const ProfileWrapper: React.FC = React.memo(function ProfileWrapper() {
  console.log('👤 ProfileWrapper: Rendering');
  return <Profile />;
});

const ChatWrapper: React.FC = React.memo(function ChatWrapper() {
  console.log('💬 ChatWrapper: Rendering');
  return <Chat />;
});

export const UnifiedPageContainer: React.FC = React.memo(() => {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentPage: 'home',
    params: {},
    history: []
  });
  
  // Track page visibility for conditional listener management
  const pageVisibilityRef = useRef<Set<NavigationPage>>(new Set(['home']));

  // Track if user has completed consent (has active session)
  const [hasActiveSession, setHasActiveSession] = useState(false);

  // Page registry for lazy mounting - session pages only mount after consent
  const [pageRegistry, setPageRegistry] = useState<PageRegistry>({
    home: { mounted: true, component: HomeWrapper },
    join: { mounted: false, component: null },
    consent: { mounted: false, component: null },
    discovery: { mounted: false, component: null }, // Mount after consent
    matches: { mounted: false, component: null },   // Mount after consent  
    profile: { mounted: false, component: null },   // Mount after consent
    chat: { mounted: false, component: null }       // Mount after consent
  });

  const screenWidth = Dimensions.get('window').width;

  // Animated values for each page
  const homeTranslateX = useRef(new Animated.Value(0)).current;
  const joinTranslateX = useRef(new Animated.Value(screenWidth)).current;
  const consentTranslateX = useRef(new Animated.Value(screenWidth)).current;
  const discoveryTranslateX = useRef(new Animated.Value(screenWidth)).current;
  const matchesTranslateX = useRef(new Animated.Value(screenWidth)).current;
  const profileTranslateX = useRef(new Animated.Value(screenWidth)).current;
  const chatTranslateX = useRef(new Animated.Value(screenWidth)).current;

  // Subscribe to navigation state changes
  useEffect(() => {
    console.log('🚀 UnifiedPageContainer: Subscribing to navigation state');
    
    const unsubscribe = unifiedNavigator.subscribe(async (state: NavigationState) => {
      console.log('🚀 UnifiedPageContainer: Navigation state changed:', state.currentPage);
      
      // Check for active session when navigating to session-required pages
      if (['discovery', 'matches', 'profile', 'chat'].includes(state.currentPage) && !hasActiveSession) {
        const { AsyncStorageUtils } = await import('../asyncStorageUtils');
        const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
        const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
        
        if (sessionId && eventId) {
          console.log('🚀 UnifiedPageContainer: Active session detected, enabling session pages');
          setHasActiveSession(true);
          
          // Mount all session pages now that we have an active session
          setPageRegistry(prev => ({
            ...prev,
            discovery: { mounted: true, component: DiscoveryWrapper },
            matches: { mounted: true, component: MatchesWrapper },
            profile: { mounted: true, component: ProfileWrapper },
            chat: { mounted: true, component: ChatWrapper }
          }));
        }
      }
      
      // Clear session pages when navigating back to home (user left event)
      if (state.currentPage === 'home' && hasActiveSession) {
        const { AsyncStorageUtils } = await import('../asyncStorageUtils');
        const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
        
        if (!sessionId) {
          console.log('🚀 UnifiedPageContainer: No active session, clearing session pages');
          setHasActiveSession(false);
          
          // Clear session pages
          setPageRegistry(prev => ({
            ...prev,
            discovery: { mounted: false, component: null },
            matches: { mounted: false, component: null },
            profile: { mounted: false, component: null },
            chat: { mounted: false, component: null }
          }));
        }
      }
      
      // Update page visibility tracking for listener management
      const previousPage = navigationState.currentPage;
      pageVisibilityRef.current.clear();
      pageVisibilityRef.current.add(state.currentPage);
      
      // Emit visibility change event for conditional listener cleanup
      if (previousPage !== state.currentPage) {
        // Use cross-page event bus for React Native compatibility
        crossPageEventBus.emit('navigation:request', {
          targetPage: state.currentPage,
          params: state.params
        });
        
        // Log for debugging
        console.log('Page visibility changed:', {
          currentPage: state.currentPage,
          previousPage,
          visiblePages: Array.from(pageVisibilityRef.current)
        });
      }
      
      setNavigationState(state);
      
      // Mount target page if needed, then animate
      mountPageIfNeeded(state.currentPage).then(() => {
        animateToPage(state.currentPage);
      });
    });

    return unsubscribe;
  }, []);

  // Lazy mount pages on first visit
  const mountPageIfNeeded = async (pageId: NavigationPage): Promise<void> => {
    if (pageRegistry[pageId].mounted) {
      return; // Already mounted
    }

    console.log(`🏭 UnifiedPageContainer: Lazy mounting ${pageId}`);

    let component: React.ComponentType<any>;
    
    switch (pageId) {
      case 'home':
        component = HomeWrapper;
        break;
      case 'join':
        component = JoinWrapper;
        break;
      case 'consent':
        component = ConsentWrapper;
        break;
      case 'discovery':
        component = DiscoveryWrapper;
        break;
      case 'matches':
        component = MatchesWrapper;
        break;
      case 'profile':
        component = ProfileWrapper;
        break;
      case 'chat':
        component = ChatWrapper;
        break;
      default:
        console.warn(`🏭 UnifiedPageContainer: Unknown page ${pageId}`);
        return;
    }
    
    setPageRegistry(prev => ({
      ...prev,
      [pageId]: { mounted: true, component }
    }));
  };

  // Animate to target page
  const animateToPage = (targetPage: NavigationPage): void => {
    const pageAnimations = {
      home: homeTranslateX,
      join: joinTranslateX,
      consent: consentTranslateX,
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
          duration: 0, // Instant transitions for Instagram-like feel
          useNativeDriver: true,
        })
      );
    });

    // Run all animations in parallel
    Animated.parallel(animations).start();
  };

  // Render a page if it's mounted
  const renderPage = (
    pageId: NavigationPage,
    animatedValue: Animated.Value,
    key: string
  ) => {
    const pageData = pageRegistry[pageId];
    
    if (!pageData.mounted || !pageData.component) {
      return null;
    }

    const PageComponent = pageData.component;

    return (
      <Animated.View
        key={key}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          transform: [{ translateX: animatedValue }],
        }}
      >
        <PageComponent />
      </Animated.View>
    );
  };

  return (
    <NavigationErrorBoundary 
      fallbackPage="home"
      onError={(error, errorInfo) => {
        console.error('UnifiedPageContainer: Navigation error caught by boundary:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        });
      }}
    >
      <View style={{ flex: 1, position: 'relative' }}>
        {renderPage('home', homeTranslateX, 'home')}
        {renderPage('join', joinTranslateX, 'join')}
        {renderPage('consent', consentTranslateX, 'consent')}
        {renderPage('discovery', discoveryTranslateX, 'discovery')}
        {renderPage('matches', matchesTranslateX, 'matches')}
        {renderPage('profile', profileTranslateX, 'profile')}
        {renderPage('chat', chatTranslateX, 'chat')}
      </View>
    </NavigationErrorBoundary>
  );
});

UnifiedPageContainer.displayName = 'UnifiedPageContainer';