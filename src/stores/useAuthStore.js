import { create } from 'zustand';
import { onAuthChange, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut } from '../services/auth';
import { fullSync, fullPush, unsubscribeAll } from '../services/sync';
import { isConfigured } from '../services/firebase';

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,
  syncing: false,
  syncEnabled: false,

  // Initialize auth listener
  init: (storeRefs) => {
    if (!isConfigured) {
      set({ loading: false });
      return () => {};
    }

    return onAuthChange(async (user) => {
      if (user) {
        set({ user: { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL }, loading: false, syncEnabled: true });
        // Pull cloud data on sign in
        try {
          set({ syncing: true });
          await fullSync(user.uid, storeRefs);
          set({ syncing: false });
        } catch (err) {
          console.error('Initial sync failed:', err);
          set({ syncing: false });
        }
      } else {
        unsubscribeAll();
        set({ user: null, loading: false, syncEnabled: false });
      }
    });
  },

  // Sign in with Google
  googleSignIn: async () => {
    set({ error: null });
    try {
      await signInWithGoogle();
    } catch (err) {
      set({ error: err.message });
    }
  },

  // Sign in with email
  emailSignIn: async (email, password) => {
    set({ error: null });
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      set({ error: err.message });
    }
  },

  // Sign up with email
  emailSignUp: async (email, password) => {
    set({ error: null });
    try {
      await signUpWithEmail(email, password);
    } catch (err) {
      set({ error: err.message });
    }
  },

  // Sign out
  logOut: async () => {
    set({ error: null });
    try {
      unsubscribeAll();
      await signOut();
      set({ user: null, syncEnabled: false });
    } catch (err) {
      set({ error: err.message });
    }
  },

  // Manual sync: push all to cloud
  pushAll: async (storeData) => {
    const { user } = get();
    if (!user) return;
    set({ syncing: true, error: null });
    try {
      await fullPush(user.uid, storeData);
      set({ syncing: false });
    } catch (err) {
      set({ syncing: false, error: 'Sync failed: ' + err.message });
    }
  },

  clearError: () => set({ error: null }),
}));
