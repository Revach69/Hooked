import { db } from './firebaseConfig';
import { enableNetwork, disableNetwork, doc, getDoc } from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { AsyncStorageUtils } from './asyncStorageUtils';

export interface RecoveryAction {
  id: string;
  type: 'reconnect' | 'retry_operation' | 'clear_cache';
  timestamp: string;
  success: boolean;
  error?: string;
}

class FirebaseRecoveryManager {
  private static instance: FirebaseRecoveryManager;
  private recoveryHistory: RecoveryAction[] = [];
  private isRecovering = false;
  private maxRecoveryAttempts = 3;
  private recoveryDelay = 2000;

  static getInstance(): FirebaseRecoveryManager {
    if (!FirebaseRecoveryManager.instance) {
      FirebaseRecoveryManager.instance = new FirebaseRecoveryManager();
    }
    return FirebaseRecoveryManager.instance;
  }

  private constructor() {
    this.loadRecoveryHistory();
  }

  // Attempt to recover from Firebase connection issues
  async attemptRecovery(): Promise<boolean> {
    if (this.isRecovering) {
      // Recovery already in progress, skipping
      return false;
    }

    this.isRecovering = true;
    const recoveryId = Date.now().toString();

    try {
      // Starting Firebase recovery process
      
      // Step 1: Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('No internet connection available');
      }

      // Step 2: Disable and re-enable Firebase network
      // Resetting Firebase network connection
      await disableNetwork(db);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      await enableNetwork(db);

      // Step 3: Test connection
      // Testing Firebase connection
      const isConnected = await this.testConnection();
      
      if (!isConnected) {
        throw new Error('Firebase connection test failed after network reset');
      }

      // Step 4: Clear any cached data that might be causing issues
      await this.clearProblematicCache();

      // Firebase recovery successful
      this.recordRecoveryAction(recoveryId, 'reconnect', true);
      return true;

    } catch (error: any) {
              // Firebase recovery failed
      this.recordRecoveryAction(recoveryId, 'reconnect', false, error.message);
      return false;
    } finally {
      this.isRecovering = false;
    }
  }

  // Test Firebase connection with a simple operation
  private async testConnection(): Promise<boolean> {
    try {
      const testDoc = doc(db, '_connection_test', 'test');
      await getDoc(testDoc);
      return true;
    } catch {
              // Firebase connection test failed
      return false;
    }
  }

  // Clear potentially problematic cached data
  private async clearProblematicCache(): Promise<void> {
    try {
      // Clear any stored connection state
      await AsyncStorageUtils.removeItem('firebase_connection_state');
      await AsyncStorageUtils.removeItem('firebase_last_error');
      
      // Cleared problematic cache data
    } catch {
              // Failed to clear cache
    }
  }

  // Record recovery action for monitoring
  private async recordRecoveryAction(
    id: string, 
    type: RecoveryAction['type'], 
    success: boolean, 
    error?: string
  ): Promise<void> {
    const action: RecoveryAction = {
      id,
      type,
      timestamp: new Date().toISOString(),
      success,
      error
    };

    this.recoveryHistory.push(action);

    // Keep only last 50 recovery actions
    if (this.recoveryHistory.length > 50) {
      this.recoveryHistory = this.recoveryHistory.slice(-50);
    }

    await this.saveRecoveryHistory();
  }

  // Save recovery history to AsyncStorage
  private async saveRecoveryHistory(): Promise<void> {
    try {
      await AsyncStorageUtils.setItem('firebase_recovery_history', this.recoveryHistory);
    } catch {
              // Failed to save recovery history
    }
  }

  // Load recovery history from AsyncStorage
  private async loadRecoveryHistory(): Promise<void> {
    try {
      const saved = await AsyncStorageUtils.getItem<RecoveryAction[]>('firebase_recovery_history');
      if (saved) {
        this.recoveryHistory = saved;
      }
    } catch {
              // Failed to load recovery history
      this.recoveryHistory = [];
    }
  }

  // Get recovery statistics
  getRecoveryStats(): {
    totalAttempts: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    successRate: number;
    lastRecoveryAttempt?: string;
  } {
    const totalAttempts = this.recoveryHistory.length;
    const successfulRecoveries = this.recoveryHistory.filter(action => action.success).length;
    const failedRecoveries = totalAttempts - successfulRecoveries;
    const successRate = totalAttempts > 0 ? (successfulRecoveries / totalAttempts) * 100 : 0;
    const lastRecoveryAttempt = this.recoveryHistory.length > 0 
      ? this.recoveryHistory[this.recoveryHistory.length - 1].timestamp 
      : undefined;

    return {
      totalAttempts,
      successfulRecoveries,
      failedRecoveries,
      successRate,
      lastRecoveryAttempt
    };
  }

  // Check if recovery is needed based on recent failures
  shouldAttemptRecovery(): boolean {
    const recentFailures = this.recoveryHistory
      .filter(action => !action.success)
      .filter(action => {
        const actionTime = new Date(action.timestamp).getTime();
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        return actionTime > oneHourAgo;
      });

    return recentFailures.length >= 3;
  }

  // Get recovery status
  getRecoveryStatus(): {
    isRecovering: boolean;
    canAttemptRecovery: boolean;
    lastRecoverySuccess: boolean | null;
  } {
    const lastRecovery = this.recoveryHistory[this.recoveryHistory.length - 1];
    
    return {
      isRecovering: this.isRecovering,
      canAttemptRecovery: !this.isRecovering && this.shouldAttemptRecovery(),
      lastRecoverySuccess: lastRecovery ? lastRecovery.success : null
    };
  }

  // Clear recovery history
  clearRecoveryHistory(): void {
    this.recoveryHistory = [];
    this.saveRecoveryHistory();
  }
}

// Create singleton instance
const firebaseRecoveryManager = FirebaseRecoveryManager.getInstance();

// Export utility functions
export const attemptFirebaseRecovery = (): Promise<boolean> => {
  return firebaseRecoveryManager.attemptRecovery();
};

export const getFirebaseRecoveryStats = () => {
  return firebaseRecoveryManager.getRecoveryStats();
};

export const shouldAttemptFirebaseRecovery = (): boolean => {
  return firebaseRecoveryManager.shouldAttemptRecovery();
};

export const getFirebaseRecoveryStatus = () => {
  return firebaseRecoveryManager.getRecoveryStatus();
};

export const clearFirebaseRecoveryHistory = (): void => {
  firebaseRecoveryManager.clearRecoveryHistory();
};

export default firebaseRecoveryManager; 