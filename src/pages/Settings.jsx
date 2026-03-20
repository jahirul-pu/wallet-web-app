import { useState } from 'react';
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
  const theme = useSettingsStore((s) => s.theme);
  const currency = useSettingsStore((s) => s.currency);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const resetSettings = useSettingsStore((s) => s.resetSettings);

  const transactions = useTransactionStore((s) => s.transactions);
  const accounts = useAccountStore((s) => s.accounts);
  const budgets = useBudgetStore((s) => s.budgets);
  const debts = useDebtStore((s) => s.debts);

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

  const [showCurrencySheet, setShowCurrencySheet] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [currSearch, setCurrSearch] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'

  const filteredCurrencies = searchCurrencies(currSearch);
  const currentCurrency = getCurrency(currency);

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

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (authMode === 'signin') {
      await useAuthStore.getState().emailSignIn(authEmail, authPassword);
    } else {
      await useAuthStore.getState().emailSignUp(authEmail, authPassword);
    }
    if (!useAuthStore.getState().error) {
      setShowAuthSheet(false);
      setAuthEmail('');
      setAuthPassword('');
    }
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

        {/* Cloud Sync Section */}
        <div className="settings-section-label">Cloud Sync</div>

        {!isConfigured ? (
          <div className="settings-item card" id="cloud-sync-unconfigured">
            <div className="settings-item-left">
              <span className="settings-icon">☁️</span>
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
                  <div className="settings-item-title">{user.displayName || 'User'}</div>
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
          <div className="settings-item card" onClick={() => setShowAuthSheet(true)} id="cloud-sign-in-btn">
            <div className="settings-item-left">
              <span className="settings-icon">☁️</span>
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
            <span className="settings-icon">📤</span>
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
            <span className="settings-icon">📥</span>
            <div>
              <div className="settings-item-title">Import Data</div>
              <div className="settings-item-desc">Restore from backup</div>
            </div>
          </div>
          <span className="settings-arrow">›</span>
          <input type="file" accept=".json" id="import-input" style={{ display: 'none' }} onChange={handleImport} />
        </label>

        {importStatus && (
          <div className="import-status">{importStatus}</div>
        )}

        {/* Stats */}
        <div className="settings-item card" id="stats-card">
          <div className="settings-item-left">
            <span className="settings-icon">📊</span>
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
            <span className="settings-icon">🗑️</span>
            <div>
              <div className="settings-item-title">Clear All Data</div>
              <div className="settings-item-desc">Delete everything permanently</div>
            </div>
          </div>
        </div>
      </div>

      {/* App info */}
      <div className="settings-footer">
        <div className="settings-app-name">💰 Wallet</div>
        <div className="settings-version">v1.0.0 · Made with ♥</div>
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

      {/* Auth Bottom Sheet */}
      <BottomSheet isOpen={showAuthSheet} onClose={() => { setShowAuthSheet(false); clearError(); }} title="Sign In to Sync">
        <div className="auth-sheet-content">
          <button className="btn-google" onClick={async () => { await googleSignIn(); if (!useAuthStore.getState().error) setShowAuthSheet(false); }} id="google-sign-in">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <form className="auth-form" onSubmit={handleEmailAuth}>
            <div className="input-group">
              <label htmlFor="auth-email">Email</label>
              <input
                className="input"
                type="email"
                id="auth-email"
                placeholder="you@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="auth-password">Password</label>
              <input
                className="input"
                type="password"
                id="auth-password"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button className="btn btn-primary auth-submit" type="submit" id="auth-submit-btn">
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <button 
            className="auth-toggle-mode"
            onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
            type="button"
          >
            {authMode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>

          {authError && <div className="auth-error">{authError}</div>}
        </div>
      </BottomSheet>
    </div>
  );
}
