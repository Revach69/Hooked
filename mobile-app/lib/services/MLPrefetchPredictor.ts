/**
 * MLPrefetchPredictor - Machine learning-based prefetching for user behavior prediction
 * Uses simple statistical models to predict user navigation patterns
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrefetchManager } from '../cache/PrefetchManager';
import { NetworkAwareLoader } from './NetworkAwareLoader';

interface UserAction {
  timestamp: number;
  route: string;
  action: 'navigate' | 'like' | 'skip' | 'match' | 'message' | 'view_profile' | 'scroll' | 'back';
  eventId: string;
  sessionId: string;
  metadata?: {
    scrollPosition?: number;
    timeSpent?: number;
    profileId?: string;
    swipeDirection?: 'left' | 'right';
    messageLength?: number;
  };
}

interface NavigationPattern {
  from: string;
  to: string;
  probability: number;
  avgTimeSpent: number;
  count: number;
}

interface UserBehaviorModel {
  navigationPatterns: NavigationPattern[];
  userPreferences: {
    avgSessionDuration: number;
    preferredRoutes: string[];
    swipeSpeed: number; // swipes per minute
    messageFrequency: number; // messages per session
    profileViewTime: number; // average time viewing profiles
  };
  temporalPatterns: {
    hourlyActivity: number[]; // 24 hours
    weeklyActivity: number[]; // 7 days
  };
  lastUpdated: number;
}

interface PrefetchPrediction {
  route: string;
  confidence: number; // 0-1
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number; // seconds until likely navigation
  resources: string[]; // what to prefetch
}

class MLPrefetchPredictorService {
  private userActions: UserAction[] = [];
  private userModel: UserBehaviorModel | null = null;
  private currentSession: UserAction[] = [];
  private isLearning = true;
  private readonly MAX_ACTIONS_STORED = 1000;
  private readonly MIN_ACTIONS_FOR_PREDICTION = 10;
  private learningTimer: any | null = null;

  /**
   * Initialize the ML predictor
   */
  async initialize(): Promise<void> {
    try {
      // Load stored user actions and model
      await this.loadUserData();
      
      // Start continuous learning
      this.startContinuousLearning();
      
      console.log('MLPrefetchPredictor: Initialized with', this.userActions.length, 'actions');
    } catch (error) {
      console.warn('MLPrefetchPredictor: Failed to initialize:', error);
    }
  }

  /**
   * Record user action for learning
   */
  recordAction(
    route: string,
    action: UserAction['action'],
    eventId: string,
    sessionId: string,
    metadata?: UserAction['metadata']
  ): void {
    const userAction: UserAction = {
      timestamp: Date.now(),
      route,
      action,
      eventId,
      sessionId,
      metadata
    };

    // Add to current session and overall history
    this.currentSession.push(userAction);
    this.userActions.push(userAction);

    // Limit stored actions to prevent memory issues
    if (this.userActions.length > this.MAX_ACTIONS_STORED) {
      this.userActions = this.userActions.slice(-this.MAX_ACTIONS_STORED);
    }

    // Immediate learning for high-confidence patterns
    if (this.currentSession.length >= 3) {
      this.updateModelIncremental();
    }
  }

  /**
   * Predict next likely navigation and prefetch accordingly
   */
  async predictAndPrefetch(
    currentRoute: string,
    eventId: string,
    sessionId: string
  ): Promise<PrefetchPrediction[]> {
    if (!this.isReadyForPrediction()) {
      return [];
    }

    try {
      const predictions = this.generatePredictions(currentRoute, eventId);
      
      // Filter predictions based on network conditions
      const networkStrategy = NetworkAwareLoader.getCurrentStrategy();
      const filteredPredictions = predictions.filter(pred => 
        networkStrategy.prefetchEnabled && pred.confidence > 0.3
      );

      // Execute prefetching for high-confidence predictions
      for (const prediction of filteredPredictions) {
        if (prediction.confidence > 0.6) {
          await this.executePrefetch(prediction, eventId, sessionId);
        }
      }

      return filteredPredictions;
    } catch (error) {
      console.warn('MLPrefetchPredictor: Prediction failed:', error);
      return [];
    }
  }

  /**
   * Generate predictions based on user model
   */
  private generatePredictions(
    currentRoute: string,
    eventId: string
  ): PrefetchPrediction[] {
    if (!this.userModel) return [];

    const predictions: PrefetchPrediction[] = [];
    const currentTime = new Date();
    const hourOfDay = currentTime.getHours();
    const dayOfWeek = currentTime.getDay();

    // Navigation pattern predictions
    const navPatterns = this.userModel.navigationPatterns
      .filter(pattern => pattern.from === currentRoute)
      .sort((a, b) => b.probability - a.probability);

    for (const pattern of navPatterns.slice(0, 3)) { // Top 3 patterns
      if (pattern.probability < 0.1) continue;

      // Adjust confidence based on temporal patterns
      const temporalConfidence = this.getTemporalConfidence(hourOfDay, dayOfWeek);
      const finalConfidence = pattern.probability * temporalConfidence;

      if (finalConfidence > 0.2) {
        predictions.push({
          route: pattern.to,
          confidence: finalConfidence,
          priority: finalConfidence > 0.7 ? 'high' : finalConfidence > 0.4 ? 'medium' : 'low',
          estimatedTime: pattern.avgTimeSpent,
          resources: this.getResourcesForRoute(pattern.to, eventId)
        });
      }
    }

    // Contextual predictions based on current session
    const contextualPredictions = this.generateContextualPredictions(currentRoute);
    predictions.push(...contextualPredictions);

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate contextual predictions based on current session behavior
   */
  private generateContextualPredictions(currentRoute: string): PrefetchPrediction[] {
    const predictions: PrefetchPrediction[] = [];
    const sessionActions = this.currentSession.slice(-5); // Last 5 actions

    // Analyze session patterns
    const actionSequence = sessionActions.map(a => a.action);

    // Discovery page patterns
    if (currentRoute === '/discovery') {
      const likeCount = actionSequence.filter(a => a === 'like').length;
      const skipCount = actionSequence.filter(a => a === 'skip').length;
      
      if (likeCount > skipCount && likeCount >= 2) {
        // User is actively liking - predict matches page
        predictions.push({
          route: '/matches',
          confidence: 0.7,
          priority: 'high',
          estimatedTime: 30,
          resources: ['matches_list', 'recent_messages']
        });
      }
    }

    // Matches page patterns
    if (currentRoute === '/matches') {
      const profileViews = actionSequence.filter(a => a === 'view_profile').length;
      if (profileViews >= 1) {
        // User viewing profiles - predict chat
        predictions.push({
          route: '/chat',
          confidence: 0.6,
          priority: 'medium',
          estimatedTime: 20,
          resources: ['chat_messages', 'profile_data']
        });
      }
    }

    return predictions;
  }

  /**
   * Execute prefetching for a prediction
   */
  private async executePrefetch(
    prediction: PrefetchPrediction,
    eventId: string,
    sessionId: string
  ): Promise<void> {
    console.log(`MLPrefetchPredictor: Prefetching for ${prediction.route} (confidence: ${prediction.confidence.toFixed(2)})`);

    try {
      // Use PrefetchManager with predicted priority
      await PrefetchManager.prefetchForRoute(prediction.route, eventId, sessionId);

      // Record successful prefetch for learning
      this.recordAction(
        prediction.route,
        'navigate', // Predicted navigation
        eventId,
        sessionId,
        { timeSpent: prediction.estimatedTime }
      );
    } catch (error) {
      console.warn('MLPrefetchPredictor: Failed to execute prefetch:', error);
    }
  }

  /**
   * Get resources to prefetch for a route
   */
  private getResourcesForRoute(route: string, eventId: string): string[] {
    const resourceMap: Record<string, string[]> = {
      '/discovery': [`discovery_profiles_${eventId}`, `event_data_${eventId}`],
      '/matches': [`matches_list_${eventId}`, 'recent_messages'],
      '/profile': [`user_profile`, `discovery_profiles_${eventId}`],
      '/chat': ['chat_messages', 'profile_data']
    };

    return resourceMap[route] || [];
  }

  /**
   * Update model incrementally with new data
   */
  private updateModelIncremental(): void {
    if (!this.isReadyForPrediction()) return;

    try {
      // Update navigation patterns
      this.updateNavigationPatterns();
      
      // Update user preferences
      this.updateUserPreferences();
      
      // Update temporal patterns
      this.updateTemporalPatterns();

      // Save updated model
      this.saveUserModel();
    } catch (error) {
      console.warn('MLPrefetchPredictor: Failed to update model:', error);
    }
  }

  /**
   * Update navigation patterns from user actions
   */
  private updateNavigationPatterns(): void {
    if (!this.userModel) {
      this.userModel = this.createEmptyModel();
    }

    const patterns = new Map<string, NavigationPattern>();

    // Analyze sequential navigation actions
    for (let i = 0; i < this.userActions.length - 1; i++) {
      const current = this.userActions[i];
      const next = this.userActions[i + 1];

      if (current.action === 'navigate' || next.action === 'navigate') {
        const key = `${current.route}->${next.route}`;
        
        if (!patterns.has(key)) {
          patterns.set(key, {
            from: current.route,
            to: next.route,
            probability: 0,
            avgTimeSpent: 0,
            count: 0
          });
        }

        const pattern = patterns.get(key)!;
        pattern.count++;
        
        // Calculate time spent
        const timeSpent = (next.timestamp - current.timestamp) / 1000;
        pattern.avgTimeSpent = (pattern.avgTimeSpent * (pattern.count - 1) + timeSpent) / pattern.count;
      }
    }

    // Calculate probabilities
    const fromCounts = new Map<string, number>();
    for (const pattern of patterns.values()) {
      fromCounts.set(pattern.from, (fromCounts.get(pattern.from) || 0) + pattern.count);
    }

    for (const pattern of patterns.values()) {
      const totalFromRoute = fromCounts.get(pattern.from) || 1;
      pattern.probability = pattern.count / totalFromRoute;
    }

    this.userModel.navigationPatterns = Array.from(patterns.values());
  }

  /**
   * Update user preferences from actions
   */
  private updateUserPreferences(): void {
    if (!this.userModel) return;

    const recentActions = this.userActions.slice(-100); // Last 100 actions
    const sessions = this.groupActionsBySessions(recentActions);

    // Calculate average session duration
    const sessionDurations = sessions.map(session => {
      const start = session[0].timestamp;
      const end = session[session.length - 1].timestamp;
      return (end - start) / 1000 / 60; // minutes
    });
    
    this.userModel.userPreferences.avgSessionDuration = 
      sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length || 0;

    // Calculate swipe speed
    const swipeActions = recentActions.filter(a => a.action === 'like' || a.action === 'skip');
    if (swipeActions.length >= 2) {
      const totalTime = (swipeActions[swipeActions.length - 1].timestamp - swipeActions[0].timestamp) / 1000 / 60;
      this.userModel.userPreferences.swipeSpeed = swipeActions.length / totalTime;
    }

    // Calculate message frequency
    const messageActions = recentActions.filter(a => a.action === 'message');
    this.userModel.userPreferences.messageFrequency = messageActions.length / sessions.length;

    // Calculate preferred routes
    const routeCounts = new Map<string, number>();
    for (const action of recentActions) {
      routeCounts.set(action.route, (routeCounts.get(action.route) || 0) + 1);
    }
    
    this.userModel.userPreferences.preferredRoutes = Array.from(routeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([route]) => route);
  }

  /**
   * Update temporal patterns
   */
  private updateTemporalPatterns(): void {
    if (!this.userModel) return;

    const hourlyActivity = new Array(24).fill(0);
    const weeklyActivity = new Array(7).fill(0);

    for (const action of this.userActions) {
      const date = new Date(action.timestamp);
      hourlyActivity[date.getHours()]++;
      weeklyActivity[date.getDay()]++;
    }

    this.userModel.temporalPatterns.hourlyActivity = hourlyActivity;
    this.userModel.temporalPatterns.weeklyActivity = weeklyActivity;
  }

  /**
   * Get temporal confidence modifier
   */
  private getTemporalConfidence(hour: number, day: number): number {
    if (!this.userModel) return 1;

    const hourlyActivity = this.userModel.temporalPatterns.hourlyActivity;
    const weeklyActivity = this.userModel.temporalPatterns.weeklyActivity;

    const maxHourly = Math.max(...hourlyActivity);
    const maxWeekly = Math.max(...weeklyActivity);

    const hourConfidence = maxHourly > 0 ? hourlyActivity[hour] / maxHourly : 0.5;
    const dayConfidence = maxWeekly > 0 ? weeklyActivity[day] / maxWeekly : 0.5;

    return (hourConfidence + dayConfidence) / 2;
  }

  /**
   * Group actions by sessions (gap > 30 minutes = new session)
   */
  private groupActionsBySessions(actions: UserAction[]): UserAction[][] {
    if (actions.length === 0) return [];

    const sessions: UserAction[][] = [];
    let currentSession: UserAction[] = [actions[0]];

    for (let i = 1; i < actions.length; i++) {
      const timeSinceLastAction = actions[i].timestamp - actions[i - 1].timestamp;
      
      if (timeSinceLastAction > 30 * 60 * 1000) { // 30 minutes
        sessions.push(currentSession);
        currentSession = [actions[i]];
      } else {
        currentSession.push(actions[i]);
      }
    }

    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }

    return sessions;
  }

  /**
   * Check if we have enough data for predictions
   */
  private isReadyForPrediction(): boolean {
    return this.isLearning && this.userActions.length >= this.MIN_ACTIONS_FOR_PREDICTION;
  }

  /**
   * Create empty model structure
   */
  private createEmptyModel(): UserBehaviorModel {
    return {
      navigationPatterns: [],
      userPreferences: {
        avgSessionDuration: 0,
        preferredRoutes: [],
        swipeSpeed: 0,
        messageFrequency: 0,
        profileViewTime: 0
      },
      temporalPatterns: {
        hourlyActivity: new Array(24).fill(0),
        weeklyActivity: new Array(7).fill(0)
      },
      lastUpdated: Date.now()
    };
  }

  /**
   * Start continuous learning timer
   */
  private startContinuousLearning(): void {
    if (this.learningTimer) {
      clearInterval(this.learningTimer);
    }

    // Update model every 2 minutes
    this.learningTimer = setInterval(() => {
      if (this.currentSession.length > 0) {
        this.updateModelIncremental();
      }
    }, 2 * 60 * 1000);
  }

  /**
   * Load user data from storage
   */
  private async loadUserData(): Promise<void> {
    try {
      const [actionsData, modelData] = await Promise.all([
        AsyncStorage.getItem('ml_user_actions'),
        AsyncStorage.getItem('ml_user_model')
      ]);

      if (actionsData) {
        this.userActions = JSON.parse(actionsData).slice(-this.MAX_ACTIONS_STORED);
      }

      if (modelData) {
        this.userModel = JSON.parse(modelData);
      }
    } catch (error) {
      console.warn('MLPrefetchPredictor: Failed to load user data:', error);
    }
  }

  /**
   * Save user model to storage
   */
  private async saveUserModel(): Promise<void> {
    if (!this.userModel) return;

    try {
      this.userModel.lastUpdated = Date.now();
      
      await Promise.all([
        AsyncStorage.setItem('ml_user_actions', JSON.stringify(this.userActions.slice(-this.MAX_ACTIONS_STORED))),
        AsyncStorage.setItem('ml_user_model', JSON.stringify(this.userModel))
      ]);
    } catch (error) {
      console.warn('MLPrefetchPredictor: Failed to save user model:', error);
    }
  }

  /**
   * End current session
   */
  endSession(): void {
    if (this.currentSession.length > 0) {
      this.updateModelIncremental();
      this.currentSession = [];
    }
  }

  /**
   * Get model statistics
   */
  getModelStats() {
    return {
      totalActions: this.userActions.length,
      sessionActions: this.currentSession.length,
      isReady: this.isReadyForPrediction(),
      model: this.userModel,
      patterns: this.userModel?.navigationPatterns.length || 0,
      lastUpdated: this.userModel?.lastUpdated
    };
  }

  /**
   * Clear all data
   */
  async clearData(): Promise<void> {
    this.userActions = [];
    this.currentSession = [];
    this.userModel = null;
    
    await Promise.all([
      AsyncStorage.removeItem('ml_user_actions'),
      AsyncStorage.removeItem('ml_user_model')
    ]);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.learningTimer) {
      clearInterval(this.learningTimer);
      this.learningTimer = null;
    }
    
    this.endSession();
    this.isLearning = false;
  }
}

export const MLPrefetchPredictor = new MLPrefetchPredictorService();

/**
 * React Hook for ML predictions
 */
import { useState, useEffect } from 'react';

export const useMLPredictions = (currentRoute: string, eventId: string, sessionId: string) => {
  const [predictions, setPredictions] = useState<PrefetchPrediction[]>([]);
  const [modelStats, setModelStats] = useState(MLPrefetchPredictor.getModelStats());

  useEffect(() => {
    const generatePredictions = async () => {
      const newPredictions = await MLPrefetchPredictor.predictAndPrefetch(
        currentRoute,
        eventId,
        sessionId
      );
      setPredictions(newPredictions);
      setModelStats(MLPrefetchPredictor.getModelStats());
    };

    generatePredictions();

    // Update predictions every 30 seconds while on route
    const interval = setInterval(generatePredictions, 30000);

    return () => clearInterval(interval);
  }, [currentRoute, eventId, sessionId]);

  const recordAction = (
    action: UserAction['action'],
    metadata?: UserAction['metadata']
  ) => {
    MLPrefetchPredictor.recordAction(currentRoute, action, eventId, sessionId, metadata);
  };

  return {
    predictions,
    modelStats,
    recordAction,
    isReady: modelStats.isReady
  };
};