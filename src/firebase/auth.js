import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from './config.js';

export const signIn = async (email, password, rememberMe = false) => {
  const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
  await setPersistence(auth, persistence);
  return signInWithEmailAndPassword(auth, email, password);
};

export const signOut = () => firebaseSignOut(auth);

export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

export const subscribeToAuthState = (callback) => onAuthStateChanged(auth, callback);
