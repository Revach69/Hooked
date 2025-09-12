import React from 'react';
import { View, Text, StyleSheet, useColorScheme, Image } from 'react-native';




export default function SplashScreen() {
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
          source={require('../../assets/icon-rounded.png')}
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
    marginBottom: 24,
  },
  appIcon: {
    width: 140,
    height: 140,
  },
  appName: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
}); 