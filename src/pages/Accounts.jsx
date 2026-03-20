import { useState } from 'react';
import { useAccountStore } from '../stores/useAccountStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { formatAmount } from '../utils/currencies';
import BottomSheet from '../components/BottomSheet';
import './Accounts.css';

const ACCOUNT_ICONS = ['💵', '🏦', '📱', '💳', '🪙', '💰', '🏧', '👛'];
const ACCOUNT_COLORS = ['#10b981', '#6366f1', '#ec4899', '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16'];

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
                {acc.icon}
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
                style={{ fontSize: 'var(--text-sm)' }}
              >
                🗑️
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
          ⇄ Transfer
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
                <button key={ic} className={`icon-option ${newIcon === ic ? 'active' : ''}`} onClick={() => setNewIcon(ic)} type="button">{ic}</button>
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
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>To</label>
            <select className="select" value={toAcc} onChange={(e) => setToAcc(e.target.value)}>
              {accounts.filter((a) => a.id !== fromAcc).map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
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
