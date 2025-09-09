import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageUtils } from '../asyncStorageUtils';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

const SESSION_ID_KEY = 'currentSessionId';
const INSTALLATION_ID_KEY = 'installationId';

/**
 * Get or create a session ID for the current app session
 * Reads from SecureStore/AsyncStorage, else generates UUID v4 and persists
 */
export async function getOrCreateSessionId(): Promise<string> {
  try {
    // Try to get existing session ID using AsyncStorageUtils for compatibility
    const existingSessionId = await AsyncStorageUtils.getItemWithLegacyFallback<string>(SESSION_ID_KEY);
    
    if (existingSessionId) {
      console.log({
        message: 'Retrieved existing session ID',
        level: 'info',
        category: 'session',
        data: { sessionId: existingSessionId.substring(0, 8) + '...' }
      });
      return existingSessionId;
    }
    
    // Generate new session ID
    const newSessionId = uuidv4();
    
    // Store the session ID using AsyncStorageUtils for consistency
    await AsyncStorageUtils.setItem(SESSION_ID_KEY, newSessionId);
    
    console.log({
      message: 'Generated new session ID',
      level: 'info',
      category: 'session',
      data: { sessionId: newSessionId.substring(0, 8) + '...' }
    });
    
    return newSessionId;
  } catch (error) {
    console.error(error, {
      tags: {
        operation: 'session_management',
        source: 'getOrCreateSessionId'
      }
    });
    
    // Fallback: generate a session ID without storing it
    const fallbackSessionId = uuidv4();
    console.warn('Failed to manage session ID, using fallback:', fallbackSessionId);
    return fallbackSessionId;
  }
}

/**
 * Get the installation ID for the current device
 * Uses expo-application to get device-specific identifiers
 */
export async function getInstallationId(): Promise<string> {
  try {
    let installationId: string;
    
    if (Platform.OS === 'ios') {
      // For iOS, use the vendor identifier
      installationId = await Application.getIosIdForVendorAsync() ?? 'unknown';
    } else {
      // For Android, use the Android ID
      installationId = await Application.getAndroidId() ?? 'unknown';
    }
    
    // Validate the installation ID
    if (!installationId || installationId === 'unknown') {
      // Fallback: try to get from storage or generate
      const storedId = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
      if (storedId) {
        installationId = storedId;
      } else {
        // Generate a fallback ID based on device info
        installationId = `fallback_${Platform.OS}_${Date.now()}`;
        await AsyncStorage.setItem(INSTALLATION_ID_KEY, installationId);
      }
    } else {
      // Store the valid installation ID for future use
      await AsyncStorage.setItem(INSTALLATION_ID_KEY, installationId);
    }
    
    console.log({
      message: 'Retrieved installation ID',
      level: 'info',
      category: 'session',
      data: { 
        platform: Platform.OS,
        installationId: installationId.substring(0, 8) + '...'
      }
    });
    
    return installationId;
  } catch (error) {
    console.error(error, {
      tags: {
        operation: 'session_management',
        source: 'getInstallationId'
      }
    });
    
    // Fallback installation ID
    const fallbackId = `error_${Platform.OS}_${Date.now()}`;
    console.warn('Failed to get installation ID, using fallback:', fallbackId);
    return fallbackId;
  }
}

/**
 * Get both session ID and installation ID together
 * This is the main function to call during app initialization
 */
export async function getSessionAndInstallationIds(): Promise<{
  sessionId: string;
  installationId: string;
}> {
  const [sessionId, installationId] = await Promise.all([
    getOrCreateSessionId(),
    getInstallationId()
  ]);
  
  return { sessionId, installationId };
}

/**
 * Clear the current session ID (for testing or session reset)
 */
export async function clearSessionId(): Promise<void> {
  try {
    await AsyncStorageUtils.removeItem(SESSION_ID_KEY);
    console.log({
      message: 'Session ID cleared',
      level: 'info',
      category: 'session'
    });
  } catch (error) {
    console.error(error, {
      tags: {
        operation: 'session_management',
        source: 'clearSessionId'
      }
    });
  }
}

/**
 * Validate session ID format
 * Ensures the session ID is a valid UUID v4
 */
export function validateSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  // UUID v4 regex pattern
  const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Pattern.test(sessionId);
}

