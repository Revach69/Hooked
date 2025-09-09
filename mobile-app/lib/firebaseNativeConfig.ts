

// Note: We're using regular Firebase SDK (firebase/app) instead of React Native Firebase
// This avoids conflicts and the "Default FirebaseApp is not initialized" error
// The @react-native-firebase/app plugin in app.json handles the native configuration

try {
  console.log({
    message: 'Firebase native config loaded - using regular Firebase SDK',
    level: 'info',
    category: 'firebase_init'
  });
} catch (error) {
  console.error(error, {
    tags: {
      operation: 'firebase_init',
      source: 'firebase_native_config'
    }
  });
}

// Export empty object to maintain compatibility
export const rnFirebaseApp = null;