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

// Import all pages
import Home from '../../app/home';
import Join from '../../app/join';
import Consent from '../../app/consent';
import Discovery from '../../app/discovery';
import Matches from '../../app/matches';
import Profile from '../../app/profile';

// Removed ProfileImageCacheProvider - using develop branch modal pattern

interface PageRegistry {
  [key: string]: {
    mounted: boolean;
    component: React.ComponentType<any> | null;
  };
}

// Page wrapper components - memoized for performance
const HomeWrapper: React.FC = React.memo(() => {
  console.log('🏠 HomeWrapper: Rendering');
  return <Home />;
});

const JoinWrapper: React.FC = React.memo(() => {
  console.log('🔗 JoinWrapper: Rendering');
  return <Join />;
});

const ConsentWrapper: React.FC = React.memo(() => {
  console.log('📝 ConsentWrapper: Rendering');  
  return <Consent />;
});

const DiscoveryWrapper: React.FC = React.memo(() => {
  console.log('🔍 DiscoveryWrapper: Rendering');
  return <Discovery />;
});

const MatchesWrapper: React.FC = React.memo(() => {
  console.log('💕 MatchesWrapper: Rendering');
  return <Matches />;
});

const ProfileWrapper: React.FC = React.memo(() => {
  console.log('👤 ProfileWrapper: Rendering');
  return <Profile />;
});

const ChatWrapper: React.FC = React.memo(() => {
  console.log('💬 ChatWrapper: Rendering');
  // Chat will be implemented later - for now return null
  return null;
});

export const UnifiedPageContainer: React.FC = React.memo(() => {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentPage: 'home',
    params: {},
    history: []
  });

  // Page registry for lazy mounting
  const [pageRegistry, setPageRegistry] = useState<PageRegistry>({
    home: { mounted: true, component: HomeWrapper },
    join: { mounted: false, component: null },
    consent: { mounted: false, component: null },
    discovery: { mounted: true, component: DiscoveryWrapper }, // Keep mounted for instant navigation
    matches: { mounted: true, component: MatchesWrapper },     // Keep mounted for instant navigation  
    profile: { mounted: true, component: ProfileWrapper },     // Keep mounted for instant navigation
    chat: { mounted: false, component: null }
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
    
    const unsubscribe = unifiedNavigator.subscribe((state: NavigationState) => {
      console.log('🚀 UnifiedPageContainer: Navigation state changed:', state.currentPage);
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
    <View style={{ flex: 1, position: 'relative' }}>
      {renderPage('home', homeTranslateX, 'home')}
      {renderPage('join', joinTranslateX, 'join')}
      {renderPage('consent', consentTranslateX, 'consent')}
      {renderPage('discovery', discoveryTranslateX, 'discovery')}
      {renderPage('matches', matchesTranslateX, 'matches')}
      {renderPage('profile', profileTranslateX, 'profile')}
      {renderPage('chat', chatTranslateX, 'chat')}
    </View>
  );
});

UnifiedPageContainer.displayName = 'UnifiedPageContainer';