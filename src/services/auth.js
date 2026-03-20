// Firebase Auth helpers
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, isConfigured } from './firebase';

const googleProvider = isConfigured ? new GoogleAuthProvider() : null;

/**
 * Sign in with Google popup
 */
export const signInWithGoogle = async () => {
  if (!isConfigured || !auth) throw new Error('Firebase not configured');
  return signInWithPopup(auth, googleProvider);
};

/**
 * Sign in with email/password
 */
export const signInWithEmail = async (email, password) => {
  if (!isConfigured || !auth) throw new Error('Firebase not configured');
  return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Create account with email/password
 */
export const signUpWithEmail = async (email, password) => {
  if (!isConfigured || !auth) throw new Error('Firebase not configured');
  return createUserWithEmailAndPassword(auth, email, password);
};

/**
 * Sign out
 */
export const signOut = async () => {
  if (!isConfigured || !auth) return;
  return firebaseSignOut(auth);
};

/**
 * Subscribe to auth state changes
 * @param {function} callback - (user | null) => void
 * @returns {function} unsubscribe
 */
export const onAuthChange = (callback) => {
  if (!isConfigured || !auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  if (!isConfigured || !auth) return null;
  return auth.currentUser;
};
