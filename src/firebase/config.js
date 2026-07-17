import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBWXUVNdTPVA2fYmcQ6RM3ZdFuojzxXLOs',
  authDomain: 'gemach-management.firebaseapp.com',
  projectId: 'gemach-management',
  storageBucket: 'gemach-management.firebasestorage.app',
  messagingSenderId: '540765053739',
  appId: '1:540765053739:web:9a15e8986e8201fc395b6e',
  measurementId: 'G-1N1JVYPD5D',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
