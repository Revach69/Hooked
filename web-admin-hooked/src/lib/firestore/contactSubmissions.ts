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
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { getDbInstance } from '../firebaseConfig';
import type { ContactFormSubmission } from '@/types/admin';

export const ContactFormSubmissionAPI = {
  async getAll(): Promise<ContactFormSubmission[]> {
    const dbInstance = getDbInstance();
    const q = query(
      collection(dbInstance, 'contactFormSubmissions'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }) as ContactFormSubmission);
  },

  async getNew(): Promise<ContactFormSubmission[]> {
    const dbInstance = getDbInstance();
    const q = query(
      collection(dbInstance, 'contactFormSubmissions'),
      where('status', '==', 'New'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }) as ContactFormSubmission);
  },

  async getById(id: string): Promise<ContactFormSubmission | null> {
    const dbInstance = getDbInstance();
    const docSnap = await getDoc(doc(dbInstance, 'contactFormSubmissions', id));
    
    if (!docSnap.exists()) return null;
    
    return { 
      id: docSnap.id, 
      ...docSnap.data() 
    } as ContactFormSubmission;
  },

  async create(data: Omit<ContactFormSubmission, 'id' | 'createdAt'>): Promise<ContactFormSubmission> {
    const dbInstance = getDbInstance();
    const submissionData = {
      ...data,
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(dbInstance, 'contactFormSubmissions'), submissionData);
    
    return { 
      id: docRef.id, 
      ...data,
      createdAt: new Date().toISOString()
    } as ContactFormSubmission;
  },

  async update(id: string, updates: Partial<ContactFormSubmission>): Promise<void> {
    const dbInstance = getDbInstance();
    await updateDoc(doc(dbInstance, 'contactFormSubmissions', id), {
      ...updates,
      reviewedAt: serverTimestamp(),
    });
  },

  async markAsReviewed(id: string, reviewedBy: string): Promise<void> {
    const dbInstance = getDbInstance();
    await updateDoc(doc(dbInstance, 'contactFormSubmissions', id), {
      status: 'Reviewed',
      reviewedBy,
      reviewedAt: serverTimestamp(),
    });
  },

  async markAsConverted(id: string, clientId: string, reviewedBy: string): Promise<void> {
    const dbInstance = getDbInstance();
    await updateDoc(doc(dbInstance, 'contactFormSubmissions', id), {
      status: 'Converted',
      linkedClientId: clientId,
      reviewedBy,
      reviewedAt: serverTimestamp(),
    });
  },

  async markAsDismissed(id: string, reviewedBy: string): Promise<void> {
    const dbInstance = getDbInstance();
    await updateDoc(doc(dbInstance, 'contactFormSubmissions', id), {
      status: 'Dismissed',
      reviewedBy,
      reviewedAt: serverTimestamp(),
    });
  },

  async delete(id: string): Promise<void> {
    const dbInstance = getDbInstance();
    await deleteDoc(doc(dbInstance, 'contactFormSubmissions', id));
  },

  async getUnreadCount(): Promise<number> {
    const dbInstance = getDbInstance();
    const q = query(
      collection(dbInstance, 'contactFormSubmissions'),
      where('status', '==', 'New'),
      limit(100) // Reasonable limit for counting
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  }
};