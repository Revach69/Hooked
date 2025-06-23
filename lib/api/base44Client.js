import { createClient } from '@base44/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

let client;

export function getClient() {
  if (!client) {
    client = createClient({
      appId: "683f20362852a84143aef3f6",
      requiresAuth: true,
      getToken: async () => {
        try {
          const token = await AsyncStorage.getItem('base44_token');
          return token || '';
        } catch (e) {
          console.warn('Error retrieving token:', e);
          return '';
        }
      }
    });
  }
  return client;
}