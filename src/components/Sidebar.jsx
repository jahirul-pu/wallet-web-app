import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
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
];

export default function Sidebar() {
  const navigate = useNavigate();
  const logOut = useAuthStore((s) => s.logOut);
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <img src={logoImg} alt="Purrfect Finance" className="sidebar-logo" />
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
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-tray">
        <div className="sidebar-tray-divider" />
        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-tray-item ${isActive ? 'active' : ''}`}
        >
          <span className="sidebar-tray-icon"><SettingsIcon /></span>
          <span className="sidebar-tray-label">Settings</span>
        </NavLink>
        {user ? (
          <button className="sidebar-tray-item tray-logout" onClick={() => logOut()}>
            <span className="sidebar-tray-icon"><LogOutIcon /></span>
            <span className="sidebar-tray-label">Sign Out</span>
          </button>
        ) : (
          <button className="sidebar-tray-item tray-login" onClick={() => navigate('/login')}>
            <span className="sidebar-tray-icon"><LogInIcon /></span>
            <span className="sidebar-tray-label">Sign In</span>
          </button>
        )}
      </div>
    </aside>
  );
}
