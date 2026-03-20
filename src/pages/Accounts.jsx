import { useState } from 'react';
import { useAccountStore } from '../stores/useAccountStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { formatAmount } from '../utils/currencies';
import BottomSheet from '../components/BottomSheet';
import './Accounts.css';

const ACCOUNT_ICONS = ['💵', '🏦', '📱', '💳', '🪙', '💰', '🏧', '👛'];
const ACCOUNT_COLORS = ['#6FFBBE', '#6366f1', '#ec4899', '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16'];

const renderIcon = (ic) => {
  const sf = { width: 22, height: 22, fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" };
  switch(ic) {
    case '💵': return <svg {...sf} viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>;
    case '🏦': return <svg {...sf} viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M4 21v-4"/><path d="M20 21v-4"/><path d="M8 21v-4"/><path d="M12 21v-4"/><path d="M16 21v-4"/><path d="M2 9L12 2l10 7v4H2V9z"/></svg>;
    case '📱': return <svg {...sf} viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
    case '💳': return <svg {...sf} viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
    case '🪙': return <svg {...sf} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="12" y1="2" x2="12" y2="6"/></svg>;
    case '💰': return <svg {...sf} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case '🏧': return <svg {...sf} viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><rect x="6" y="5" width="12" height="6"/><rect x="8" y="14" width="8" height="2"/></svg>;
    case '👛': return <svg {...sf} viewBox="0 0 24 24"><path d="M4 8h16l1 12H3L4 8z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg>;
    default: return ic;
  }
};

export default function Accounts() {
  const accounts = useAccountStore((s) => s.accounts);
  const addAccount = useAccountStore((s) => s.addAccount);
  const deleteAccount = useAccountStore((s) => s.deleteAccount);
  const getTotalBalance = useAccountStore((s) => s.getTotalBalance);
  const transfer = useAccountStore((s) => s.transfer);
  const currency = useSettingsStore((s) => s.currency);

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('💵');
  const [newColor, setNewColor] = useState('#10b981');
  const [fromAcc, setFromAcc] = useState('');
  const [toAcc, setToAcc] = useState('');
  const [transferAmt, setTransferAmt] = useState('');

  const handleAddAccount = () => {
    if (!newName.trim()) return;
    addAccount({ name: newName, icon: newIcon, color: newColor });
    setNewName('');
    setShowAddSheet(false);
  };

  const handleTransfer = () => {
    if (!fromAcc || !toAcc || fromAcc === toAcc || !transferAmt) return;
    transfer(fromAcc, toAcc, Number(transferAmt));
    setTransferAmt('');
    setShowTransferSheet(false);
  };

  return (
    <div className="page" id="accounts-page">
      <h1 className="page-title">Wallets</h1>

      {/* Total */}
      <div className="accounts-total gradient-card">
        <div className="accounts-total-label">Net Worth</div>
        <div className="accounts-total-amount" style={{ position: 'relative', zIndex: 1 }}>
          {formatAmount(getTotalBalance(), currency)}
        </div>
      </div>

      {/* Account list */}
      <div className="accounts-list">
        {accounts.map((acc) => (
          <div key={acc.id} className="account-card card">
            <div className="account-card-left">
              <div
                className="account-card-icon"
                style={{ background: `${acc.color}18`, color: acc.color }}
              >
                {renderIcon(acc.icon)}
              </div>
              <div>
                <div className="account-card-name">{acc.name}</div>
                <div
                  className="account-card-balance"
                  style={{ color: acc.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
                >
                  {formatAmount(acc.balance, currency)}
                </div>
              </div>
            </div>
            {!['cash', 'bank', 'mobile', 'card'].includes(acc.id) && (
              <button
                className="btn btn-icon btn-secondary"
                onClick={() => deleteAccount(acc.id)}
                style={{ fontSize: 'var(--text-sm)', padding: '10px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="accounts-actions">
        <button className="btn btn-primary" onClick={() => setShowAddSheet(true)} id="add-account-btn">
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
      <BottomSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} title="Add Wallet">
        <div className="sheet-form">
          <div className="input-group">
            <label>Name</label>
            <input className="input" placeholder="e.g. Savings" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Icon</label>
            <div className="icon-picker">
              {ACCOUNT_ICONS.map((ic) => (
                <button key={ic} className={`icon-option ${newIcon === ic ? 'active' : ''}`} onClick={() => setNewIcon(ic)} type="button" style={{padding: '8px'}}>{renderIcon(ic)}</button>
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
          <button className="btn btn-primary submit-btn" onClick={handleAddAccount}>Add Wallet</button>
        </div>
      </BottomSheet>

      {/* Transfer Sheet */}
      <BottomSheet isOpen={showTransferSheet} onClose={() => setShowTransferSheet(false)} title="Transfer">
        <div className="sheet-form">
          <div className="input-group">
            <label>From</label>
            <select className="select" value={fromAcc} onChange={(e) => setFromAcc(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>To</label>
            <select className="select" value={toAcc} onChange={(e) => setToAcc(e.target.value)}>
              {accounts.filter((a) => a.id !== fromAcc).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Amount</label>
            <input className="input" type="number" placeholder="0.00" value={transferAmt} onChange={(e) => setTransferAmt(e.target.value)} min="0" step="0.01" />
          </div>
          <button className="btn btn-primary submit-btn" onClick={handleTransfer}>Transfer</button>
        </div>
      </BottomSheet>
    </div>
  );
}
