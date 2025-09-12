/**
 * PersistentNavigator - Navigation utility for original pages
 * 
 * Provides router-like API that integrates with persistent navigation system
 * Original pages can use this instead of expo-router for seamless integration
 */

import { crossPageEventBus } from './CrossPageEventBus';

export class PersistentNavigator {
  private static instance: PersistentNavigator;
  
  private constructor() {}
  
  static getInstance(): PersistentNavigator {
    if (!PersistentNavigator.instance) {
      PersistentNavigator.instance = new PersistentNavigator();
    }
    return PersistentNavigator.instance;
  }
  
  // Router-compatible API for easy replacement
  push(route: string, params?: any) {
    console.log('🧭 PersistentNavigator: push', route, params);
    
    // Handle special routes that should use expo-router instead of persistent navigation
    const shouldExitPersistentNavigation = [
      '/home',      // Logout flow
      '/admin',     // Admin pages  
      '/survey',    // Survey pages
      '/adminLogin', // Admin login
      '/join'       // Join event flow
    ];
    
    const shouldExit = shouldExitPersistentNavigation.some(exitRoute => route.startsWith(exitRoute));
    
    if (shouldExit) {
      console.log('🧭 PersistentNavigator: Exit route detected:', route, '- using expo router');
      // Use the original expo router for these routes
      const { router: expoRouter } = require('expo-router');
      expoRouter.push(route, params);
      return;
    }
    
    // Map expo-router routes to persistent page IDs
    const routeMap: Record<string, string> = {
      '/matches': 'matches',
      '/profile': 'profile',
      '/discovery': 'discovery'
    };
    
    // Handle chat routes (dynamic and query params)
    if (route.startsWith('/chat')) {
      let chatId = '';
      let chatParams = { ...params };
      
      // Handle /chat/[id] format
      if (route.startsWith('/chat/')) {
        chatId = route.replace('/chat/', '');
      }
      // Handle /chat?matchId=xxx&matchName=yyy format
      else if (route.includes('?')) {
        const [basePath, queryString] = route.split('?');
        const urlParams = new URLSearchParams(queryString);
        chatId = urlParams.get('matchId') || '';
        chatParams = {
          ...chatParams,
          matchName: urlParams.get('matchName'),
          conversationId: chatId
        };
      }
      
      crossPageEventBus.emit('navigation:request', { 
        targetPage: 'chat', 
        params: { chatId, ...chatParams }
      });
      return;
    }
    
    const targetPage = routeMap[route];
    if (targetPage) {
      crossPageEventBus.emit('navigation:request', { targetPage, params });
    } else {
      console.warn('🧭 PersistentNavigator: Unknown route:', route);
      // Fallback to discovery
      crossPageEventBus.emit('navigation:request', { targetPage: 'discovery' });
    }
  }
  
  replace(route: string, params?: any) {
    console.log('🧭 PersistentNavigator: replace', route, params);
    
    // Handle special routes that should use expo-router instead of persistent navigation
    const shouldExitPersistentNavigation = [
      '/home',      // Logout flow
      '/admin',     // Admin pages  
      '/survey',    // Survey pages
      '/adminLogin', // Admin login
      '/join'       // Join event flow
    ];
    
    const shouldExit = shouldExitPersistentNavigation.some(exitRoute => route.startsWith(exitRoute));
    
    if (shouldExit) {
      console.log('🧭 PersistentNavigator: Exit route detected for replace:', route, '- using expo router');
      // Use the original expo router for these routes
      const { router: expoRouter } = require('expo-router');
      expoRouter.replace(route, params);
      return;
    }
    
    // For other routes, replace behaves the same as push in persistent navigation
    this.push(route, params);
  }
  
  back() {
    // In persistent navigation, "back" typically means go to discovery
    console.log('🧭 PersistentNavigator: back to discovery');
    crossPageEventBus.emit('navigation:request', { targetPage: 'discovery' });
  }
  
  // Additional utility methods
  goToMatches() {
    this.push('/matches');
  }
  
  goToProfile() {
    this.push('/profile');
  }
  
  goToDiscovery() {
    this.push('/discovery');
  }
  
  goToChat(chatId: string, params?: any) {
    this.push(`/chat/${chatId}`, params);
  }
}

// Export singleton instance for easy use
export const persistentNavigator = PersistentNavigator.getInstance();

// Export router-compatible interface for drop-in replacement
export const persistentRouter = {
  push: persistentNavigator.push.bind(persistentNavigator),
  replace: persistentNavigator.replace.bind(persistentNavigator),
  back: persistentNavigator.back.bind(persistentNavigator),
};