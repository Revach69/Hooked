import { getDb } from './firebaseConfig';
import { collection, getDocs, query, limit } from 'firebase/firestore';


let isFirebaseReady = false;
let firebaseReadyPromise: Promise<boolean> | null = null;

export async function ensureFirebaseReady(): Promise<boolean> {
  if (isFirebaseReady) {
    return true;
  }

  if (firebaseReadyPromise) {
    return firebaseReadyPromise;
  }

  firebaseReadyPromise = new Promise<boolean>((resolve) => {
    // Test Firebase connection by making a simple query
    const testQuery = query(collection(getDb(), 'events'), limit(1));
    getDocs(testQuery)
      .then(() => {
        isFirebaseReady = true;
        resolve(true);
      })
      .catch((error) => {
        console.error(error);
        resolve(false);
      });
  });

  return firebaseReadyPromise;
}

export function resetFirebaseReady() {
  isFirebaseReady = false;
  firebaseReadyPromise = null;
}
