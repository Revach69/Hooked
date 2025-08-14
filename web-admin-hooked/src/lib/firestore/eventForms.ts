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
import type { EventForm } from '@/types/admin';

export const EventFormAPI = {
  async create(data: Omit<EventForm, 'id' | 'createdAt' | 'updatedAt'>): Promise<EventForm> {
    const dbInstance = getDbInstance();
    const docRef = await addDoc(collection(dbInstance, 'eventForms'), {
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

  async getAll(): Promise<EventForm[]> {
    const dbInstance = getDbInstance();
    const q = query(
      collection(dbInstance, 'eventForms'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<EventForm, 'id'>)
    })) as EventForm[];
  },

  async get(id: string): Promise<EventForm | null> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'eventForms', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...(docSnap.data() as Omit<EventForm, 'id'>) } as EventForm;
    }
    return null;
  },

  async update(id: string, data: Partial<EventForm>): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'eventForms', id);
    await updateDoc(docRef, { 
      ...data, 
      updatedAt: serverTimestamp() 
    });
  },

  async delete(id: string): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'eventForms', id);
    await deleteDoc(docRef);
  },

  async filter(filters: Partial<EventForm> = {}): Promise<EventForm[]> {
    const dbInstance = getDbInstance();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = collection(dbInstance, 'eventForms');
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.linkedClientId) {
      q = query(q, where('linkedClientId', '==', filters.linkedClientId));
    }
    if (filters.email) {
      q = query(q, where('email', '==', filters.email));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<EventForm, 'id'>)
    })) as EventForm[];
  },

  async getUnlinkedForms(): Promise<EventForm[]> {
    const dbInstance = getDbInstance();
    const q = query(
      collection(dbInstance, 'eventForms'),
      where('linkedClientId', '==', null),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<EventForm, 'id'>)
    })) as EventForm[];
  }
};
