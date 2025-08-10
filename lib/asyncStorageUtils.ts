import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Enhanced AsyncStorage utility with better error handling and TypeScript support
 * Compatible with AsyncStorage v2
 */

export interface StorageItem<T = any> {
  value: T;
  timestamp: number;
  version?: string;
}

export class AsyncStorageUtils {
  /**
   * Set an item with optional metadata
   */
  static async setItem<T>(key: string, value: T, options?: { version?: string }): Promise<void> {
    try {
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        version: options?.version
      };
      
      const serializedValue = JSON.stringify(item);
      await AsyncStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get an item with type safety
   */
  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const serializedValue = await AsyncStorage.getItem(key);
      if (serializedValue === null) {
        return null;
      }

      const item: StorageItem<T> = JSON.parse(serializedValue);
      return item.value;
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      return null;
    }
  }

  /**
   * Get an item with fallback to legacy format (for backward compatibility)
   */
  static async getItemWithLegacyFallback<T>(key: string): Promise<T | null> {
    try {
      const serializedValue = await AsyncStorage.getItem(key);
      if (serializedValue === null) {
        return null;
      }

      // Try to parse as new format first
      try {
        const item: StorageItem<T> = JSON.parse(serializedValue);
        return item.value;
      } catch {
        // If parsing fails, try as legacy format (direct value)
        return JSON.parse(serializedValue);
      }
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove an item
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove multiple items
   */
  static async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Failed to remove multiple items:', error);
      throw error;
    }
  }

  /**
   * Get all keys
   */
  static async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return Array.from(keys);
    } catch (error) {
      console.error('Failed to get all keys:', error);
      return [];
    }
  }

  /**
   * Clear all storage
   */
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }

  /**
   * Check if an item exists
   */
  static async hasItem(key: string): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null;
    } catch (error) {
      console.error(`Failed to check if item ${key} exists:`, error);
      return false;
    }
  }

  /**
   * Get item age in milliseconds
   */
  static async getItemAge(key: string): Promise<number | null> {
    try {
      const serializedValue = await AsyncStorage.getItem(key);
      if (serializedValue === null) {
        return null;
      }

      const item: StorageItem = JSON.parse(serializedValue);
      return Date.now() - item.timestamp;
    } catch (error) {
      console.error(`Failed to get item age for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set item with expiration
   */
  static async setItemWithExpiration<T>(
    key: string, 
    value: T, 
    expirationMs: number,
    options?: { version?: string }
  ): Promise<void> {
    const item: StorageItem<T> & { expiresAt: number } = {
      value,
      timestamp: Date.now(),
      expiresAt: Date.now() + expirationMs,
      version: options?.version
    };
    
    const serializedValue = JSON.stringify(item);
    await AsyncStorage.setItem(key, serializedValue);
  }

  /**
   * Get item with expiration check
   */
  static async getItemWithExpiration<T>(key: string): Promise<T | null> {
    try {
      const serializedValue = await AsyncStorage.getItem(key);
      if (serializedValue === null) {
        return null;
      }

      const item: StorageItem<T> & { expiresAt?: number } = JSON.parse(serializedValue);
      
      // Check if item has expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error(`Failed to get item with expiration ${key}:`, error);
      return null;
    }
  }
}

// Legacy compatibility functions for gradual migration
export const setItem = AsyncStorageUtils.setItem;
export const getItem = AsyncStorageUtils.getItemWithLegacyFallback;
export const removeItem = AsyncStorageUtils.removeItem;
export const multiRemove = AsyncStorageUtils.multiRemove;
export const clear = AsyncStorageUtils.clear;
export const getAllKeys = AsyncStorageUtils.getAllKeys;
