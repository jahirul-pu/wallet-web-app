import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const useDebtStore = create(
  persist(
    (set, get) => ({
      debts: [],

      // type: 'owed_to_me' (loan — someone owes you)
      //       'i_owe' (debt — you owe someone)
      addDebt: (data) => {
        const debt = {
          id: generateId(),
          personName: data.personName,
          type: data.type, // 'owed_to_me' | 'i_owe'
          totalAmount: Number(data.totalAmount),
          paidAmount: 0,
          reason: data.reason || '',
          dueDate: data.dueDate || null,
          status: 'active', // 'active' | 'paid'
          payments: [],
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          debts: [debt, ...state.debts],
        }));
        return debt;
      },

      addPayment: (debtId, amount, note = '') => {
        const amt = Number(amount);
        set((state) => ({
          debts: state.debts.map((d) => {
            if (d.id !== debtId) return d;
            const newPaid = d.paidAmount + amt;
            const payment = {
              id: generateId(),
              amount: amt,
              note,
              date: new Date().toISOString(),
            };
            return {
              ...d,
              paidAmount: newPaid,
              payments: [...d.payments, payment],
              status: newPaid >= d.totalAmount ? 'paid' : 'active',
            };
          }),
        }));
      },

      updateDebt: (id, data) => {
        set((state) => ({
          debts: state.debts.map((d) =>
            d.id === id ? { ...d, ...data } : d
          ),
        }));
      },

      deleteDebt: (id) => {
        set((state) => ({
          debts: state.debts.filter((d) => d.id !== id),
        }));
      },

      markAsPaid: (id) => {
        set((state) => ({
          debts: state.debts.map((d) =>
            d.id === id ? { ...d, status: 'paid', paidAmount: d.totalAmount } : d
          ),
        }));
      },

      getActiveDebts: () => get().debts.filter((d) => d.status === 'active'),

      getTotalOwedToMe: () =>
        get()
          .debts.filter((d) => d.type === 'owed_to_me' && d.status === 'active')
          .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0),

      getTotalIOwe: () =>
        get()
          .debts.filter((d) => d.type === 'i_owe' && d.status === 'active')
          .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0),

      getOverdueDebts: () => {
        const now = new Date(new Date().toDateString());
        return get().debts.filter(
          (d) => d.status === 'active' && d.dueDate && new Date(d.dueDate) < now
        );
      },

      clearAll: () => set({ debts: [] }),

      importDebts: (data) => set({ debts: data }),
    }),
    {
      name: 'wallet-debts',
    }
  )
);
