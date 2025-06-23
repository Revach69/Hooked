import React from 'react';
import { SafeAreaView, View } from 'react-native';
import { Stack } from 'expo-router';
console.log('✅ Loaded _layout.tsx');

export default function RootLayout() {
  console.log('✅ Rendering _layout.tsx');

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </SafeAreaView>
  );
}
