import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';

export default function Index() {
  // Use Redirect instead of router.replace to avoid navigation timing issues
  return <Redirect href="/home" />;
} 