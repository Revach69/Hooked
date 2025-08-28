import * as Updates from 'expo-updates';
import * as StoreReview from 'expo-store-review';
import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';

interface VersionInfo {
  currentVersion: string;
  latestVersion: string;
  minRequiredVersion: string;
  forceUpdate: boolean;
  updateMessage: string;
  hasOTAUpdate: boolean;
}

class UpdateService {
  private readonly APP_STORE_URL = {
    ios: 'https://apps.apple.com/app/hooked/id6748921014', // Replace with your actual App Store ID
    android: 'https://play.google.com/store/apps/details?id=com.hookedapp.app'
  };

  private readonly API_BASE = process.env.EXPO_PUBLIC_FUNCTION_NOTIFY_URL?.replace('/notify', '') || 'https://your-api.com';

  /**
   * Check for updates on app launch
   */
  async checkForUpdates(): Promise<void> {
    try {
      // First check for over-the-air updates
      await this.checkOTAUpdates();
      
      // Then check for store updates
      await this.checkStoreUpdates();
    } catch (error) {
      console.log('Update check failed:', error);
    }
  }

  /**
   * Check for over-the-air updates (JavaScript/content updates)
   */
  private async checkOTAUpdates(): Promise<void> {
    if (!Updates.isEnabled) {
      return;
    }

    try {
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        Alert.alert(
          '✨ Content Update Available',
          'We have some improvements ready for you!',
          [
            { 
              text: 'Later', 
              style: 'cancel' 
            },
            {
              text: 'Update Now',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  Alert.alert(
                    'Update Ready',
                    'Restart the app to see the latest improvements.',
                    [
                      { text: 'Restart', onPress: () => Updates.reloadAsync() }
                    ]
                  );
                } catch (error) {
                  console.log('OTA update failed:', error);
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.log('OTA update check failed:', error);
    }
  }

  /**
   * Check for store updates (native code/major version updates)
   */
  private async checkStoreUpdates(): Promise<void> {
    try {
      const versionInfo = await this.getVersionInfo();
      
      if (this.needsStoreUpdate(versionInfo)) {
        this.showStoreUpdateAlert(versionInfo);
      }
    } catch (error) {
      console.log('Store update check failed:', error);
    }
  }

  /**
   * Get version information from your API/Firebase
   */
  private async getVersionInfo(): Promise<VersionInfo> {
    try {
      const response = await fetch(`${this.API_BASE}/version`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch version info');
      }

      const data = await response.json();
      
      return {
        currentVersion: Constants.expoConfig?.version || '1.0.0',
        latestVersion: data.latestVersion || '1.0.0',
        minRequiredVersion: data.minRequiredVersion || '1.0.0',
        forceUpdate: data.forceUpdate || false,
        updateMessage: data.updateMessage || 'A new version is available with improvements and bug fixes.',
        hasOTAUpdate: data.hasOTAUpdate || false
      };
    } catch (error) {
      // Fallback to default values if API fails
      return {
        currentVersion: Constants.expoConfig?.version || '1.0.0',
        latestVersion: Constants.expoConfig?.version || '1.0.0',
        minRequiredVersion: '1.0.0',
        forceUpdate: false,
        updateMessage: 'Update available',
        hasOTAUpdate: false
      };
    }
  }

  /**
   * Check if store update is needed
   */
  private needsStoreUpdate(versionInfo: VersionInfo): boolean {
    const { currentVersion, latestVersion, minRequiredVersion } = versionInfo;
    
    // Force update if current version is below minimum required
    if (this.compareVersions(currentVersion, minRequiredVersion) < 0) {
      return true;
    }
    
    // Optional update if there's a newer version
    if (this.compareVersions(currentVersion, latestVersion) < 0) {
      return true;
    }
    
    return false;
  }

  /**
   * Show store update alert
   */
  private showStoreUpdateAlert(versionInfo: VersionInfo): void {
    const { forceUpdate, updateMessage, latestVersion } = versionInfo;
    const isForceUpdate = forceUpdate || 
      this.compareVersions(versionInfo.currentVersion, versionInfo.minRequiredVersion) < 0;

    Alert.alert(
      '🚀 Update Available',
      `Version ${latestVersion} is now available.\n\n${updateMessage}`,
      isForceUpdate ? [
        {
          text: 'Update Now',
          onPress: () => this.openStore()
        }
      ] : [
        { 
          text: 'Later', 
          style: 'cancel' 
        },
        {
          text: 'Update Now',
          onPress: () => this.openStore()
        }
      ],
      { cancelable: !isForceUpdate }
    );
  }

  /**
   * Open app store for update
   */
  private async openStore(): Promise<void> {
    const storeUrl = Platform.select({
      ios: this.APP_STORE_URL.ios,
      android: this.APP_STORE_URL.android,
      default: this.APP_STORE_URL.ios
    });

    try {
      await Linking.openURL(storeUrl);
    } catch (error) {
      console.log('Failed to open store:', error);
      Alert.alert('Error', 'Could not open app store. Please update manually.');
    }
  }

  /**
   * Compare version strings (returns -1, 0, or 1)
   */
  private compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1parts.length, v2parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part < v2part) return -1;
      if (v1part > v2part) return 1;
    }
    
    return 0;
  }

  /**
   * Force check for updates (can be triggered by user)
   */
  async forceCheckForUpdates(): Promise<void> {
    Alert.alert(
      'Checking for Updates',
      'Please wait...',
      [],
      { cancelable: false }
    );

    await this.checkForUpdates();
  }

  /**
   * Show app rating prompt (use after successful update)
   */
  async showRatingPrompt(): Promise<void> {
    if (await StoreReview.hasAction()) {
      StoreReview.requestReview();
    }
  }
}

export default new UpdateService();