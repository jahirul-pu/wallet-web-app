import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const DEFAULT_ACCOUNTS = [
  { id: 'cash', name: 'Cash', icon: '💵', balance: 0, color: '#0F172A' },
  { id: 'bank', name: 'Bank', icon: '🏦', balance: 0, color: '#6366f1' },
  { id: 'mobile', name: 'Mobile Banking', icon: '📱', balance: 0, color: '#ec4899' },
  { id: 'card', name: 'Card', icon: '💳', balance: 0, color: '#f59e0b' },
];

export const useAccountStore = create(
  persist(
    (set, get) => ({
      accounts: DEFAULT_ACCOUNTS,

      addAccount: (data) => {
        const account = {
          id: generateId(),
          balance: 0,
          ...data,
        };
        set((state) => ({
          accounts: [...state.accounts, account],
        }));
        return account;
      },

      updateAccount: (id, data) => {
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === id ? { ...a, ...data } : a
          ),
        }));
      },

      deleteAccount: (id) => {
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== id),
        }));
      },

      adjustBalance: (id, amount, type) => {
        set((state) => ({
          accounts: state.accounts.map((a) => {
            if (a.id !== id) return a;
            if (type === 'income') return { ...a, balance: a.balance + amount };
            if (type === 'expense') return { ...a, balance: a.balance - amount };
            return a;
          }),
        }));
      },

      transfer: (fromId, toId, amount) => {
        const amt = Number(amount);
        set((state) => ({
          accounts: state.accounts.map((a) => {
            if (a.id === fromId) return { ...a, balance: a.balance - amt };
            if (a.id === toId) return { ...a, balance: a.balance + amt };
            return a;
          }),
        }));
      },

      reorderAccounts: (fromIndex, toIndex) => {
        set((state) => {
          const newAccounts = [...state.accounts];
          const [moved] = newAccounts.splice(fromIndex, 1);
          newAccounts.splice(toIndex, 0, moved);
          return { accounts: newAccounts };
        });
      },

      getTotalBalance: () => {
        return get().accounts.reduce((sum, a) => sum + a.balance, 0);
      },

      getAccount: (id) => {
        return get().accounts.find((a) => a.id === id);
      },

      clearAll: () => set({ accounts: DEFAULT_ACCOUNTS }),

      recalculateBalances: (transactions) => {
        set((state) => ({
          accounts: state.accounts.map((a) => {
            const balance = transactions.reduce((sum, t) => {
              if (t.type === 'income' && t.accountId === a.id) return sum + t.amount;
              if (t.type === 'expense' && t.accountId === a.id) return sum - t.amount;
              if (t.type === 'transfer') {
                if (t.accountId === a.id) return sum - t.amount;
                if (t.toAccountId === a.id) return sum + t.amount;
              }
              return sum;
            }, 0);
            return { ...a, balance };
          }),
        }));
      },

      importAccounts: (data) => set({ accounts: data }),
    }),
    {
      name: 'wallet-accounts',
    }
  )
);
