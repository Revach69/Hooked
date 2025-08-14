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
import type { AdminClient } from '@/types/admin';

export const AdminClientAPI = {
  async create(data: Omit<AdminClient, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminClient> {
    const docRef = await addDoc(collection(db, 'adminClients'), {
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

  async getAll(): Promise<AdminClient[]> {
    const q = query(
      collection(db, 'adminClients'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AdminClient[];
  },

  async get(id: string): Promise<AdminClient | null> {
    const docRef = doc(db, 'adminClients', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as AdminClient;
    }
    return null;
  },

  async update(id: string, data: Partial<AdminClient>): Promise<void> {
    const docRef = doc(db, 'adminClients', id);
    await updateDoc(docRef, { 
      ...data, 
      updatedAt: serverTimestamp() 
    });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, 'adminClients', id);
    await deleteDoc(docRef);
  },

  async filter(filters: Partial<AdminClient> = {}): Promise<AdminClient[]> {
    let q: any = collection(db, 'adminClients');
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }
    if (filters.source) {
      q = query(q, where('source', '==', filters.source));
    }
    if (filters.eventKind) {
      q = query(q, where('eventKind', '==', filters.eventKind));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as AdminClient[];
  },

  async linkForm(clientId: string, formId: string): Promise<void> {
    const docRef = doc(db, 'adminClients', clientId);
    await updateDoc(docRef, { 
      linkedFormId: formId,
      organizerFormSent: 'Yes',
      updatedAt: serverTimestamp() 
    });
  },

  async unlinkForm(clientId: string): Promise<void> {
    const docRef = doc(db, 'adminClients', clientId);
    await updateDoc(docRef, { 
      linkedFormId: null,
      organizerFormSent: 'No',
      updatedAt: serverTimestamp() 
    });
  },

  async linkEvent(clientId: string, eventId: string): Promise<void> {
    const docRef = doc(db, 'adminClients', clientId);
    await updateDoc(docRef, { 
      linkedEventId: eventId,
      eventCardCreated: 'Yes',
      updatedAt: serverTimestamp() 
    });
  },

  async unlinkEvent(clientId: string): Promise<void> {
    const docRef = doc(db, 'adminClients', clientId);
    await updateDoc(docRef, { 
      linkedEventId: null,
      eventCardCreated: 'No',
      updatedAt: serverTimestamp() 
    });
  }
};
