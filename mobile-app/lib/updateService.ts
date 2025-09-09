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
    ios: 'https://apps.apple.com/app/hooked/id6748921014',
    android: 'https://play.google.com/store/apps/details?id=com.hookedapp.app'
  };

  private readonly APP_ID = {
    ios: '6748921014',
    android: 'com.hookedapp.app'
  };

  /**
   * Check for updates on app launch
   * 1. First check for store updates - if found, show alert and stop
   * 2. If no store update, check for OTA updates and install silently
   */
  async checkForUpdates(): Promise<void> {
    try {
      console.log('🔍 Starting update check...');
      
      // Step 1: Check for store updates first
      const versionInfo = await this.getVersionInfo();
      
      if (this.needsStoreUpdate(versionInfo)) {
        console.log('📱 Store update available, showing alert...');
        this.showStoreUpdateAlert(versionInfo);
        // Stop here - don't check OTA if store update is needed
        return;
      }
      
      console.log('✅ No store update needed, checking OTA...');
      
      // Step 2: Only check OTA if no store update is needed
      await this.checkOTAUpdatesSilently();
      
    } catch (error) {
      console.log('Update check failed:', error);
    }
  }

  /**
   * Check for over-the-air updates (JavaScript/content updates) with user prompts
   * DEPRECATED - Use checkOTAUpdatesSilently() instead for automatic updates
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
   * Check for OTA updates and install them silently without user interaction
   * This provides the best user experience for minor updates
   */
  private async checkOTAUpdatesSilently(): Promise<void> {
    if (!Updates.isEnabled) {
      console.log('❌ OTA updates are not enabled in this environment');
      return;
    }

    try {
      console.log('🔍 Checking for OTA updates...');
      console.log('Current update ID:', Updates.updateId);
      
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        console.log('✨ OTA update available! Downloading silently...');
        
        try {
          // Download the update silently
          await Updates.fetchUpdateAsync();
          console.log('✅ OTA update downloaded successfully');
          
          // Show a subtle notification that update will be applied
          Alert.alert(
            '✨ Update Downloaded',
            'The app has been updated with the latest improvements. The update will be applied when you restart the app.',
            [
              {
                text: 'Restart Now',
                onPress: () => {
                  console.log('🔄 Restarting app with new update...');
                  Updates.reloadAsync();
                }
              },
              {
                text: 'Later',
                style: 'cancel',
                onPress: () => {
                  console.log('⏰ User chose to restart later - update will apply on next app launch');
                }
              }
            ],
            { cancelable: true }
          );
          
        } catch (fetchError) {
          console.error('❌ Failed to download OTA update:', fetchError);
          // Silently fail - don't bother the user with technical errors
        }
      } else {
        console.log('✅ App is up to date (OTA)');
      }
    } catch (error) {
      console.error('❌ OTA update check failed:', error);
      // Silently fail - don't interrupt user experience
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
   * Get version information directly from App Store/Play Store
   */
  private async getVersionInfo(): Promise<VersionInfo> {
    const currentVersion = Constants.expoConfig?.version || '1.2.0';
    
    try {
      let latestVersion = currentVersion;
      
      if (Platform.OS === 'ios') {
        // Use iTunes Search API to get App Store version
        const response = await fetch(
          `https://itunes.apple.com/lookup?id=${this.APP_ID.ios}&country=US`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            latestVersion = data.results[0].version;
          }
        }
      } else if (Platform.OS === 'android') {
        // For Android, we'll use a fallback approach since Google Play Store doesn't have a public API
        // You can implement one of these solutions:
        // 1. Create a Firebase Function that scrapes Play Store
        // 2. Use a third-party service like app-store-scraper
        // 3. Manually update a JSON file with version info
        
        console.log('Android version check: Play Store has no public API, using current version');
        // For now, assume Android is always up to date unless you implement a custom solution
        latestVersion = currentVersion;
      }
      
      return {
        currentVersion,
        latestVersion,
        minRequiredVersion: currentVersion, // For simplicity, assume no minimum version requirement
        forceUpdate: false, // Never force update unless specified otherwise
        updateMessage: 'A new version is available with improvements and bug fixes.',
        hasOTAUpdate: false
      };
    } catch (error) {
      console.log('Store version check failed:', error);
      // Fallback to default values if API fails
      return {
        currentVersion,
        latestVersion: currentVersion,
        minRequiredVersion: currentVersion,
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
   * This uses the old flow with user prompts for manual checks
   */
  async forceCheckForUpdates(): Promise<void> {
    Alert.alert(
      'Checking for Updates',
      'Please wait...',
      [],
      { cancelable: false }
    );

    try {
      // For manual checks, use the prompt-based OTA update
      const versionInfo = await this.getVersionInfo();
      
      if (this.needsStoreUpdate(versionInfo)) {
        this.showStoreUpdateAlert(versionInfo);
      } else {
        // Check OTA with prompts for manual checks
        await this.checkOTAUpdates();
        
        // If no OTA update was found, show success message
        const update = await Updates.checkForUpdateAsync();
        if (!update.isAvailable) {
          Alert.alert(
            '✅ You\'re up to date!',
            `You have the latest version (${versionInfo.currentVersion}) installed.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Force update check failed:', error);
      Alert.alert(
        'Error',
        'Failed to check for updates. Please try again later.',
        [{ text: 'OK' }]
      );
    }
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