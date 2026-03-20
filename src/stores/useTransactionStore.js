import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const useTransactionStore = create(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (data) => {
        const transaction = {
          id: generateId(),
          ...data,
          amount: Number(data.amount),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          transactions: [transaction, ...state.transactions],
        }));
        return transaction;
      },

      updateTransaction: (id, data) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...data, amount: Number(data.amount || t.amount) } : t
          ),
        }));
      },

      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
      },

      getTransactionsByMonth: (monthKey) => {
        return get().transactions.filter((t) => {
          const d = new Date(t.date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return key === monthKey;
        });
      },

      getBalance: () => {
        return get().transactions.reduce((sum, t) => {
          if (t.type === 'income') return sum + t.amount;
          if (t.type === 'expense') return sum - t.amount;
          return sum;
        }, 0);
      },

      getIncomeTotal: (monthKey) => {
        const txns = monthKey ? get().getTransactionsByMonth(monthKey) : get().transactions;
        return txns
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
      },

      getExpenseTotal: (monthKey) => {
        const txns = monthKey ? get().getTransactionsByMonth(monthKey) : get().transactions;
        return txns
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
      },

      getRecentTransactions: (count = 5) => {
        return get()
          .transactions
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, count);
      },

      clearAll: () => set({ transactions: [] }),

      importTransactions: (data) => set({ transactions: data }),
    }),
    {
      name: 'wallet-transactions',
    }
  )
);
