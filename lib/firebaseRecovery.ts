import { db, auth, storage } from './firebaseConfig';
import { enableNetwork, disableNetwork } from 'firebase/firestore';
import { logFirebaseError, ErrorRecovery, NetworkAwareErrorHandler } from './errorMonitoring';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

// Firebase Recovery Manager
export class FirebaseRecoveryManager {
  private static instance: FirebaseRecoveryManager;
  private isRecovering = false;
  private recoveryAttempts = 0;
  private readonly maxRecoveryAttempts = 3;
  private lastRecoveryTime = 0;
  private readonly recoveryCooldown = 30000; // 30 seconds

  static getInstance(): FirebaseRecoveryManager {
    if (!FirebaseRecoveryManager.instance) {
      FirebaseRecoveryManager.instance = new FirebaseRecoveryManager();
    }
    return FirebaseRecoveryManager.instance;
  }

  async handleFirebaseError(error: any, operation: string): Promise<boolean> {
    // Check if we're already in recovery mode
    if (this.isRecovering) {
      console.log('🔄 Recovery already in progress, skipping...');
      return false;
    }

    // Check cooldown period
    const now = Date.now();
    if (now - this.lastRecoveryTime < this.recoveryCooldown) {
      console.log('⏳ Recovery cooldown active, skipping...');
      return false;
    }

    // Check if this is a recoverable error
    if (!this.isRecoverableError(error)) {
      console.log('❌ Error is not recoverable:', error.message);
      return false;
    }

    // Check max recovery attempts
    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      console.error('🚨 Max recovery attempts reached, manual intervention required');
      await this.triggerManualRecovery();
      return false;
    }

    this.isRecovering = true;
    this.recoveryAttempts++;
    this.lastRecoveryTime = now;

    try {
      console.log(`🔄 Starting Firebase recovery (attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);
      
      const success = await this.performRecovery(error, operation);
      
      if (success) {
        console.log('✅ Firebase recovery successful');
        this.recoveryAttempts = 0; // Reset on success
        return true;
      } else {
        console.warn('⚠️ Firebase recovery failed');
        return false;
      }
    } catch (recoveryError) {
      console.error('❌ Error during Firebase recovery:', recoveryError);
      return false;
    } finally {
      this.isRecovering = false;
    }
  }

  private isRecoverableError(error: any): boolean {
    // Internal assertion errors are recoverable
    if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
      return true;
    }

    // Network-related errors are recoverable
    if (error.code === 'unavailable' || 
        error.code === 'deadline-exceeded' ||
        error.message?.includes('network') ||
        error.message?.includes('timeout')) {
      return true;
    }

    // Connection errors are recoverable
    if (error.message?.includes('connection') ||
        error.message?.includes('disconnected')) {
      return true;
    }

    return false;
  }

  private async performRecovery(error: any, operation: string): Promise<boolean> {
    const recoverySteps = [
      () => this.checkNetworkConnectivity(),
      () => this.resetFirestoreConnection(),
      () => this.clearCachedData(),
      () => this.reinitializeFirebase()
    ];

    for (const step of recoverySteps) {
      try {
        const success = await step();
        if (success) {
          console.log('✅ Recovery step successful');
          return true;
        }
      } catch (stepError) {
        console.warn('⚠️ Recovery step failed:', stepError);
      }
    }

    return false;
  }

  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('🌐 Network not connected, waiting for connection...');
        return false;
      }
      console.log('✅ Network connectivity confirmed');
      return true;
    } catch (error) {
      console.error('❌ Error checking network connectivity:', error);
      return false;
    }
  }

  private async resetFirestoreConnection(): Promise<boolean> {
    try {
      console.log('🔄 Resetting Firestore connection...');
      
      // Disable network first
      await disableNetwork(db);
      console.log('📡 Firestore network disabled');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Re-enable network
      await enableNetwork(db);
      console.log('📡 Firestore network re-enabled');
      
      return true;
    } catch (error) {
      console.error('❌ Error resetting Firestore connection:', error);
      return false;
    }
  }

  private async clearCachedData(): Promise<boolean> {
    try {
      console.log('🧹 Clearing cached Firebase data...');
      
      // Clear offline queue
      await AsyncStorage.removeItem('firebase_offline_queue');
      
      // Clear critical error logs
      await AsyncStorage.removeItem('firebase_critical_errors');
      
      // Clear any other Firebase-related cache
      const keys = await AsyncStorage.getAllKeys();
      const firebaseKeys = keys.filter(key => key.includes('firebase'));
      if (firebaseKeys.length > 0) {
        await AsyncStorage.multiRemove(firebaseKeys);
      }
      
      console.log('✅ Cached data cleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing cached data:', error);
      return false;
    }
  }

  private async reinitializeFirebase(): Promise<boolean> {
    try {
      console.log('🔄 Reinitializing Firebase...');
      
      // This is a more aggressive recovery step
      // In a real app, you might want to reinitialize the Firebase app
      // For now, we'll just reset the connection
      
      await this.resetFirestoreConnection();
      
      // Wait for the connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ Firebase reinitialized');
      return true;
    } catch (error) {
      console.error('❌ Error reinitializing Firebase:', error);
      return false;
    }
  }

  private async triggerManualRecovery(): Promise<void> {
    console.error('🚨 Manual recovery required - please restart the app');
    
    // Store recovery flag for next app launch
    await AsyncStorage.setItem('firebase_manual_recovery_needed', 'true');
    
    // Log the critical error
    await logFirebaseError(
      new Error('Max recovery attempts reached - manual intervention required'),
      'manual_recovery_triggered'
    );
  }

  async resetRecoveryState(): Promise<void> {
    this.recoveryAttempts = 0;
    this.isRecovering = false;
    this.lastRecoveryTime = 0;
    
    // Clear recovery flags
    await AsyncStorage.removeItem('firebase_manual_recovery_needed');
    
    console.log('🔄 Firebase recovery state reset');
  }

  getRecoveryStatus(): {
    isRecovering: boolean;
    attempts: number;
    maxAttempts: number;
    lastRecoveryTime: number;
  } {
    return {
      isRecovering: this.isRecovering,
      attempts: this.recoveryAttempts,
      maxAttempts: this.maxRecoveryAttempts,
      lastRecoveryTime: this.lastRecoveryTime
    };
  }
}

// Enhanced error handler with automatic recovery
export class EnhancedFirebaseErrorHandler {
  private static recoveryManager = FirebaseRecoveryManager.getInstance();

  static async handleError(error: any, operation: string): Promise<void> {
    // Log the error first
    await logFirebaseError(error, operation);
    
    // Record error for analytics
    const { ErrorAnalytics } = await import('./errorMonitoring');
    ErrorAnalytics.recordError(error, operation);
    
    // Handle network-aware errors
    await NetworkAwareErrorHandler.handleError(error, operation);
    
    // Attempt automatic recovery
    const recoverySuccess = await this.recoveryManager.handleFirebaseError(error, operation);
    
    if (recoverySuccess) {
      console.log('✅ Error handled successfully with recovery');
    } else {
      console.warn('⚠️ Error handled but recovery failed');
    }
  }

  static async handleCriticalError(error: any, operation: string): Promise<void> {
    console.error('🚨 CRITICAL FIREBASE ERROR:', {
      operation,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });

    // For critical errors, we might want to show a user-friendly message
    // or trigger a more aggressive recovery
    await this.handleError(error, operation);
  }
}

// App startup recovery check
export async function checkForRecoveryOnStartup(): Promise<void> {
  try {
    const needsRecovery = await AsyncStorage.getItem('firebase_manual_recovery_needed');
    
    if (needsRecovery === 'true') {
      console.log('🔄 App startup recovery check - manual recovery was needed');
      
      // Clear the flag
      await AsyncStorage.removeItem('firebase_manual_recovery_needed');
      
      // Reset recovery state
      const recoveryManager = FirebaseRecoveryManager.getInstance();
      await recoveryManager.resetRecoveryState();
      
      console.log('✅ Recovery state reset on app startup');
    }
  } catch (error) {
    console.error('❌ Error during startup recovery check:', error);
  }
}

// Export the recovery manager instance
export const firebaseRecovery = FirebaseRecoveryManager.getInstance(); 