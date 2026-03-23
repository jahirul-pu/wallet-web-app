import { useState, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useDebtStore } from '../stores/useDebtStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { usePrivacy } from '../hooks/usePrivacy';
import logoImg from '../assets/logo.png';
import './Sidebar.css';

/* ── Duotone Filled Icons ── */
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 10.25V20C3 20.55 3.45 21 4 21H9V15C9 14.45 9.45 14 10 14H14C14.55 14 15 14.45 15 15V21H20C20.55 21 21 20.55 21 20V10.25" fill="currentColor" fillOpacity="0.15"/>
    <path d="M21 10.25V20C21 20.55 20.55 21 20 21H15V15C15 14.45 14.55 14 14 14H10C9.45 14 9 14.45 9 15V21H4C3.45 21 3 20.55 3 20V10.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 12L11.4 3.2C11.7 2.95 12.3 2.95 12.6 3.2L23 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AccountsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="20" height="14" rx="2" fill="currentColor" fillOpacity="0.15"/>
    <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M16 14C16 12.9 16.9 12 18 12H22V16H18C16.9 16 16 15.1 16 14Z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2 6L6 3H18L22 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TransactionsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" fillOpacity="0.15"/>
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 12L8 8M8 8L6 10M8 8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 12L16 16M16 16L14 14M16 16L18 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BudgetsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 3C16.97 3 21 7.03 21 12H12V3Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

const DebtIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 7V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M15 9.5H10.5C9.67 9.5 9 10.17 9 11C9 11.83 9.67 12.5 10.5 12.5H13.5C14.33 12.5 15 13.17 15 14C15 14.83 14.33 15.5 13.5 15.5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LogOutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="currentColor" fillOpacity="0.15"/>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const LogInIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 21H19a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4" fill="currentColor" fillOpacity="0.15"/>
    <path d="M15 21H19a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="10 17 5 12 10 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="5" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const CollapseIcon = ({ collapsed }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}>
    <polyline points="11 17 6 12 11 7" />
    <polyline points="18 17 13 12 18 7" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" fillOpacity="0.15"/>
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="7" y1="17" x2="7" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="12" y1="17" x2="12" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="17" y1="17" x2="17" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const MonthlyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9 15L11 17L15 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NAV_GROUPS = [
  {
    items: [
      { path: '/', label: 'Dashboard', icon: <HomeIcon /> },
      { path: '/accounts', label: 'Accounts', icon: <AccountsIcon /> },
    ],
  },
  {
    items: [
      { path: '/transactions', label: 'Transactions', icon: <TransactionsIcon /> },
    ],
  },
  {
    items: [
      { path: '/budgets', label: 'Budgets', icon: <BudgetsIcon /> },
      { path: '/debts', label: 'Debts & Loans', icon: <DebtIcon /> },
    ],
  },
  {
    items: [
      { path: '/monthly', label: 'Monthly Summary', icon: <MonthlyIcon /> },
      { path: '/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const logOut = useAuthStore((s) => s.logOut);
  const user = useAuthStore((s) => s.user);
  const accounts = useAccountStore((s) => s.accounts);
  const transactions = useTransactionStore((s) => s.transactions);
  const debts = useDebtStore((s) => s.debts);
  const currency = useSettingsStore((s) => s.currency);
  const { mask } = usePrivacy();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  };

  // ── Live Data ──
  const totalBalance = useMemo(() => accounts.reduce((s, a) => s + a.balance, 0), [accounts]);

  const monthlyNet = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return transactions.reduce((sum, t) => {
      const d = new Date(t.date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (k !== key) return sum;
      if (t.type === 'income') return sum + t.amount;
      if (t.type === 'expense') return sum - t.amount;
      return sum;
    }, 0);
  }, [transactions]);

  const todayTxnCount = useMemo(() => {
    const today = new Date().toDateString();
    return transactions.filter((t) => new Date(t.date).toDateString() === today).length;
  }, [transactions]);

  const overdueCount = useMemo(() => {
    const now = new Date(new Date().toDateString());
    return debts.filter((d) => d.status === 'active' && d.dueDate && new Date(d.dueDate) < now).length;
  }, [debts]);

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <img src={logoImg} alt="Purrfect Finance" className="sidebar-logo" />
      </div>

      {/* ── Balance Preview Card ── */}
      <div className="sidebar-status-card">
        <div className="sidebar-status-label">Vault Balance</div>
        <div className="sidebar-status-amount">
          {mask(totalBalance, currency)}
        </div>
        <div className={`sidebar-status-net ${monthlyNet >= 0 ? 'positive' : 'negative'}`}>
          {monthlyNet >= 0 ? '↑' : '↓'} {mask(Math.abs(monthlyNet), currency)} this month
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group, gi) => (
          <div className="sidebar-group" key={gi}>
            {gi > 0 && <div className="sidebar-divider" />}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                data-tooltip={item.label}
              >
                <span className="sidebar-link-icon">
                  {item.icon}
                  {/* Notification dot for Debts */}
                  {item.path === '/debts' && overdueCount > 0 && (
                    <span className="sidebar-notif-dot" />
                  )}
                </span>
                <span className="sidebar-link-label">{item.label}</span>
                {/* Live badges */}
                {item.path === '/transactions' && todayTxnCount > 0 && (
                  <span className="sidebar-badge">{todayTxnCount}</span>
                )}
                {item.path === '/debts' && overdueCount > 0 && (
                  <span className="sidebar-badge warning">{overdueCount}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-tray">
        <div className="sidebar-tray-divider" />
        <button className="sidebar-collapse-btn" onClick={toggleCollapse} data-tooltip={collapsed ? 'Expand' : 'Collapse'}>
          <CollapseIcon collapsed={collapsed} />
        </button>
        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-tray-item ${isActive ? 'active' : ''}`}
          data-tooltip="Settings"
        >
          <span className="sidebar-tray-icon"><SettingsIcon /></span>
          <span className="sidebar-tray-label">Settings</span>
        </NavLink>
        {user ? (
          <button className="sidebar-tray-item tray-logout" onClick={() => logOut()} data-tooltip="Sign Out">
            <span className="sidebar-tray-icon"><LogOutIcon /></span>
            <span className="sidebar-tray-label">Sign Out</span>
          </button>
        ) : (
          <button className="sidebar-tray-item tray-login" onClick={() => navigate('/login')} data-tooltip="Sign In">
            <span className="sidebar-tray-icon"><LogInIcon /></span>
            <span className="sidebar-tray-label">Sign In</span>
          </button>
        )}
      </div>
    </aside>
  );
}
