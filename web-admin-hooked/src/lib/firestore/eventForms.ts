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
import { db } from '../firebaseConfig';
import type { EventForm } from '@/types/admin';

export const EventFormAPI = {
  async create(data: Omit<EventForm, 'id' | 'createdAt' | 'updatedAt'>): Promise<EventForm> {
    const docRef = await addDoc(collection(db, 'eventForms'), {
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
    const q = query(
      collection(db, 'eventForms'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EventForm[];
  },

  async get(id: string): Promise<EventForm | null> {
    const docRef = doc(db, 'eventForms', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as EventForm;
    }
    return null;
  },

  async update(id: string, data: Partial<EventForm>): Promise<void> {
    const docRef = doc(db, 'eventForms', id);
    await updateDoc(docRef, { 
      ...data, 
      updatedAt: serverTimestamp() 
    });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, 'eventForms', id);
    await deleteDoc(docRef);
  },

  async filter(filters: Partial<EventForm> = {}): Promise<EventForm[]> {
    let q: any = collection(db, 'eventForms');
    
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
      ...doc.data()
    })) as EventForm[];
  },

  async getUnlinkedForms(): Promise<EventForm[]> {
    const q = query(
      collection(db, 'eventForms'),
      where('linkedClientId', '==', null),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EventForm[];
  }
};
