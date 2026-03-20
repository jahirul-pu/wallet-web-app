import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CURRENCY } from '../utils/currencies';

export const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      currency: DEFAULT_CURRENCY,
      pinEnabled: false,
      pin: null,

      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', newTheme);
          return { theme: newTheme };
        });
      },

      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },

      setCurrency: (currency) => set({ currency }),

      setPin: (pin) => set({ pin, pinEnabled: !!pin }),

      clearPin: () => set({ pin: null, pinEnabled: false }),

      resetSettings: () => {
        document.documentElement.setAttribute('data-theme', 'dark');
        set({
          theme: 'dark',
          currency: DEFAULT_CURRENCY,
          pinEnabled: false,
          pin: null,
        });
      },
    }),
    {
      name: 'wallet-settings',
      onRehydrateStorage: () => (state) => {
        // Apply theme on load
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);
