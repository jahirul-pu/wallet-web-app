import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
import MonthlySummary from './pages/MonthlySummary';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import './App.css';

import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import GlobalAlert from './components/GlobalAlert';

/** Auth pages are rendered full-screen (no sidebar / nav). */
const AUTH_PATHS = ['/login', '/signup'];

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

  const isAuthPage = location.pathname.startsWith('/login') || location.pathname.startsWith('/signup');
  const hideNav = location.pathname.startsWith('/add') || isAuthPage;

  return (
    <>
      {!isAuthPage && <Sidebar />}
      <div className={isAuthPage ? "" : "app-main"} style={isAuthPage ? { width: '100%' } : {}}>
        {!isAuthPage && <TopNav />}
        <main className={isAuthPage ? "" : "app-content"}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/add" element={<AddTransaction />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/monthly" element={<MonthlySummary />} />
            <Route path="/settings" element={<Settings />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        {!hideNav && <BottomNav />}
      </div>
      <GlobalAlert />
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
