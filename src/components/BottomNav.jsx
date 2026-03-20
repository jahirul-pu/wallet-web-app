import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const navItems = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/transactions', icon: '📋', label: 'History' },
  { path: '/accounts', icon: '💳', label: 'Wallets' },
  { path: '/budgets', icon: '📊', label: 'Budget' },
  { path: '/debts', icon: '🤝', label: 'Debts' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" id="bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
