import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const useBudgetStore = create(
  persist(
    (set, get) => ({
      budgets: [],

      addBudget: (data) => {
        const budget = {
          id: generateId(),
          category: data.category,
          amount: Number(data.amount),
          month: data.month, // format: '2026-03'
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          budgets: [...state.budgets, budget],
        }));
        return budget;
      },

      updateBudget: (id, data) => {
        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.id === id ? { ...b, ...data, amount: Number(data.amount || b.amount) } : b
          ),
        }));
      },

      deleteBudget: (id) => {
        set((state) => ({
          budgets: state.budgets.filter((b) => b.id !== id),
        }));
      },

      getBudgetsByMonth: (monthKey) => {
        return get().budgets.filter((b) => b.month === monthKey);
      },

      getBudgetStatus: (budgetId, transactions) => {
        const budget = get().budgets.find((b) => b.id === budgetId);
        if (!budget) return null;

        let topExpense = null;

        const spent = transactions
          .filter((t) => {
            if (t.type !== 'expense' || t.category !== budget.category) return false;
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return key === budget.month;
          })
          .reduce((sum, t) => {
            if (!topExpense || t.amount > topExpense.amount) {
              topExpense = t;
            }
            return sum + t.amount;
          }, 0);

        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
        const status = percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'normal';

        return { spent, percentage, status, remaining: budget.amount - spent, topExpense };
      },

      clearAll: () => set({ budgets: [] }),

      importBudgets: (data) => set({ budgets: data }),
    }),
    {
      name: 'wallet-budgets',
    }
  )
);
