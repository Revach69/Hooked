import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { getDbInstance } from '../firebaseConfig';
import type { MapClient } from '@/types/admin';

export const MapClientAPI = {
  async create(data: Omit<MapClient, 'id' | 'createdAt' | 'updatedAt'>): Promise<MapClient> {
    const dbInstance = getDbInstance();
    const docRef = await addDoc(collection(dbInstance, 'mapClients'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      id: docRef.id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  async getAll(): Promise<MapClient[]> {
    const dbInstance = getDbInstance();
    const q = query(
      collection(dbInstance, 'mapClients'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MapClient[];
  },

  async get(id: string): Promise<MapClient | null> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'mapClients', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as MapClient;
    }
    return null;
  },

  async update(id: string, data: Partial<MapClient>): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'mapClients', id);
    await updateDoc(docRef, { 
      ...data, 
      updatedAt: serverTimestamp() 
    });
  },

  async delete(id: string): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'mapClients', id);
    await deleteDoc(docRef);
  },

  async filter(filters: Partial<MapClient> = {}): Promise<MapClient[]> {
    const dbInstance = getDbInstance();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = collection(dbInstance, 'mapClients');
    
    if (filters.subscriptionStatus) {
      q = query(q, where('subscriptionStatus', '==', filters.subscriptionStatus));
    }
    if (filters.businessType) {
      q = query(q, where('businessType', '==', filters.businessType));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<MapClient, 'id'>)
    })) as MapClient[];
  },

  async getActiveClients(): Promise<MapClient[]> {
    const dbInstance = getDbInstance();
    const q = query(
      collection(dbInstance, 'mapClients'),
      where('subscriptionStatus', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MapClient[];
  },

  async updateSubscriptionStatus(id: string, status: 'active' | 'inactive' | 'pending'): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'mapClients', id);
    await updateDoc(docRef, { 
      subscriptionStatus: status,
      updatedAt: serverTimestamp() 
    });
  }
};