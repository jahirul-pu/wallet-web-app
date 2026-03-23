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
          reminders: data.reminders || { oneDayBefore: true, onDueDate: true },
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          debts: [debt, ...state.debts],
        }));
        return debt;
      },

      addPayment: (debtId, amount, note = '', dateStr = null) => {
        const amt = Number(amount);
        set((state) => ({
          debts: state.debts.map((d) => {
            if (d.id !== debtId) return d;
            const newPaid = d.paidAmount + amt;
            const payment = {
              id: generateId(),
              amount: amt,
              note,
              date: dateStr ? dateStr.split('T')[0] : new Date().toISOString().split('T')[0],
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

      deletePayment: (debtId, paymentId) => {
        set((state) => ({
          debts: state.debts.map((d) => {
            if (d.id !== debtId) return d;
            const paymentToDelete = d.payments.find(p => p.id === paymentId);
            if (!paymentToDelete) return d;
            const newPaid = d.paidAmount - paymentToDelete.amount;
            return {
              ...d,
              paidAmount: newPaid,
              payments: d.payments.filter(p => p.id !== paymentId),
              status: newPaid >= d.totalAmount ? 'paid' : 'active',
            };
          }),
        }));
      },

      editPayment: (debtId, paymentId, amount, note = '', dateStr = null) => {
        const amt = Number(amount);
        set((state) => ({
          debts: state.debts.map((d) => {
            if (d.id !== debtId) return d;
            const oldPayment = d.payments.find(p => p.id === paymentId);
            if (!oldPayment) return d;
            
            const newPaid = d.paidAmount - oldPayment.amount + amt;
            const updatedPayments = d.payments.map((p) => 
               p.id === paymentId 
                 ? { ...p, amount: amt, note, date: dateStr ? dateStr.split('T')[0] : p.date } 
                 : p
            );

            return {
              ...d,
              paidAmount: newPaid,
              payments: updatedPayments,
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

      getActiveReminders: () => {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        
        return get().debts.filter(d => {
          if (d.status !== 'active' || !d.dueDate) return false;
          const dueStr = d.dueDate.split('T')[0];
          
          const isToday = d.reminders?.onDueDate && dueStr === today;
          const isTomorrow = d.reminders?.oneDayBefore && dueStr === tomorrow;
          
          return isToday || isTomorrow;
        });
      },
    }),
    {
      name: 'wallet-debts',
    }
  )
);
