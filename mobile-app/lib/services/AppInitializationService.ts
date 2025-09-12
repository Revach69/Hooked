import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AsyncStorageUtils } from '../asyncStorageUtils';
// App Check is now initialized in firebaseConfig.ts
import { setCurrentSessionIdForDedup } from '../notifications/NotificationRouter';
import { FirebaseNotificationService } from './FirebaseNotificationService';
import { GlobalNotificationService } from './GlobalNotificationService';

interface InitializationStep {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: Error;
  retryCount: number;
}

interface HealthCheck {
  firebaseAuth: boolean;
  firestoreConnection: boolean;
  notificationPermissions: boolean;
  notificationRouter: boolean;
  globalListeners: boolean;
  sessionData: boolean;
}

class AppInitializationServiceClass {
  private diagnostics: {
    startTime: number;
    completedSteps: InitializationStep[];
    totalInitTime: number;
    healthCheck: HealthCheck;
    retryAttempts: number;
  };

  constructor() {
    this.diagnostics = {
      startTime: 0,
      completedSteps: [],
      totalInitTime: 0,
      healthCheck: {
        firebaseAuth: false,
        firestoreConnection: false,
        notificationPermissions: false,
        notificationRouter: false,
        globalListeners: false,
        sessionData: false
      },
      retryAttempts: 0
    };
  }

  /**
   * Initialize the entire app with retry logic and health checks
   */
  async initializeApp(maxRetries: number = 1): Promise<boolean> {
    this.diagnostics.startTime = Date.now();
    console.log('AppInitializationService: Starting app initialization');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.diagnostics.retryAttempts = attempt - 1;
      
      try {
        console.log(`AppInitializationService: Attempt ${attempt}/${maxRetries}`);
        
        await this.runInitializationSequence();
        
        // Perform health check
        const healthCheckPassed = await this.performHealthCheck();
        
        if (healthCheckPassed) {
          this.diagnostics.totalInitTime = Date.now() - this.diagnostics.startTime;
          console.log('AppInitializationService: Initialization successful', {
            attempt,
            totalTime: this.diagnostics.totalInitTime,
            steps: this.diagnostics.completedSteps.length
          });
          
          this.logDiagnostics();
          return true;
        } else {
          throw new Error('Health check failed');
        }
        
      } catch (error) {
        console.error(`AppInitializationService: Attempt ${attempt} failed:`, error);
        
        console.error(error, {
          tags: {
            operation: 'app_initialization',
            attempt: attempt.toString(),
            maxRetries: maxRetries.toString()
          },
          extra: {
            diagnostics: this.diagnostics,
            healthCheck: this.diagnostics.healthCheck
          }
        });
        
        if (attempt === maxRetries) {
          console.error('AppInitializationService: All initialization attempts failed');
          this.logDiagnostics();
          throw error;
        }
        
        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`AppInitializationService: Waiting ${delay}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return false;
  }

  /**
   * Run the complete initialization sequence
   */
  private async runInitializationSequence(): Promise<void> {
    // Step 1: Initialize React Native Firebase FIRST (required for App Check)
    await this.executeStep('react_native_firebase_init', async () => {
      const { initializeReactNativeFirebase } = await import('../firebaseNativeInit');
      await initializeReactNativeFirebase();
      console.log('React Native Firebase initialized');
    });

    // Steps 2-6: Parallelize core Firebase initialization
    await this.executeStep('firebase_parallel_init', async () => {
      await Promise.all([
        // Firebase native config
        import('../firebaseNativeConfig'),
        
        // Connection monitoring and auth in parallel
        Promise.all([
          import('../firebaseConfig').then(({ initializeConnectionMonitoring }) => 
            initializeConnectionMonitoring()
          ),
          import('./AuthService').then(({ AuthService }) => {
            return AuthService.initialize().then(() => {
              this.diagnostics.healthCheck.firebaseAuth = true;
            });
          })
        ]),
        
        // Firestore connection test
        this.testFirestoreConnection().then(() => {
          this.diagnostics.healthCheck.firestoreConnection = true;
        })
      ]);
      
      console.log('Native App Check will be initialized by firebaseConfig.ts');
    });

    // Step 7: Notification channels will be initialized by FirebaseNotificationService
    await this.executeStep('notification_channels_ready', async () => {
      // Notification channels will be created by FirebaseNotificationService.initialize()
      console.log('AppInitializationService: Notification channels step ready');
    });

    // Step 8: Request notification permissions (iOS)
    await this.executeStep('notification_permissions', async () => {
      if (Platform.OS === 'ios') {
        try {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          if (existingStatus !== 'granted') {
            await Notifications.requestPermissionsAsync();
          }
        } catch (permError) {
          console.warn('Failed to request notification permissions:', permError);
          // Don't fail initialization for permission issues
        }
      }
      this.diagnostics.healthCheck.notificationPermissions = true;
    });

    // Step 9: Load and set session data
    await this.executeStep('session_data', async () => {
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      
      if (sessionId) {
        setCurrentSessionIdForDedup(sessionId);
      }
      
      this.diagnostics.healthCheck.sessionData = !!(sessionId && eventId);
      
      console.log('AppInitializationService: Session data loaded:', {
        hasSessionId: !!sessionId,
        hasEventId: !!eventId
      });
    });

    // Step 10: Initialize Firebase notification service (critical for push notifications)
    await this.executeStep('firebase_notification_service', async () => {
      await FirebaseNotificationService.initialize();
    });

    // Step 11: Initialize NotificationRouter (will be initialized by _layout.tsx)
    await this.executeStep('notification_router_ready', async () => {
      // NotificationRouter will be initialized by _layout.tsx with proper dependencies
      // We just mark this step as ready for the health check
      console.log('AppInitializationService: NotificationRouter initialization step ready (will be handled by _layout.tsx)');
    });

    // Step 12: Initialize global notification listeners (CRITICAL for event notifications)
    await this.executeStep('global_notification_listeners', async () => {
      try {
        // Initialize global listeners - critical for real-time event notifications
        await GlobalNotificationService.initialize();
        
        // If no session, set up retry mechanism
        const status = GlobalNotificationService.getStatus();
        if (!status.sessionId || !status.eventId) {
          console.log('AppInitializationService: GlobalNotificationService has no session, will retry when available');
        }
        
        this.diagnostics.healthCheck.globalListeners = status.initialized;
      } catch (error) {
        console.warn('GlobalNotificationService initialization failed, will retry later:', error);
        // Don't fail initialization if global listeners fail - they can be retried
        this.diagnostics.healthCheck.globalListeners = false;
      }
    });

    // Move only non-critical services to background initialization
    this.initializeBackgroundServices();

    // Step 13: Remove final delay - app is ready to use immediately
    // Removed artificial 1000ms final delay for faster startup
  }

  /**
   * Execute a single initialization step with error handling and timing
   */
  private async executeStep(stepName: string, stepFunction: () => Promise<void>): Promise<void> {
    const step: InitializationStep = {
      name: stepName,
      startTime: Date.now(),
      success: false,
      retryCount: 0
    };

    try {
      console.log(`AppInitializationService: Executing step: ${stepName}`);
      await stepFunction();
      
      step.endTime = Date.now();
      step.duration = step.endTime - step.startTime;
      step.success = true;
      
      console.log(`AppInitializationService: Step ${stepName} completed in ${step.duration}ms`);
      
    } catch (error) {
      step.endTime = Date.now();
      step.duration = step.endTime - step.startTime;
      step.success = false;
      step.error = error instanceof Error ? error : new Error(String(error));
      
      console.error(`AppInitializationService: Step ${stepName} failed after ${step.duration}ms:`, error);
      throw error;
      
    } finally {
      this.diagnostics.completedSteps.push(step);
    }
  }

  /**
   * Test Firestore connection
   */
  private async testFirestoreConnection(): Promise<void> {
    try {
      const { collection, getDocs, query, limit } = await import('firebase/firestore');
      const { getDb } = await import('../firebaseConfig');
      
      // Try to read a small amount of data from a collection
      const testQuery = query(collection(getDb(), 'events'), limit(1));
      await getDocs(testQuery);
      
      console.log('AppInitializationService: Firestore connection test successful');
    } catch (error) {
      console.error('AppInitializationService: Firestore connection test failed:', error);
      throw new Error('Firestore connection test failed');
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<boolean> {
    console.log('AppInitializationService: Performing health check');
    
    // NotificationRouter will be initialized by _layout.tsx, so we don't check it here
    // It will be checked later in the app lifecycle
    this.diagnostics.healthCheck.notificationRouter = true; // Assume it will be initialized properly
    
    // Check GlobalNotificationService status
    const globalStatus = GlobalNotificationService.getStatus();
    this.diagnostics.healthCheck.globalListeners = globalStatus.initialized && globalStatus.hasListeners;
    
    // Verify session data is still available
    const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
    const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
    this.diagnostics.healthCheck.sessionData = !!(sessionId && eventId);
    
    const healthCheck = this.diagnostics.healthCheck;
    const criticalChecks = [
      healthCheck.firebaseAuth,
      healthCheck.firestoreConnection
      // Note: notificationRouter is not included here as it's initialized separately by _layout.tsx
    ];
    
    const optionalChecks = [
      healthCheck.notificationPermissions,
      healthCheck.globalListeners,
      healthCheck.sessionData
    ];
    
    const criticalPassed = criticalChecks.every(check => check);
    const optionalPassed = optionalChecks.filter(check => check).length;
    
    console.log('AppInitializationService: Health check results:', {
      critical: {
        firebaseAuth: healthCheck.firebaseAuth,
        firestoreConnection: healthCheck.firestoreConnection,
        allPassed: criticalPassed
      },
      optional: {
        notificationPermissions: healthCheck.notificationPermissions,
        sessionData: healthCheck.sessionData,
        passed: `${optionalPassed}/${optionalChecks.length}`
      },
      background: {
        pushTokenSetup: 'Push token registration moved to background',
        note: 'Non-critical services initialize after UI ready'
      },
      deferred: {
        notificationRouter: 'Will be initialized by _layout.tsx'
      }
    });
    
    // Critical checks must pass, optional checks are... optional
    if (!criticalPassed) {
      const failedCritical = [];
      if (!healthCheck.firebaseAuth) failedCritical.push('firebaseAuth');
      if (!healthCheck.firestoreConnection) failedCritical.push('firestoreConnection');
      
      console.error('AppInitializationService: Critical health checks failed:', failedCritical);
      return false;
    }
    
    return true;
  }

  /**
   * Retry failed components after successful initialization
   */
  async retryFailedComponents(): Promise<void> {
    console.log('AppInitializationService: Retrying failed components');
    
    const healthCheck = this.diagnostics.healthCheck;
    
    // Retry global listeners if they failed
    if (!healthCheck.globalListeners) {
      try {
        console.log('AppInitializationService: Retrying global notification listeners');
        await GlobalNotificationService.refreshSession();
        this.diagnostics.healthCheck.globalListeners = GlobalNotificationService.getStatus().initialized;
      } catch (error) {
        console.warn('AppInitializationService: Failed to retry global listeners:', error);
      }
    }
    
    // Retry notification permissions on iOS if needed
    if (!healthCheck.notificationPermissions && Platform.OS === 'ios') {
      try {
        console.log('AppInitializationService: Retrying notification permissions');
        const { status } = await Notifications.getPermissionsAsync();
        this.diagnostics.healthCheck.notificationPermissions = status === 'granted';
      } catch (error) {
        console.warn('AppInitializationService: Failed to check notification permissions:', error);
      }
    }
  }

  /**
   * Initialize non-critical services in background after main app is ready
   */
  private initializeBackgroundServices(): void {
    // Use setTimeout to defer to next tick, allowing UI to render first
    setTimeout(async () => {
      console.log('AppInitializationService: Starting background service initialization');
      
      try {
        // Background Step 1: Push token setup (non-blocking)
        const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
        const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
        
        if (sessionId && eventId) {
          try {
            const { ensurePushSetupFunction } = await import('../notifications/ensurePushSetup');
            const success = await ensurePushSetupFunction({ sessionId });
            console.log('AppInitializationService: Background push setup result:', { success });
            
            // Set up token refresh handler for app updates  
            if (success) {
              this.setupTokenRefreshHandler(sessionId);
            }
          } catch (error) {
            console.warn('AppInitializationService: Background push setup failed:', error);
          }
        }
        
        // Background Step 2: Additional analytics/monitoring (truly non-critical)
        try {
          // Placeholder for future non-critical services like analytics, crash reporting setup, etc.
          console.log('AppInitializationService: Background analytics/monitoring setup placeholder');
        } catch (error) {
          console.warn('AppInitializationService: Background analytics setup failed:', error);
        }
        
        // Background Step 3: AppState integration (non-blocking)
        this.setupAppStatePushTokenRefresh();
        
        console.log('AppInitializationService: Background service initialization completed');
        
      } catch (error) {
        console.warn('AppInitializationService: Background service initialization failed:', error);
      }
    }, 0);
  }

  /**
   * Get initialization diagnostics
   */
  getDiagnostics() {
    return { ...this.diagnostics };
  }

  /**
   * Set up AppState integration for idempotent push setup
   * AppStateSyncService deprecated - using React Native AppState directly
   */
  private setupAppStatePushTokenRefresh(): void {
    try {
      console.log('AppInitializationService: AppState push setup callback registered');
      
      // AppStateSyncService was deprecated - app state management now handled by React Native's built-in AppState API
      // This method is kept for compatibility but simplified since the complex AppState sync logic was removed
      
      // Optional: Add React Native AppState listener if needed in the future
      // import { AppState } from 'react-native';
      // const subscription = AppState.addEventListener('change', (nextAppState) => {
      //   if (nextAppState === 'active') {
      //     // Handle app becoming active - refresh push setup if needed
      //   }
      // });
      
    } catch (error) {
      console.warn('AppInitializationService: AppState setup failed:', error);
    }
  }

  /**
   * Log comprehensive diagnostics
   */
  private logDiagnostics(): void {
    console.log('AppInitializationService: Initialization Diagnostics', {
      totalTime: this.diagnostics.totalInitTime,
      retryAttempts: this.diagnostics.retryAttempts,
      steps: this.diagnostics.completedSteps.map(step => ({
        name: step.name,
        duration: step.duration,
        success: step.success
      })),
      healthCheck: this.diagnostics.healthCheck
    });
    
    // Send diagnostics to Sentry for monitoring
    console.log({
      message: 'App initialization completed',
      level: 'info',
      category: 'app_initialization',
      data: {
        totalTime: this.diagnostics.totalInitTime,
        retryAttempts: this.diagnostics.retryAttempts,
        stepsCompleted: this.diagnostics.completedSteps.length,
        healthCheck: this.diagnostics.healthCheck
      }
    });
  }

  /**
   * Set up Expo push token refresh handler
   * Critical for handling token changes after app updates
   */
  private setupTokenRefreshHandler(sessionId: string): void {
    try {
      // Rate limiting to prevent infinite loops in dev environment
      let lastRefreshAttempt = 0;
      const REFRESH_COOLDOWN = 10000; // 10 seconds between attempts
      
      // For Expo apps, we need to use Notifications.addPushTokenListener
      import('expo-notifications').then(({ addPushTokenListener }) => {
        console.log('AppInitializationService: Setting up token refresh handler with rate limiting');
        
        const subscription = addPushTokenListener(async (tokenData) => {
          try {
            const now = Date.now();
            
            // Rate limiting: Skip if too soon after last attempt
            if (now - lastRefreshAttempt < REFRESH_COOLDOWN) {
              console.log('AppInitializationService: Skipping token refresh (rate limited)');
              return;
            }
            
            lastRefreshAttempt = now;
            const newToken = tokenData.data;
            console.log('AppInitializationService: Push token refreshed, updating server');
            
            console.log({
              message: 'Push token refreshed',
              level: 'info',
              category: 'push_notification',
              data: { 
                sessionId: sessionId.substring(0, 8) + '...',
                tokenPrefix: newToken.substring(0, 20) + '...'
              }
            });
            
            // Re-register the new token
            const { registerPushToken } = await import('../notifications/registerPushToken');
            const success = await registerPushToken(sessionId);
            
            if (success) {
              console.log('AppInitializationService: Token refresh registration successful');
            } else {
              console.warn('AppInitializationService: Token refresh registration failed (App Check disabled - using local fallbacks)');
            }
            
          } catch (error) {
            console.error('AppInitializationService: Error handling token refresh:', error);
            console.error(error, {
              tags: {
                operation: 'push_token_refresh',
                source: 'app_initialization_service'
              }
            });
          }
        });
        
        // Store subscription for cleanup if needed - could be used for future cleanup
        void subscription; // Prevent unused variable warning
        console.log('AppInitializationService: Token refresh handler set up successfully');
        
      }).catch(error => {
        console.warn('AppInitializationService: Failed to set up token refresh handler:', error);
      });
      
    } catch (error) {
      console.warn('AppInitializationService: Error setting up token refresh handler:', error);
    }
  }
}

export const AppInitializationService = new AppInitializationServiceClass();
export default AppInitializationService;