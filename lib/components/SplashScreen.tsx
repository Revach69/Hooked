import React from 'react';
import { View, Text, StyleSheet, useColorScheme, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SplashScreenProps {
  progress?: number;
}

export default function SplashScreen({ progress = 0 }: SplashScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[
      styles.container,
      { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }
    ]}>
      {/* App Icon */}
      <View style={styles.iconContainer}>
        <Image 
          source={require('../../assets/icon.png')}
          style={styles.appIcon}
          resizeMode="contain"
        />
      </View>

      {/* App Name */}
      <Text style={[
        styles.appName,
        { color: isDark ? '#ffffff' : '#000000' }
      ]}>
        Hooked
      </Text>

      {/* Loading Progress */}
      <View style={styles.loadingContainer}>
        <View style={[
          styles.loadingBar,
          { backgroundColor: isDark ? '#333333' : '#e5e7eb' }
        ]}>
          <View 
            style={[
              styles.loadingProgress,
              { 
                backgroundColor: isDark ? '#8b5cf6' : '#8b5cf6',
                width: `${Math.min(progress, 100)}%`
              }
            ]} 
          />
        </View>
        <Text style={[
          styles.loadingText,
          { color: isDark ? '#9ca3af' : '#6b7280' }
        ]}>
          {progress < 100 ? `Loading... ${Math.round(progress)}%` : 'Ready'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  appIcon: {
    width: 140,
    height: 140,
    borderRadius: 28,
  },
  appName: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 40,
    textAlign: 'center',
  },
  loadingContainer: {
    width: '100%',
    maxWidth: 200,
    alignItems: 'center',
  },
  loadingBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  loadingProgress: {
    height: '100%',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 