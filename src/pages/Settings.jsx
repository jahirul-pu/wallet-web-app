import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useDebtStore } from '../stores/useDebtStore';
import { useAuthStore } from '../stores/useAuthStore';
import { CURRENCIES, searchCurrencies, getCurrency } from '../utils/currencies';
import { exportData, importData } from '../utils/exportImport';
import { isConfigured } from '../services/firebase';
import BottomSheet from '../components/BottomSheet';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const theme = useSettingsStore((s) => s.theme);
  const currency = useSettingsStore((s) => s.currency);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const resetSettings = useSettingsStore((s) => s.resetSettings);
  const hideBalances = useSettingsStore((s) => s.hideBalances);
  const toggleHideBalances = useSettingsStore((s) => s.toggleHideBalances);

  const transactions = useTransactionStore((s) => s.transactions);
  const accounts = useAccountStore((s) => s.accounts);
  const budgets = useBudgetStore((s) => s.budgets);
  const debts = useDebtStore((s) => s.debts);
  const recalculateBalances = useAccountStore((s) => s.recalculateBalances);

  const clearTxns = useTransactionStore((s) => s.clearAll);
  const clearAccounts = useAccountStore((s) => s.clearAll);
  const clearBudgets = useBudgetStore((s) => s.clearAll);
  const clearDebts = useDebtStore((s) => s.clearAll);

  const importTxns = useTransactionStore((s) => s.importTransactions);
  const importAccs = useAccountStore((s) => s.importAccounts);
  const importBuds = useBudgetStore((s) => s.importBudgets);
  const importDbs = useDebtStore((s) => s.importDebts);

  // Auth store
  const user = useAuthStore((s) => s.user);
  const syncing = useAuthStore((s) => s.syncing);
  const authError = useAuthStore((s) => s.error);
  const googleSignIn = useAuthStore((s) => s.googleSignIn);
  const logOut = useAuthStore((s) => s.logOut);
  const pushAll = useAuthStore((s) => s.pushAll);
  const clearError = useAuthStore((s) => s.clearError);
  const updateProfileName = useAuthStore((s) => s.updateProfileName);

  const [showCurrencySheet, setShowCurrencySheet] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [currSearch, setCurrSearch] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [repairStatus, setRepairStatus] = useState('');

  const filteredCurrencies = searchCurrencies(currSearch);
  const currentCurrency = getCurrency(currency);

  const handleEditName = () => {
    const newName = window.prompt('Enter your name:', user?.displayName || '');
    if (newName && newName.trim() !== '') {
      updateProfileName(newName.trim());
    }
  };

  const handleExport = () => {
    exportData({ transactions, accounts, budgets, debts, settings: { theme, currency } });
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importData(file);
      if (data.transactions) importTxns(data.transactions);
      if (data.accounts) importAccs(data.accounts);
      if (data.budgets) importBuds(data.budgets);
      if (data.debts) importDbs(data.debts);
      setImportStatus('✅ Data imported successfully!');
      setTimeout(() => setImportStatus(''), 3000);
    } catch (err) {
      setImportStatus(`❌ ${err.message}`);
      setTimeout(() => setImportStatus(''), 3000);
    }
    e.target.value = '';
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure? This will delete ALL your data. This cannot be undone.')) {
      clearTxns(); clearAccounts(); clearBudgets(); clearDebts(); resetSettings();
    }
  };

  const handleSyncPush = () => {
    pushAll({ transactions, accounts, budgets, debts, settings: { theme, currency } });
  };

  const handleRepair = () => {
    recalculateBalances(transactions);
    setRepairStatus('✅ Wallet balances repaired!');
    setTimeout(() => setRepairStatus(''), 3000);
  };

  return (
    <div className="page" id="settings-page">
      <h1 className="page-title">Settings</h1>

      <div className="settings-list">
        {/* Theme */}
        <div className="settings-item card" onClick={toggleTheme} id="theme-toggle">
          <div className="settings-item-left">
            <span className="settings-icon">🌓</span>
            <div>
              <div className="settings-item-title">Theme</div>
              <div className="settings-item-desc">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
            </div>
          </div>
          <div className={`theme-toggle ${theme === 'dark' ? 'dark' : ''}`}>
            <div className="theme-toggle-knob" />
          </div>
        </div>

        {/* Currency */}
        <div className="settings-item card" onClick={() => setShowCurrencySheet(true)} id="currency-select">
          <div className="settings-item-left">
            <span className="settings-icon">💱</span>
            <div>
              <div className="settings-item-title">Currency</div>
              <div className="settings-item-desc">{currentCurrency.symbol} {currentCurrency.code} — {currentCurrency.name}</div>
            </div>
          </div>
          <span className="settings-arrow">›</span>
        </div>

        {/* Privacy */}
        <div className="settings-section-label">Privacy</div>

        <div className="settings-item card" onClick={toggleHideBalances} id="hide-balances-toggle">
          <div className="settings-item-left">
            <span className="settings-icon">
              {hideBalances ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </span>
            <div>
              <div className="settings-item-title">Hide Balances</div>
              <div className="settings-item-desc">{hideBalances ? 'All amounts are hidden' : 'Amounts are visible'}</div>
            </div>
          </div>
          <div className={`theme-toggle ${hideBalances ? 'dark' : ''}`}>
            <div className="theme-toggle-knob" />
          </div>
        </div>

        {/* Cloud Sync Section */}
        <div className="settings-section-label">Cloud Sync</div>

        {!isConfigured ? (
          <div className="settings-item card" id="cloud-sync-unconfigured">
            <div className="settings-item-left">
              <span className="settings-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg>
            </span>
              <div>
                <div className="settings-item-title">Cloud Sync</div>
                <div className="settings-item-desc">Firebase not configured. Add your config to .env to enable.</div>
              </div>
            </div>
          </div>
        ) : user ? (
          <>
            {/* User Profile Card */}
            <div className="settings-item card cloud-user-card" id="cloud-user-card">
              <div className="settings-item-left">
                <div className="cloud-avatar">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="avatar" className="cloud-avatar-img" />
                  ) : (
                    <span>{(user.displayName || user.email || '?')[0].toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="settings-item-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {user.displayName || 'User'}
                    <button onClick={handleEditName} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                  </div>
                  <div className="settings-item-desc">{user.email}</div>
                </div>
              </div>
              <div className="cloud-sync-badge">
                <span className="cloud-sync-dot" />
                Synced
              </div>
            </div>

            {/* Sync Now */}
            <div className="settings-item card" onClick={handleSyncPush} id="sync-now-btn">
              <div className="settings-item-left">
                <span className={`settings-icon ${syncing ? 'spinning' : ''}`}>🔄</span>
                <div>
                  <div className="settings-item-title">{syncing ? 'Syncing...' : 'Sync Now'}</div>
                  <div className="settings-item-desc">Push all local data to cloud</div>
                </div>
              </div>
              <span className="settings-arrow">›</span>
            </div>

            {/* Sign Out */}
            <div className="settings-item card" onClick={logOut} id="sign-out-btn">
              <div className="settings-item-left">
                <span className="settings-icon">🚪</span>
                <div>
                  <div className="settings-item-title">Sign Out</div>
                  <div className="settings-item-desc">Disconnect from cloud sync</div>
                </div>
              </div>
              <span className="settings-arrow">›</span>
            </div>
          </>
        ) : (
          <div className="settings-item card" onClick={() => navigate('/login')} id="cloud-sign-in-btn">
            <div className="settings-item-left">
              <span className="settings-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg>
            </span>
              <div>
                <div className="settings-item-title">Sign In</div>
                <div className="settings-item-desc">Connect with Google or email to sync across devices</div>
              </div>
            </div>
            <span className="settings-arrow">›</span>
          </div>
        )}

        {authError && (
          <div className="import-status error-status" onClick={clearError}>{authError}</div>
        )}

        {/* Data Section */}
        <div className="settings-section-label">Data</div>

        {/* Export */}
        <div className="settings-item card" onClick={handleExport} id="export-btn">
          <div className="settings-item-left">
            <span className="settings-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            </span>
            <div>
              <div className="settings-item-title">Export Data</div>
              <div className="settings-item-desc">Download JSON backup</div>
            </div>
          </div>
          <span className="settings-arrow">›</span>
        </div>

        {/* Import */}
        <label className="settings-item card" htmlFor="import-input" id="import-btn">
          <div className="settings-item-left">
            <span className="settings-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </span>
            <div>
              <div className="settings-item-title">Import Data</div>
              <div className="settings-item-desc">Restore from backup</div>
            </div>
          </div>
          <span className="settings-arrow">›</span>
          <input type="file" accept=".json" id="import-input" style={{ display: 'none' }} onChange={handleImport} />
        </label>

        {/* Repair */}
        <div className="settings-item card" onClick={handleRepair} id="repair-btn">
          <div className="settings-item-left">
            <span className="settings-icon">🛠️</span>
            <div>
              <div className="settings-item-title">Repair Wallet Data</div>
              <div className="settings-item-desc">Recompute balances from history</div>
            </div>
          </div>
          <span className="settings-arrow">›</span>
        </div>

        {repairStatus && (
          <div className="import-status" style={{ background: 'var(--color-income-light)', color: 'var(--color-income)' }}>{repairStatus}</div>
        )}

        {importStatus && (
          <div className="import-status">{importStatus}</div>
        )}

        {/* Stats */}
        <div className="settings-item card" id="stats-card">
          <div className="settings-item-left">
            <span className="settings-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            </span>
            <div>
              <div className="settings-item-title">Statistics</div>
              <div className="settings-item-desc">
                {transactions.length} transactions · {accounts.length} wallets · {debts.length} debts
              </div>
            </div>
          </div>
        </div>

        {/* Clear data */}
        <div className="settings-item card danger" onClick={handleClearAll} id="clear-all-btn">
          <div className="settings-item-left">
            <span className="settings-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </span>
            <div>
              <div className="settings-item-title">Clear All Data</div>
              <div className="settings-item-desc">Delete everything permanently</div>
            </div>
          </div>
        </div>
      </div>



      {/* Currency Picker */}
      <BottomSheet isOpen={showCurrencySheet} onClose={() => { setShowCurrencySheet(false); setCurrSearch(''); }} title="Select Currency">
        <div className="currency-search">
          <input
            className="input"
            placeholder="Search currencies..."
            value={currSearch}
            onChange={(e) => setCurrSearch(e.target.value)}
            id="currency-search-input"
          />
        </div>
        <div className="currency-list">
          {filteredCurrencies.map((c) => (
            <button
              key={c.code}
              className={`currency-item ${currency === c.code ? 'active' : ''}`}
              onClick={() => { setCurrency(c.code); setShowCurrencySheet(false); setCurrSearch(''); }}
            >
              <span className="currency-item-symbol">{c.symbol}</span>
              <div className="currency-item-info">
                <div className="currency-item-code">{c.code}</div>
                <div className="currency-item-name">{c.name}</div>
              </div>
              {currency === c.code && <span className="currency-item-check">✓</span>}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}

