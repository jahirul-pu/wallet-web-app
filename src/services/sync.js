// Firestore ↔ Zustand bi-directional sync layer
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isConfigured } from './firebase';

/**
 * Sync manager — handles bi-directional Firestore ↔ local state sync.
 * 
 * Data structure in Firestore:
 *   users/{uid}/data/transactions  → { items: [...], updatedAt }
 *   users/{uid}/data/accounts      → { items: [...], updatedAt }
 *   users/{uid}/data/budgets       → { items: [...], updatedAt }
 *   users/{uid}/data/debts         → { items: [...], updatedAt }
 *   users/{uid}/data/settings      → { ...settings, updatedAt }
 */

let unsubscribers = [];

/**
 * Push a store's data to Firestore
 */
export const pushToCloud = async (uid, collection, data) => {
  if (!isConfigured || !db || !uid) return;
  try {
    const ref = doc(db, 'users', uid, 'data', collection);
    await setDoc(ref, {
      items: data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error(`Sync push error (${collection}):`, err);
  }
};

/**
 * Push settings to Firestore (flat object, not wrapped in items)
 */
export const pushSettingsToCloud = async (uid, settings) => {
  if (!isConfigured || !db || !uid) return;
  try {
    const ref = doc(db, 'users', uid, 'data', 'settings');
    await setDoc(ref, {
      ...settings,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('Sync push error (settings):', err);
  }
};

/**
 * Pull a collection from Firestore
 */
export const pullFromCloud = async (uid, collection) => {
  if (!isConfigured || !db || !uid) return null;
  try {
    const ref = doc(db, 'users', uid, 'data', collection);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return collection === 'settings' ? data : (data.items || []);
    }
    return null;
  } catch (err) {
    console.error(`Sync pull error (${collection}):`, err);
    return null;
  }
};

/**
 * Subscribe to real-time changes from Firestore
 * @param {string} uid - User ID
 * @param {string} collection - 'transactions' | 'accounts' | 'budgets' | 'debts' | 'settings'
 * @param {function} onData - callback(data)
 * @returns {function} unsubscribe
 */
export const subscribeToCollection = (uid, collection, onData) => {
  if (!isConfigured || !db || !uid) return () => {};
  const ref = doc(db, 'users', uid, 'data', collection);
  const unsub = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      onData(collection === 'settings' ? data : (data.items || []));
    }
  }, (err) => {
    console.error(`Sync subscribe error (${collection}):`, err);
  });
  unsubscribers.push(unsub);
  return unsub;
};

/**
 * Unsubscribe from all listeners
 */
export const unsubscribeAll = () => {
  unsubscribers.forEach((unsub) => unsub());
  unsubscribers = [];
};

/**
 * Full sync: pull all data from Firestore and merge into stores
 */
export const fullSync = async (uid, stores) => {
  if (!isConfigured || !db || !uid) return;

  const [transactions, accounts, budgets, debts, settings] = await Promise.all([
    pullFromCloud(uid, 'transactions'),
    pullFromCloud(uid, 'accounts'),
    pullFromCloud(uid, 'budgets'),
    pullFromCloud(uid, 'debts'),
    pullFromCloud(uid, 'settings'),
  ]);

  if (transactions) stores.importTransactions(transactions);
  if (accounts) stores.importAccounts(accounts);
  if (budgets) stores.importBudgets(budgets);
  if (debts) stores.importDebts(debts);
  if (settings) {
    if (settings.currency) stores.setCurrency(settings.currency);
    if (settings.theme) stores.setTheme(settings.theme);
  }
};

/**
 * Full push: send all local data to Firestore
 */
export const fullPush = async (uid, storeData) => {
  if (!isConfigured || !db || !uid) return;

  await Promise.all([
    pushToCloud(uid, 'transactions', storeData.transactions),
    pushToCloud(uid, 'accounts', storeData.accounts),
    pushToCloud(uid, 'budgets', storeData.budgets),
    pushToCloud(uid, 'debts', storeData.debts),
    pushSettingsToCloud(uid, storeData.settings),
  ]);
};
