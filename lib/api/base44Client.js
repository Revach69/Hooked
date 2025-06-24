import * as Base44 from '@base44/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

let client;

function createMockClient() {
  const stubEntity = () => ({
    filter: async () => [],
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
  });

  return {
    auth: {
      // Temporary no-op for local development. Re-enable Base44 auth in production.
      useSession: () => console.warn('Base44 auth.useSession() called - no-op in development'),
      me: async () => null,
      updateMe: async () => {},
    },
    entities: {
      Event: stubEntity(),
      EventProfile: stubEntity(),
      Like: stubEntity(),
      Message: stubEntity(),
      ContactShare: stubEntity(),
      EventFeedback: stubEntity(),
    },
    integrations: { Core: {} },
  };
}

export function getClient() {
  if (client) return client;

  if (process.env.NODE_ENV !== 'production') {
    client = createMockClient();
    return client;
  }

  const create =
    typeof Base44.createClient === 'function'
      ? Base44.createClient
      : typeof Base44.default === 'function'
        ? Base44.default
        : Base44.default?.createClient;

  if (typeof create !== 'function') {
    console.warn('⚠️ Base44 createClient is unavailable');
    client = createMockClient();
    return client;
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

  return client;
}

// Export a shared instance so imports like `base44.entities` keep working.
export const base44 = getClient();
