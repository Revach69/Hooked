/**
 * UnifiedNavigator - Single navigation system for the entire app
 * 
 * Replaces the dual expo-router/persistent system with a unified approach
 * Handles all pages: home, join, consent, discovery, matches, profile
 * 
 * Features:
 * - Session-aware routing
 * - Deep linking support  
 * - Transform-based page switching
 * - Centralized navigation state
 */

import { AsyncStorageUtils } from '../asyncStorageUtils';

export type NavigationPage = 
  | 'home' 
  | 'join' 
  | 'consent' 
  | 'discovery' 
  | 'matches' 
  | 'profile' 
  | 'chat'
  | 'adminLogin';

export interface NavigationParams {
  [key: string]: string | number | boolean | undefined;
}

export interface NavigationState {
  currentPage: NavigationPage;
  params: NavigationParams;
  history: Array<{ page: NavigationPage; params: NavigationParams }>;
}

class UnifiedNavigatorClass {
  private listeners: Set<(state: NavigationState) => void> = new Set();
  private state: NavigationState = {
    currentPage: 'home',
    params: {},
    history: []
  };

  // Initialize navigation system
  async initialize(): Promise<NavigationPage> {
    console.log('🚀 UnifiedNavigator: Initializing...');
    
    // Check for deep link parameters first
    const deepLinkPage = await this.checkDeepLink();
    if (deepLinkPage) {
      console.log('🚀 UnifiedNavigator: Deep link detected:', deepLinkPage);
      return deepLinkPage;
    }

    // Determine initial page based on session state
    const initialPage = await this.determineInitialPage();
    console.log('🚀 UnifiedNavigator: Initial page determined:', initialPage);
    
    this.setState({ 
      currentPage: initialPage, 
      params: {},
      history: [{ page: initialPage, params: {} }]
    });

    return initialPage;
  }

  // Determine initial page based on session/app state
  private async determineInitialPage(): Promise<NavigationPage> {
    try {
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
      const isOnConsentPage = await AsyncStorageUtils.getItem<boolean>('isOnConsentPage');

      // If on consent page, stay there
      if (isOnConsentPage) {
        return 'consent';
      }

      // If has session data, check if event and profile still exist
      if (eventId && sessionId) {
        try {
          const { EventAPI, EventProfileAPI } = await import('../firebaseApi');
          const { BackgroundDataPreloader } = await import('../services/BackgroundDataPreloader');
          const { GlobalDataCache } = await import('../cache/GlobalDataCache');
          
          // First check if event still exists
          const events = await EventAPI.filter({ id: eventId });
          
          if (events.length === 0) {
            // Event expired or deleted - clear everything
            console.log('🚀 UnifiedNavigator: Event expired/deleted, clearing session data');
            
            // Clear preloaded data
            BackgroundDataPreloader.clearPreloadedData();
            GlobalDataCache.clearAll();
            
            // Clear AsyncStorage
            await AsyncStorageUtils.multiRemove([
              'currentEventId',
              'currentSessionId',
              'currentEventCode',
              'currentProfileColor',
              'currentProfilePhotoUrl',
              'currentEventCountry',
              'currentEventData',
              'isOnConsentPage'
            ]);
            return 'home';
          }
          
          // Event exists, now check profile
          const profiles = await EventProfileAPI.filter({
            session_id: sessionId,
            event_id: eventId
          });

          if (profiles && profiles.length > 0) {
            // Has valid session and profile - go to discovery
            return 'discovery';
          } else {
            // Event exists but profile doesn't - clear invalid session
            console.log('🚀 UnifiedNavigator: Profile not found for existing event, clearing session');
            
            // Clear preloaded data
            BackgroundDataPreloader.clearPreloadedData();
            GlobalDataCache.clearAll();
            
            await AsyncStorageUtils.multiRemove([
              'currentEventId',
              'currentSessionId',
              'currentEventCode',
              'currentProfileColor',
              'currentProfilePhotoUrl',
              'currentEventCountry',
              'currentEventData',
              'isOnConsentPage'
            ]);
            return 'home';
          }
        } catch (profileError) {
          console.warn('🚀 UnifiedNavigator: Profile validation failed:', profileError);
          // On error, go to home to be safe
          return 'home';
        }
      }

      // Default to home page
      return 'home';
    } catch (error) {
      console.error('🚀 UnifiedNavigator: Error determining initial page:', error);
      return 'home';
    }
  }

  // Check for deep link parameters
  private async checkDeepLink(): Promise<NavigationPage | null> {
    try {
      const Linking = await import('expo-linking');
      const url = await Linking.getInitialURL();
      
      if (url) {
        console.log('🚀 UnifiedNavigator: Processing initial URL:', url);
        
        // Handle https://hooked-app.com/join-instant?code=XXXXX
        if (url.includes('hooked-app.com/join-instant')) {
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          
          if (code) {
            console.log('🚀 UnifiedNavigator: Extracted code from web URL:', code);
            this.setState({
              currentPage: 'join',
              params: { code: code.toUpperCase() },
              history: [{ page: 'join', params: { code: code.toUpperCase() } }]
            });
            return 'join';
          }
        }
        
        // Handle hooked://join?code=XXXXX (existing format)
        const { path, queryParams } = Linking.parse(url);
        if (path === 'join' && queryParams?.code) {
          console.log('🚀 UnifiedNavigator: Extracted code from hooked:// URL:', queryParams.code);
          this.setState({
            currentPage: 'join',
            params: { code: queryParams.code as string },
            history: [{ page: 'join', params: { code: queryParams.code as string } }]
          });
          return 'join';
        }
      }
      
      return null;
    } catch (error) {
      console.warn('🚀 UnifiedNavigator: Deep link check failed:', error);
      return null;
    }
  }

  // Navigate to a page
  async navigate(page: NavigationPage, params: NavigationParams = {}, replace: boolean = false): Promise<void> {
    console.log(`🚀 UnifiedNavigator: Navigate to ${page}`, params, replace ? '(replace)' : '');

    // Validate navigation based on session state for protected pages
    const protectedPages: NavigationPage[] = ['discovery', 'matches', 'profile'];
    if (protectedPages.includes(page)) {
      const hasValidSession = await this.validateSession();
      if (!hasValidSession) {
        console.log('🚀 UnifiedNavigator: Invalid session for protected page, redirecting to home');
        return this.navigate('home', {}, true);
      }
    }

    // Update navigation state
    const newHistory = replace 
      ? [...this.state.history.slice(0, -1), { page, params }]
      : [...this.state.history, { page, params }];

    this.setState({
      currentPage: page,
      params,
      history: newHistory
    });
  }

  // Go back in navigation history
  async goBack(): Promise<void> {
    if (this.state.history.length <= 1) {
      console.log('🚀 UnifiedNavigator: No history to go back to');
      return;
    }

    const newHistory = this.state.history.slice(0, -1);
    const previousState = newHistory[newHistory.length - 1];

    this.setState({
      currentPage: previousState.page,
      params: previousState.params,
      history: newHistory
    });
  }

  // Validate current session
  private async validateSession(): Promise<boolean> {
    try {
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
      
      if (!eventId || !sessionId) {
        return false;
      }

      // Quick validation - could be enhanced with profile check if needed
      return true;
    } catch (error) {
      console.error('🚀 UnifiedNavigator: Session validation error:', error);
      return false;
    }
  }

  // Subscribe to navigation state changes
  subscribe(listener: (state: NavigationState) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state
    listener(this.state);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Get current navigation state
  getState(): NavigationState {
    return { ...this.state };
  }

  // Update state and notify listeners
  private setState(newState: Partial<NavigationState>): void {
    this.state = { ...this.state, ...newState };
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('🚀 UnifiedNavigator: Listener error:', error);
      }
    });
  }

  // Handle deep links when app is running
  handleDeepLink(url: string): void {
    try {
      console.log('🚀 UnifiedNavigator: Handling runtime deep link:', url);
      
      // Handle https://hooked-app.com/join-instant?code=XXXXX
      if (url.includes('hooked-app.com/join-instant')) {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        
        if (code) {
          console.log('🚀 UnifiedNavigator: Extracted code from runtime web URL:', code);
          this.navigate('join', { code: code.toUpperCase() }, true);
          return;
        }
      }
      
      // Handle hooked://join?code=XXXXX (existing format)
      const Linking = require('expo-linking');
      const { path, queryParams } = Linking.parse(url);
      
      if (path === 'join' && queryParams?.code) {
        console.log('🚀 UnifiedNavigator: Extracted code from runtime hooked:// URL:', queryParams.code);
        this.navigate('join', { code: queryParams.code as string }, true);
      }
    } catch (error) {
      console.error('🚀 UnifiedNavigator: Deep link handling error:', error);
    }
  }
}

// Export singleton instance
export const unifiedNavigator = new UnifiedNavigatorClass();

// Router-compatible API for easy migration from expo-router
export const router = {
  push: (href: string, params?: NavigationParams) => {
    const page = href.replace('/', '') as NavigationPage || 'home';
    return unifiedNavigator.navigate(page, params);
  },
  
  replace: (href: string, params?: NavigationParams) => {
    const page = href.replace('/', '') as NavigationPage || 'home';
    return unifiedNavigator.navigate(page, params, true);
  },
  
  back: () => unifiedNavigator.goBack(),
  
  // For compatibility with existing code
  canGoBack: () => unifiedNavigator.getState().history.length > 1
};