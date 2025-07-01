// lib/firebaseConfig.ts

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// 🔐 Your actual config from Firebase Console → Project Settings → Web App
const firebaseConfig = {
  apiKey: 'AIzaSyDkVAo_xXbBHy8FYwFtMQA66aju08qK_yE',
  authDomain: 'hooked-69.firebaseapp.com',
  projectId: 'Hooked-69',
  storageBucket: 'hooked-69.appspot.com',
  messagingSenderId: '741889428835',
  appId: '1:741889428835:web:d5f88b43a503c9e6351756',
  measurementId: "G-6YHKXLN806",
}
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const auth = getAuth(app)
export const db = getFirestore(app)
