import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import { AsyncStorageUtils } from '../asyncStorageUtils';
import { initializeAppCheck } from '../firebaseAppCheck';
import { setCurrentSessionIdForDedup } from '../notifications/NotificationRouter';
import { FirebaseNotificationService } from './FirebaseNotificationService';
import { GlobalNotificationService } from './GlobalNotificationService';

interface InitializationStep {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: any;
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
  async initializeApp(maxRetries: number = 3): Promise<boolean> {
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
        
        Sentry.captureException(error, {
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
    // Step 1: Initial delay for JS thread readiness
    await this.executeStep('initial_delay', async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    // Step 2: Initialize Firebase native config
    await this.executeStep('firebase_native_config', async () => {
      await import('../firebaseNativeConfig');
    });

    // Step 3: Initialize Firebase connection monitoring
    await this.executeStep('connection_monitoring', async () => {
      const { initializeConnectionMonitoring } = await import('../firebaseConfig');
      initializeConnectionMonitoring();
    });

    // Step 4: Initialize Firebase App Check
    await this.executeStep('app_check', async () => {
      await initializeAppCheck();
    });

    // Step 5: Initialize Firebase Auth
    await this.executeStep('firebase_auth', async () => {
      const { AuthService } = await import('./AuthService');
      await AuthService.initialize();
      this.diagnostics.healthCheck.firebaseAuth = true;
    });

    // Step 6: Test Firestore connection
    await this.executeStep('firestore_connection', async () => {
      await this.testFirestoreConnection();
      this.diagnostics.healthCheck.firestoreConnection = true;
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

    // Step 10: Ensure push setup with idempotent service (BEFORE notification services)
    await this.executeStep('push_setup_idempotent', async () => {
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      
      if (sessionId && eventId) {
        try {
          const { ensurePushSetupFunction } = await import('../notifications/ensurePushSetup');
          const success = await ensurePushSetupFunction({ sessionId });
          console.log('AppInitializationService: Idempotent push setup result:', { success });
          
          // Set up AppState integration for push token refresh
          this.setupAppStatePushTokenRefresh();
        } catch (error) {
          console.warn('AppInitializationService: Push setup failed:', error);
          // Don't fail initialization for push token issues
        }
      } else {
        console.log('AppInitializationService: Skipping push setup (no session)');
      }
    });

    // Step 11: Initialize Firebase notification service
    await this.executeStep('firebase_notification_service', async () => {
      await FirebaseNotificationService.initialize();
    });

    // Step 12: Initialize NotificationRouter (will be initialized by _layout.tsx)
    await this.executeStep('notification_router_ready', async () => {
      // NotificationRouter will be initialized by _layout.tsx with proper dependencies
      // We just mark this step as ready for the health check
      console.log('AppInitializationService: NotificationRouter initialization step ready (will be handled by _layout.tsx)');
    });

    // Step 13: Initialize global notification listeners (with retry if no session)
    await this.executeStep('global_notification_listeners', async () => {
      try {
        // Try to initialize global listeners
        await GlobalNotificationService.initialize();
        
        // If no session, set up retry mechanism
        const status = GlobalNotificationService.getStatus();
        if (!status.sessionId || !status.eventId) {
          console.log('AppInitializationService: GlobalNotificationService has no session, setting up retry');
          // Will be retried when session becomes available
        }
        
        this.diagnostics.healthCheck.globalListeners = status.initialized;
      } catch (error) {
        console.warn('GlobalNotificationService initialization failed, will retry later:', error);
        // Don't fail initialization if global listeners fail - they can be retried
        this.diagnostics.healthCheck.globalListeners = false;
      }
    });

    // Step 14: Final stabilization delay
    await this.executeStep('final_delay', async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
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
      step.error = error;
      
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
      const { db } = await import('../firebaseConfig');
      
      // Try to read a small amount of data from a collection
      const testQuery = query(collection(db, 'events'), limit(1));
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
        globalListeners: healthCheck.globalListeners,
        sessionData: healthCheck.sessionData,
        passed: `${optionalPassed}/${optionalChecks.length}`
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
   * Get initialization diagnostics
   */
  getDiagnostics() {
    return { ...this.diagnostics };
  }

  /**
   * Set up AppState integration for idempotent push setup
   */
  private setupAppStatePushTokenRefresh(): void {
    try {
      // Import AppStateSyncService dynamically to avoid circular dependencies
      import('./AppStateSyncService').then(({ AppStateSyncService }) => {
        // Register callback to refresh push setup when app comes to foreground
        AppStateSyncService.onAppForeground(async () => {
          try {
            console.log('AppInitializationService: App came to foreground, ensuring push setup');
            
            // Use idempotent push setup - it will check if refresh is needed
            const { ensurePushSetupFunction } = await import('../notifications/ensurePushSetup');
            const success = await ensurePushSetupFunction({ 
              forceRefresh: false // Let the service decide if refresh is needed
            });
            
            console.log('AppInitializationService: Foreground push setup result:', { success });
            
            Sentry.addBreadcrumb({
              message: 'Push setup ensured on app foreground',
              level: 'info',
              category: 'push_notification',
              data: { success }
            });
            
          } catch (error) {
            console.warn('AppInitializationService: Failed to ensure push setup on foreground:', error);
            Sentry.captureException(error, {
              tags: {
                operation: 'foreground_push_setup_ensure',
                source: 'app_initialization_service'
              }
            });
          }
        });
        
        console.log('AppInitializationService: AppState push setup callback registered');
        
        // Store unsubscribe function (could be used for cleanup if needed)
        // For now, we keep it running for the entire app lifetime
        
      }).catch(error => {
        console.warn('AppInitializationService: Failed to set up AppState push token refresh:', error);
      });
      
    } catch (error) {
      console.warn('AppInitializationService: Error setting up AppState push token refresh:', error);
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
    Sentry.addBreadcrumb({
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
}

export const AppInitializationService = new AppInitializationServiceClass();
export default AppInitializationService;