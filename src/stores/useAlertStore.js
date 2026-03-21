import { create } from 'zustand';

export const useAlertStore = create((set) => ({
  isOpen: false,
  title: '',
  message: '',
  isDanger: true,
  onConfirm: null,
  onCancel: null,

  confirm: (message, title = "Are you sure?", isDanger = true) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        title,
        message,
        isDanger,
        onConfirm: () => {
          set({ isOpen: false });
          resolve(true);
        },
        onCancel: () => {
          set({ isOpen: false });
          resolve(false);
        },
      });
    });
  },

  alert: (message, title = "Notice") => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        title,
        message,
        isDanger: false,
        onConfirm: () => {
          set({ isOpen: false });
          resolve(true);
        },
        onCancel: null, // No cancel button for alerts
      });
    });
  }
}));

export const confirmDialog = useAlertStore.getState().confirm;
export const alertDialog = useAlertStore.getState().alert;
