declare module 'firebase/auth/react-native' {
  export * from 'firebase/auth';
  export function initializeAuth(app: any, options: any): any;
  export function getReactNativePersistence(storage: any): any;
}
