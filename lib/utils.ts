import { clsx } from "clsx";
import NetInfo from '@react-native-community/netinfo';

export function cn(...inputs: any[]) {
  return clsx(inputs);
}

// React Native specific utilities
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString();
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Network utilities
export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch (error) {
    console.error('Error checking network status:', error);
    return false;
  }
};

export const getNetworkType = async (): Promise<string> => {
  try {
    const state = await NetInfo.fetch();
    return state.type || 'unknown';
  } catch (error) {
    console.error('Error getting network type:', error);
    return 'unknown';
  }
}; 