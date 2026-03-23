import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccountStore } from '../stores/useAccountStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { formatAmount } from '../utils/currencies';
import { renderAccountIcon } from '../utils/accountIcons';
import { getCategoryInfo } from '../utils/categories';
import BottomSheet from '../components/BottomSheet';
import AccountDropdown from '../components/AccountDropdown';
import CalculatorInput from '../components/CalculatorInput';
import './Accounts.css';

const ACCOUNT_ICONS = ['💵', '🏦', '📱', '💳', '💼', '🪙', '💰', '🏧', '👛'];
const ACCOUNT_COLORS = ['var(--color-income)', '#6366f1', '#ec4899', '#f59e0b', '#0ea5e9', '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16'];

/* Mini sparkline SVG component */
function MiniSparkline({ data, width = 100, height = 28, color = 'rgba(255,255,255,0.85)' }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padY = 3;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - padY - ((val - min) / range) * (height - padY * 2);
    return `${x},${y}`;
  });

  const gradientId = 'sparkGrad';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`0,${height} ${points.join(' ')} ${width},${height}`}
        fill={`url(#${gradientId})`}
      />
      {/* Line */}
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {(() => {
        const last = points[points.length - 1].split(',');
        return <circle cx={last[0]} cy={last[1]} r="2.5" fill="#fff" />;
      })()}
    </svg>
  );
}


export default function Accounts() {
  const accounts = useAccountStore((s) => s.accounts);
  const addAccount = useAccountStore((s) => s.addAccount);
  const updateAccount = useAccountStore((s) => s.updateAccount);
  const deleteAccount = useAccountStore((s) => s.deleteAccount);
  const archiveAccount = useAccountStore((s) => s.archiveAccount);
  const unarchiveAccount = useAccountStore((s) => s.unarchiveAccount);
  const getTotalBalance = useAccountStore((s) => s.getTotalBalance);
  const transfer = useAccountStore((s) => s.transfer);
  const reorderAccounts = useAccountStore((s) => s.reorderAccounts);
  const currency = useSettingsStore((s) => s.currency);
  const hideBalances = useSettingsStore((s) => s.hideBalances);
  const toggleHideBalances = useSettingsStore((s) => s.toggleHideBalances);
  const transactions = useTransactionStore((s) => s.transactions);
  const navigate = useNavigate();

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [contextMenuId, setContextMenuId] = useState(null);
  const contextMenuRef = useRef(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenuId(null);
      }
    };
    if (contextMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [contextMenuId]);
  
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('💵');
  const [newColor, setNewColor] = useState('#10b981');
  const [newType, setNewType] = useState('all');
  
  const [fromAcc, setFromAcc] = useState('');
  const [toAcc, setToAcc] = useState('');
  const [transferAmt, setTransferAmt] = useState('');

  /* Compute monthly change & 6-month trend data */
  const { monthlyChange, trendData, trendMonthLabels } = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en', { month: 'short' }),
      });
    }

    // Compute net (income - expense) per month
    const netByMonth = months.map(({ key }) => {
      let net = 0;
      transactions.forEach((t) => {
        const td = new Date(t.date);
        const tKey = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}`;
        if (tKey === key) {
          if (t.type === 'income') net += t.amount;
          else if (t.type === 'expense') net -= t.amount;
        }
      });
      return net;
    });

    // Cumulative balance trend (running total)
    let running = 0;
    const cumulative = netByMonth.map((n) => {
      running += n;
      return running;
    });

    const currentMonthNet = netByMonth[netByMonth.length - 1] || 0;

    return {
      monthlyChange: currentMonthNet,
      trendData: cumulative,
      trendMonthLabels: months.map((m) => m.label),
    };
  }, [transactions]);

  /* Per-wallet stats: last used, txn count, activity */
  const walletStats = useMemo(() => {
    const now = new Date();
    const stats = {};
    accounts.forEach((acc) => {
      const accTxns = transactions.filter(
        (t) => t.accountId === acc.id || t.toAccountId === acc.id
      );
      const count = accTxns.length;

      let lastDate = null;
      accTxns.forEach((t) => {
        const d = new Date(t.date);
        if (!lastDate || d > lastDate) lastDate = d;
      });

      let lastUsedLabel = 'Never';
      let daysAgo = Infinity;
      if (lastDate) {
        const diffMs = now - lastDate;
        daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (daysAgo === 0) lastUsedLabel = 'Today';
        else if (daysAgo === 1) lastUsedLabel = 'Yesterday';
        else if (daysAgo < 30) lastUsedLabel = `${daysAgo}d ago`;
        else if (daysAgo < 365) lastUsedLabel = `${Math.floor(daysAgo / 30)}mo ago`;
        else lastUsedLabel = `${Math.floor(daysAgo / 365)}y ago`;
      }

      // active = used in last 7 days, recent = last 30 days, inactive = else
      let activity = 'inactive';
      if (daysAgo <= 7) activity = 'active';
      else if (daysAgo <= 30) activity = 'recent';

      stats[acc.id] = { count, lastUsedLabel, activity };
    });
    return stats;
  }, [transactions, accounts]);

  const openAddSheet = () => {
    setEditingId(null);
    setNewName('');
    setNewIcon('💵');
    setNewColor('#10b981');
    setNewType('all');
    setShowAddSheet(true);
  };

  const openEditSheet = (acc) => {
    setEditingId(acc.id);
    setNewName(acc.name);
    setNewIcon(acc.icon);
    setNewColor(acc.color || '#10b981');
    setNewType(acc.type || 'all');
    setShowAddSheet(true);
  };

  const handleSaveAccount = () => {
    if (!newName.trim()) return;
    if (editingId) {
      updateAccount(editingId, { name: newName, icon: newIcon, color: newColor, type: newType });
    } else {
      addAccount({ name: newName, icon: newIcon, color: newColor, type: newType });
    }
    setNewName('');
    setEditingId(null);
    setShowAddSheet(false);
  };

  const handleTransfer = () => {
    if (!fromAcc || !toAcc || fromAcc === toAcc || !transferAmt) return;
    transfer(fromAcc, toAcc, Number(transferAmt));
    setTransferAmt('');
    setShowTransferSheet(false);
  };

  const isPositive = monthlyChange >= 0;

  // Calculate distribution (only for positive balances)
  const positiveAccounts = accounts.filter(a => a.balance > 0).sort((a, b) => b.balance - a.balance);
  const totalPositive = positiveAccounts.reduce((sum, a) => sum + a.balance, 0);

  /* Recent transactions per wallet (last 2) */
  const recentByWallet = useMemo(() => {
    const map = {};
    accounts.forEach((acc) => {
      const accTxns = transactions
        .filter((t) => t.accountId === acc.id || t.toAccountId === acc.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 2);
      map[acc.id] = accTxns;
    });
    return map;
  }, [transactions, accounts]);

  const maskedAmount = '•••••';

  return (
    <div className="page" id="accounts-page">
      <h1 className="page-title">Wallets</h1>

      {/* Net Worth Card — Enhanced */}
      <div className="accounts-total gradient-card">
        <div className="accounts-total-top-row">
          <div className="accounts-total-label">Net Worth</div>
          <button
            className="balance-toggle-btn"
            onClick={toggleHideBalances}
            title={hideBalances ? 'Show balances' : 'Hide balances'}
          >
            {hideBalances ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        <div className="accounts-total-amount" style={{ position: 'relative', zIndex: 1 }}>
          {hideBalances ? maskedAmount : formatAmount(getTotalBalance(), currency)}
        </div>

        {/* Monthly change */}
        <div className="accounts-monthly-change" style={{ position: 'relative', zIndex: 1 }}>
          <span className={`monthly-change-badge ${isPositive ? 'positive' : 'negative'}`}>
            {hideBalances ? maskedAmount : `${isPositive ? '+' : ''}${formatAmount(monthlyChange, currency)}`} this month
            <span className="monthly-change-arrow">{isPositive ? '↑' : '↓'}</span>
          </span>
        </div>

        {/* Mini trend sparkline */}
        <div className="accounts-sparkline-wrap" style={{ position: 'relative', zIndex: 1 }}>
          <MiniSparkline data={trendData} width={120} height={32} />
          <div className="sparkline-months">
            {trendMonthLabels.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Distribution View */}
      {totalPositive > 0 && (
        <div className="wallet-distribution card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
          <div className="distribution-header" style={{ marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: '600', opacity: 0.9 }}>Distribution</h3>
          </div>
          <div className="distribution-bar-wrap" style={{ display: 'flex', height: '12px', borderRadius: 'var(--radius-full)', overflow: 'hidden', background: 'var(--color-bg-input)', marginBottom: 'var(--space-4)' }}>
            {positiveAccounts.map(acc => {
              const percent = (acc.balance / totalPositive) * 100;
              return (
                <div
                  key={acc.id}
                  className="distribution-segment"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: acc.color,
                  }}
                  title={`${acc.name}: ${percent.toFixed(1)}%`}
                />
              );
            })}
          </div>
          <div className="distribution-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.75rem' }}>
            {positiveAccounts.map(acc => {
              const percent = (acc.balance / totalPositive) * 100;
              if (percent < 1.5) return null; // Don't show tiny slices in legend
              return (
                <div key={acc.id} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="legend-color" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: acc.color }} />
                  <span className="legend-text" style={{ opacity: 0.8 }}>
                    {acc.name} <span className="legend-percent" style={{ fontWeight: 600, opacity: 1, marginLeft: '2px' }}>{Math.round(percent)}%</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Account list — split active, inactive, archived */}
      {(() => {
        const activeAccounts = [];
        const inactiveAccounts = [];
        const archivedAccounts = [];
        accounts.forEach((acc, index) => {
          if (acc.archived) {
            archivedAccounts.push({ acc, index });
          } else if (acc.balance === 0) {
            inactiveAccounts.push({ acc, index });
          } else {
            activeAccounts.push({ acc, index });
          }
        });

        const renderWalletCard = ({ acc, index }, isPrimary) => {
          const stats = walletStats[acc.id] || { count: 0, lastUsedLabel: 'Never', activity: 'inactive' };
          const isZero = acc.balance === 0;
          return (
            <div key={acc.id} className={`account-card card ${isPrimary ? 'primary-wallet' : ''} ${isZero ? 'inactive-wallet' : 'active-wallet'} ${contextMenuId === acc.id ? 'menu-open' : ''}`}>
              <div className="account-card-top">
                <div className="account-card-left" onClick={() => openEditSheet(acc)} style={{ cursor: 'pointer', flex: 1 }}>
                  <div className="account-card-icon-wrap">
                    <div
                      className="account-card-icon"
                      style={{ background: `${acc.color}18`, color: acc.color }}
                    >
                      {renderAccountIcon(acc.icon)}
                    </div>
                    <span className={`wallet-activity-dot ${stats.activity}`} />
                  </div>
                  <div className="account-card-info">
                    <div className="account-card-name">
                      {acc.name}
                      {isPrimary && (
                        <span className="wallet-primary-badge">Default</span>
                      )}
                      {acc.type && acc.type !== 'all' && (
                        <span className="wallet-type-tag">
                          {acc.type}
                        </span>
                      )}
                    </div>
                    <div
                      className="account-card-balance"
                      style={{ color: acc.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
                    >
                      {hideBalances ? maskedAmount : formatAmount(acc.balance, currency)}
                    </div>
                    <div className="wallet-meta">
                      <span className="wallet-meta-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {stats.lastUsedLabel}
                      </span>
                      <span className="wallet-meta-sep">·</span>
                      <span className="wallet-meta-item">
                        {stats.count} txn{stats.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="account-card-right" ref={contextMenuId === acc.id ? contextMenuRef : null}>
                  <div className="account-card-reorder">
                    <button 
                      className="btn-icon-mini" 
                      onClick={() => reorderAccounts(index, index - 1)}
                      disabled={index === 0}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    </button>
                    <button 
                      className="btn-icon-mini" 
                      onClick={() => reorderAccounts(index, index + 1)}
                      disabled={index === accounts.length - 1}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                  </div>
                  <button
                    className="btn-icon-mini wallet-more-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenuId(contextMenuId === acc.id ? null : acc.id);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>

                  {/* Context Menu */}
                  {contextMenuId === acc.id && (
                    <div className="wallet-context-menu">
                      <button
                        className="wallet-context-item"
                        onClick={() => {
                          setContextMenuId(null);
                          openEditSheet(acc);
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        className="wallet-context-item"
                        onClick={() => {
                          setContextMenuId(null);
                          if (acc.archived) {
                            unarchiveAccount(acc.id);
                          } else {
                            archiveAccount(acc.id);
                          }
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="21 8 21 21 3 21 3 8" />
                          <rect x="1" y="3" width="22" height="5" />
                          <line x1="10" y1="12" x2="14" y2="12" />
                        </svg>
                        {acc.archived ? 'Unarchive' : 'Archive'}
                      </button>
                      <div className="wallet-context-divider" />
                      <button
                        className="wallet-context-item danger"
                        onClick={() => {
                          setContextMenuId(null);
                          if (window.confirm('Are you sure you want to permanently delete this wallet? This action cannot be undone.')) {
                            deleteAccount(acc.id);
                          }
                        }}
                        disabled={accounts.filter(a => !a.archived).length === 1 && !acc.archived}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Mini Activity Preview */}
              {recentByWallet[acc.id] && recentByWallet[acc.id].length > 0 && (
                <div className="wallet-activity-preview">
                  <div className="wallet-activity-label">Recent</div>
                  {recentByWallet[acc.id].map((txn) => {
                    const catInfo = getCategoryInfo(txn.category);
                    const isIncome = txn.type === 'income';
                    const isTransfer = txn.type === 'transfer';
                    return (
                      <div key={txn.id} className="wallet-activity-row">
                        <span className="wallet-activity-dot-indicator" style={{ background: isTransfer ? '#818cf8' : isIncome ? 'var(--color-income)' : 'var(--color-expense)' }} />
                        <span className="wallet-activity-name">
                          {isTransfer ? 'Transfer' : catInfo.name}
                          {txn.note ? ` — ${txn.note}` : ''}
                        </span>
                        <span className={`wallet-activity-amount ${isIncome ? 'income' : isTransfer ? 'transfer' : 'expense'}`}>
                          {hideBalances ? '•••' : `${isIncome ? '+' : isTransfer ? '' : '-'}${formatAmount(txn.amount, currency)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="wallet-quick-actions">
                <button
                  className="wallet-qa-btn income"
                  onClick={() => navigate(`/add?type=income&account=${acc.id}`)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add
                </button>
                <button
                  className="wallet-qa-btn expense"
                  onClick={() => navigate(`/add?type=expense&account=${acc.id}`)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Spend
                </button>
                <button
                  className="wallet-qa-btn transfer"
                  onClick={() => {
                    setFromAcc(acc.id);
                    setToAcc(accounts.find(a => a.id !== acc.id)?.id || '');
                    setShowTransferSheet(true);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 8 16 13"/><line x1="21" y1="8" x2="9" y2="8"/><polyline points="8 21 3 16 8 11"/><line x1="3" y1="16" x2="15" y2="16"/></svg>
                  Transfer
                </button>
              </div>
            </div>
          );
        };

        return (
          <>
            {/* Active wallets */}
            <div className="accounts-list">
              {activeAccounts.map((item, i) => renderWalletCard(item, i === 0 && item.index === 0))}
            </div>

            {/* Inactive wallets — collapsible */}
            {inactiveAccounts.length > 0 && (
              <div className="inactive-wallets-section">
                <button
                  className="inactive-wallets-toggle"
                  onClick={() => setShowInactive(!showInactive)}
                >
                  <span className="inactive-toggle-left">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" opacity="0.5"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    Inactive Wallets ({inactiveAccounts.length})
                  </span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: 'transform 0.2s', transform: showInactive ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {showInactive && (
                  <div className="accounts-list" style={{ marginTop: 'var(--space-3)' }}>
                    {inactiveAccounts.map((item) => renderWalletCard(item, false))}
                  </div>
                )}
              </div>
            )}

            {/* Archived wallets — collapsible */}
            {archivedAccounts.length > 0 && (
              <div className="archived-wallets-section">
                <button
                  className="inactive-wallets-toggle archived-toggle"
                  onClick={() => setShowArchived(!showArchived)}
                >
                  <span className="inactive-toggle-left">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="21 8 21 21 3 21 3 8" />
                      <rect x="1" y="3" width="22" height="5" />
                      <line x1="10" y1="12" x2="14" y2="12" />
                    </svg>
                    Archived Wallets ({archivedAccounts.length})
                  </span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: 'transform 0.2s', transform: showArchived ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {showArchived && (
                  <div className="accounts-list" style={{ marginTop: 'var(--space-3)' }}>
                    {archivedAccounts.map((item) => renderWalletCard(item, false))}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

      {/* Action buttons */}
      <div className="accounts-actions">
        <button className="btn btn-primary" onClick={openAddSheet} id="add-account-btn">
          + Add Wallet
        </button>
        <button className="btn btn-secondary" onClick={() => {
          setFromAcc(accounts[0]?.id || '');
          setToAcc(accounts[1]?.id || '');
          setShowTransferSheet(true);
        }}>
          <svg style={{marginRight: '6px'}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 8 16 13"></polyline><line x1="21" y1="8" x2="9" y2="8"></line><polyline points="8 21 3 16 8 11"></polyline><line x1="3" y1="16" x2="15" y2="16"></line></svg>
          Transfer
        </button>
      </div>

      {/* Add Account Sheet */}
      <BottomSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} title={editingId ? "Edit Wallet" : "Add Wallet"}>
        <div className="sheet-form">
          <div className="input-group">
            <label>Name</label>
            <input className="input" placeholder="e.g. Savings" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Wallet Tag</label>
            <select className="input" style={{ appearance: 'auto' }} value={newType} onChange={(e) => setNewType(e.target.value)}>
              <option value="all">Both Income & Expense</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
            </select>
          </div>
          <div className="input-group">
            <label>Icon</label>
            <div className="icon-picker">
              {ACCOUNT_ICONS.map((ic) => (
                <button key={ic} className={`icon-option ${newIcon === ic ? 'active' : ''}`} onClick={() => setNewIcon(ic)} type="button" style={{padding: '8px'}}>{renderAccountIcon(ic)}</button>
              ))}
            </div>
          </div>
          <div className="input-group">
            <label>Color</label>
            <div className="color-picker">
              {ACCOUNT_COLORS.map((c) => (
                <button key={c} className={`color-option ${newColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setNewColor(c)} type="button" />
              ))}
            </div>
          </div>
          <button className="btn btn-primary submit-btn" onClick={handleSaveAccount}>
            {editingId ? 'Save Wallet Changes' : 'Add Wallet'}
          </button>
        </div>
      </BottomSheet>

      {/* Transfer Sheet */}
      <BottomSheet isOpen={showTransferSheet} onClose={() => setShowTransferSheet(false)} title="Transfer">
        <div className="sheet-form">
          <div className="input-group" style={{ position: 'relative', zIndex: 10 }}>
            <label>From</label>
            <AccountDropdown accounts={accounts} value={fromAcc} onChange={setFromAcc} />
          </div>
          <div className="input-group" style={{ position: 'relative', zIndex: 9 }}>
            <label>To</label>
            <AccountDropdown accounts={accounts.filter((a) => a.id !== fromAcc)} value={toAcc} onChange={setToAcc} />
          </div>
          <div className="input-group">
            <label>Amount</label>
            <CalculatorInput value={transferAmt} onChange={setTransferAmt} />
          </div>
          <button className="btn btn-primary submit-btn" onClick={handleTransfer}>Transfer</button>
        </div>
      </BottomSheet>
    </div>
  );
}
