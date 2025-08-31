import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { MapClient } from '../../types/venue';

// Firebase config for development project
const firebaseConfig = {
  apiKey: "AIzaSyDvOJQcVuF2cXMNLGstm3Og7JWj2Z9VJKc",
  authDomain: "hooked-development.firebaseapp.com",
  projectId: "hooked-development",
  storageBucket: "hooked-development.firebasestorage.app",
  messagingSenderId: "1092502765509",
  appId: "1:1092502765509:web:ea90a07f6b7c6f64bf7ecd"
};

// Initialize Firebase app for mobile
const app = initializeApp(firebaseConfig, 'mobile-venues');
const db = getFirestore(app);

export interface VenueResponse {
  venues: MapClient[];
  success: boolean;
  error?: string;
}

export const venueApi = {
  async fetchVenues(): Promise<VenueResponse> {
    try {
      // Query map clients with active subscriptions and show on map enabled
      const mapClientsRef = collection(db, 'map_clients');
      const q = query(
        mapClientsRef, 
        where('subscriptionStatus', '==', 'active'),
        where('integrationSettings.showOnMap', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const mapClientsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Transform MapClient data to venue format for mobile app
      const venues: MapClient[] = mapClientsData.map((mapClient: any) => ({
        id: mapClient.id,
        name: mapClient.businessName,
        type: mapClient.businessType,
        coordinates: mapClient.coordinates 
          ? [mapClient.coordinates.lng, mapClient.coordinates.lat] 
          : [0, 0],
        address: mapClient.address,
        description: mapClient.description || '',
        image: mapClient.venueImageThumbnail || null, // Use compressed thumbnail for mobile
        phone: mapClient.phone,
        website: mapClient.website,
        socialMedia: mapClient.socialMedia,
        hookedHours: mapClient.hookedHours,
        openingHours: mapClient.openingHours,
        activeUsers: Math.floor(Math.random() * 30) + 1, // Mock active users for now
      }));

      return {
        venues,
        success: true,
      };
    } catch (error) {
      console.error('Failed to fetch venues from Firebase:', error);
      return {
        venues: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
};