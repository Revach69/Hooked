// Patch for deprecated React Native modules to prevent NativeEventEmitter errors
// This file patches deprecated modules that were extracted from React Native core

import { NativeModules, Platform } from 'react-native';

// Mock PushNotificationIOS if not available
if (Platform.OS === 'ios' && !NativeModules.RCTPushNotification) {
  NativeModules.RCTPushNotification = {
    addEventListener: () => {},
    removeEventListener: () => {},
    requestPermissions: () => Promise.resolve(),
    getInitialNotification: () => Promise.resolve(null),
  };
}

// Mock Clipboard if not available  
if (!NativeModules.RNCClipboard) {
  NativeModules.RNCClipboard = {
    setString: () => {},
    getString: () => Promise.resolve(''),
  };
}

// Mock ProgressBarAndroid if not available
if (Platform.OS === 'android' && !NativeModules.ProgressBarAndroid) {
  NativeModules.ProgressBarAndroid = {};
}

export default {};