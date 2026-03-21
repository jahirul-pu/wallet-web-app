import { useAuthStore } from '../stores/useAuthStore';
import './TopNav.css';

export default function TopNav() {
  const user = useAuthStore((s) => s.user);
  const userInitial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <header className="app-topnav">
      <div className="topnav-search-container">
        <svg className="topnav-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input 
          type="text" 
          className="topnav-search-input" 
          placeholder="Search transactions, accounts, or budgets..." 
        />
      </div>

      <div className="topnav-trailing">
        <button className="topnav-icon-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>
        <button className="topnav-icon-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        </button>
        <div className="topnav-user">
          <div className="topnav-user-avatar">{userInitial}</div>
          <div className="topnav-user-details">
            <span className="topnav-user-name">{user?.displayName || user?.email || 'Guest User'}</span>
            <span className="topnav-user-status">PURRFECT Premium</span>
          </div>
        </div>
      </div>
    </header>
  );
}
