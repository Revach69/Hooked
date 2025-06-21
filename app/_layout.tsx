import React from 'react';
import { SafeAreaView, View } from 'react-native';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </SafeAreaView>
  );
}
