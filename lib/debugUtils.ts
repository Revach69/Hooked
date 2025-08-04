import { Platform } from 'react-native';

export const debugLog = (message: string, data?: any) => {
  if (__DEV__) {
    console.log(`[DEBUG] ${message}`, data);
    
    // Send to Flipper if available
    if ((global as any).Flipper) {
      (global as any).Flipper.addPlugin({
        id: 'photo-upload-debug',
        title: 'Photo Upload Debug',
        icon: '��️',
        data: { message, data, timestamp: new Date().toISOString() }
      });
    }
  }
}; 