import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import type { AdminClient } from '@/types/admin';

const COL = 'adminClients';

export async function listClients(): Promise<AdminClient[]> {
  const q = query(collection(db, COL), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

export async function createClient(payload: Omit<AdminClient, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = await addDoc(collection(db, COL), {
    ...payload,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateClient(id: string, partial: Partial<AdminClient>) {
  await updateDoc(doc(db, COL, id), { ...partial, updatedAt: Date.now() });
}

export async function deleteClient(id: string) {
  await deleteDoc(doc(db, COL, id));
}
