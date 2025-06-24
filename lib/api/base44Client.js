import * as Base44 from '@base44/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

let client;

export function getClient() {
  console.log('Base44 client initialized:', !!client);
  if (!client) {
    const create =
      typeof Base44.createClient === 'function'
        ? Base44.createClient
        : typeof Base44.default === 'function'
          ? Base44.default
          : Base44.default?.createClient;

    if (typeof create !== 'function') {
      console.warn('⚠️ Base44 createClient is unavailable');
      return undefined;
    }

    client = create({
      appId: '683f20362852a84143aef3f6',
      requiresAuth: true,
      getToken: async () => {
        try {
          const token = await AsyncStorage.getItem('base44_token');
          return token || '';
        } catch (e) {
          console.warn('Error retrieving token:', e);
          return '';
        }
      },
    });
  }
  return client;
}
