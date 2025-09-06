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
import type { AdminClient } from '@/types/admin';

export const AdminClientAPI = {
  async create(data: Omit<AdminClient, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminClient> {
    const dbInstance = getDbInstance();
    const docRef = await addDoc(collection(dbInstance, 'adminClients'), {
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
    const dbInstance = getDbInstance();
    const q = query(
      collection(dbInstance, 'adminClients'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AdminClient[];
  },

  async get(id: string): Promise<AdminClient | null> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'adminClients', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as AdminClient;
    }
    return null;
  },

  async update(id: string, data: Partial<AdminClient>): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'adminClients', id);
    await updateDoc(docRef, { 
      ...data, 
      updatedAt: serverTimestamp() 
    });
  },

  async delete(id: string): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'adminClients', id);
    await deleteDoc(docRef);
  },

  async filter(filters: Partial<AdminClient> = {}): Promise<AdminClient[]> {
    const dbInstance = getDbInstance();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = collection(dbInstance, 'adminClients');
    
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
      ...(doc.data() as Omit<AdminClient, 'id'>)
    })) as AdminClient[];
  },

  async linkForm(clientId: string, formId: string, formData?: any): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'adminClients', clientId);
    
    // Get the current client data
    const clientDoc = await getDoc(docRef);
    if (!clientDoc.exists()) {
      throw new Error('Client not found');
    }
    
    const currentClient = clientDoc.data() as AdminClient;
    const currentEvents = currentClient.events || [];
    
    // Create a new event entry for this client based on the form
    const newEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      linkedFormId: formId,
      organizerFormSent: 'Yes',
      eventCardCreated: 'No',
      expectedAttendees: formData?.expectedAttendees ? parseInt(formData.expectedAttendees) : null,
      eventDate: formData?.eventDate || null,
      description: formData?.eventDetails || null,
      eventKind: formData?.eventType || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add the new event to the events array
    const updatedEvents = [...currentEvents, newEvent];
    
    await updateDoc(docRef, { 
      events: updatedEvents,
      updatedAt: serverTimestamp() 
    });
  },

  async unlinkForm(clientId: string, formId: string): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'adminClients', clientId);
    
    // Get the current client data
    const clientDoc = await getDoc(docRef);
    if (!clientDoc.exists()) {
      throw new Error('Client not found');
    }
    
    const currentClient = clientDoc.data() as AdminClient;
    const currentEvents = currentClient.events || [];
    
    // Remove the event that has this linkedFormId
    const updatedEvents = currentEvents.filter(event => event.linkedFormId !== formId);
    
    await updateDoc(docRef, { 
      events: updatedEvents,
      updatedAt: serverTimestamp() 
    });
  },

  async linkEvent(clientId: string, eventId: string, eventData?: any): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'adminClients', clientId);
    
    // Get the current client data
    const clientDoc = await getDoc(docRef);
    if (!clientDoc.exists()) {
      throw new Error('Client not found');
    }
    
    const currentClient = clientDoc.data() as AdminClient;
    const currentEvents = currentClient.events || [];
    
    // Create a new event entry for this client
    const newEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      linkedEventId: eventId,
      eventCardCreated: 'Yes',
      organizerFormSent: 'No',
      expectedAttendees: eventData?.expectedAttendees || null,
      eventDate: eventData?.eventDate || null,
      description: eventData?.description || null,
      eventKind: eventData?.eventKind || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add the new event to the events array
    const updatedEvents = [...currentEvents, newEvent];
    
    await updateDoc(docRef, { 
      events: updatedEvents,
      updatedAt: serverTimestamp() 
    });
  },

  async unlinkEvent(clientId: string, eventId: string): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'adminClients', clientId);
    
    // Get the current client data
    const clientDoc = await getDoc(docRef);
    if (!clientDoc.exists()) {
      throw new Error('Client not found');
    }
    
    const currentClient = clientDoc.data() as AdminClient;
    const currentEvents = currentClient.events || [];
    
    // Remove the event that has this linkedEventId
    const updatedEvents = currentEvents.filter(event => event.linkedEventId !== eventId);
    
    await updateDoc(docRef, { 
      events: updatedEvents,
      updatedAt: serverTimestamp() 
    });
  }
};
