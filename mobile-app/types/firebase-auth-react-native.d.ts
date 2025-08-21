declare module 'firebase/auth/react-native' {
  export * from 'firebase/auth';
  export function initializeAuth(_app: any, _options: any): any;
  export function getReactNativePersistence(_storage: any): any;
}
