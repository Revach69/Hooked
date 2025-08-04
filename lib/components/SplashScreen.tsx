import React from 'react';
import { View, Text, StyleSheet, useColorScheme, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SplashScreenProps {
  progress?: number; // Keep for backward compatibility but won't be used
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
          source={require('../../assets/Icon.png')}
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
    textAlign: 'center',
  },
}); 