import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useSettingsStore } from './stores/useSettingsStore';
import { useAuthStore } from './stores/useAuthStore';
import { useTransactionStore } from './stores/useTransactionStore';
import { useAccountStore } from './stores/useAccountStore';
import { useBudgetStore } from './stores/useBudgetStore';
import { useDebtStore } from './stores/useDebtStore';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import AddTransaction from './pages/AddTransaction';
import Accounts from './pages/Accounts';
import Budgets from './pages/Budgets';
import Debts from './pages/Debts';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import './App.css';

import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';

function AppContent() {
  const location = useLocation();
  const theme = useSettingsStore((s) => s.theme);
  const initAuth = useAuthStore((s) => s.init);

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Initialize auth listener
  useEffect(() => {
    const storeRefs = {
      importTransactions: useTransactionStore.getState().importTransactions,
      importAccounts: useAccountStore.getState().importAccounts,
      importBudgets: useBudgetStore.getState().importBudgets,
      importDebts: useDebtStore.getState().importDebts,
      setCurrency: useSettingsStore.getState().setCurrency,
      setTheme: useSettingsStore.getState().setTheme,
    };
    const unsub = initAuth(storeRefs);
    return () => { if (unsub) unsub(); };
  }, [initAuth]);

  // Hide bottom nav on /add page for mobile views
  const hideNav = location.pathname.startsWith('/add');

  return (
    <>
      <Sidebar />
      <div className="app-main">
        <TopNav />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/add" element={<AddTransaction />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
