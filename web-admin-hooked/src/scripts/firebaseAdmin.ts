/**
 * Shared Firebase Admin SDK initialization
 */

import { config } from 'dotenv';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load environment variables
config({ path: '.env.local' });

// Initialize Firebase Admin SDK (singleton)
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'hooked-development',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    return getApp();
  }
}

const app = initializeFirebaseAdmin();
const db = getFirestore(app);

export { app, db };