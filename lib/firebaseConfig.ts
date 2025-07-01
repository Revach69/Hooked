
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
} from 'firebase/auth/react-native';
import { getReactNativePersistence } from 'firebase/auth/react-native';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDkVAo_xXbBHy8FYwFtMQA66aju08qK_yE',
  authDomain: 'hooked-69.firebaseapp.com',
  projectId: 'hooked-69',
  storageBucket: 'hooked-69.appspot.com',
  messagingSenderId: '741889428835',
  appId: '1:741889428835:web:d5f88b43a503c9e6351756',
  measurementId: 'G-6YHKXLN806',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const db = getFirestore(app);

export { auth, db };