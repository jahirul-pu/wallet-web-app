import { useState } from 'react';
import { useAccountStore } from '../stores/useAccountStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { formatAmount } from '../utils/currencies';
import { renderAccountIcon } from '../utils/accountIcons';
import BottomSheet from '../components/BottomSheet';
import AccountDropdown from '../components/AccountDropdown';
import CalculatorInput from '../components/CalculatorInput';
import './Accounts.css';

const ACCOUNT_ICONS = ['💵', '🏦', '📱', '💳', '💼', '🪙', '💰', '🏧', '👛'];
const ACCOUNT_COLORS = ['var(--color-income)', '#6366f1', '#ec4899', '#f59e0b', '#0ea5e9', '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16'];


export default function Accounts() {
  const accounts = useAccountStore((s) => s.accounts);
  const addAccount = useAccountStore((s) => s.addAccount);
  const updateAccount = useAccountStore((s) => s.updateAccount);
  const deleteAccount = useAccountStore((s) => s.deleteAccount);
  const getTotalBalance = useAccountStore((s) => s.getTotalBalance);
  const transfer = useAccountStore((s) => s.transfer);
  const reorderAccounts = useAccountStore((s) => s.reorderAccounts);
  const currency = useSettingsStore((s) => s.currency);

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('💵');
  const [newColor, setNewColor] = useState('#10b981');
  const [newType, setNewType] = useState('all');
  
  const [fromAcc, setFromAcc] = useState('');
  const [toAcc, setToAcc] = useState('');
  const [transferAmt, setTransferAmt] = useState('');

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
        {accounts.map((acc, index) => (
          <div key={acc.id} className="account-card card">
            <div className="account-card-left" onClick={() => openEditSheet(acc)} style={{ cursor: 'pointer', flex: 1 }}>
              <div
                className="account-card-icon"
                style={{ background: `${acc.color}18`, color: acc.color }}
              >
                {renderAccountIcon(acc.icon)}
              </div>
              <div>
                <div className="account-card-name">
                  {acc.name}
                  {acc.type && acc.type !== 'all' && (
                    <span style={{ fontSize: '0.65rem', marginLeft: '6px', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', textTransform: 'uppercase', verticalAlign: 'middle', opacity: 0.8 }}>
                      {acc.type}
                    </span>
                  )}
                </div>
                <div
                  className="account-card-balance"
                  style={{ color: acc.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
                >
                  {formatAmount(acc.balance, currency)}
                </div>
              </div>
            </div>
            
            <div className="account-card-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div className="account-card-reorder" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button 
                  className="btn-icon" 
                  onClick={() => reorderAccounts(index, index - 1)}
                  disabled={index === 0}
                  style={{ padding: '2px', opacity: index === 0 ? 0.3 : 1, background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', color: 'var(--color-text-secondary)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                </button>
                <button 
                  className="btn-icon" 
                  onClick={() => reorderAccounts(index, index + 1)}
                  disabled={index === accounts.length - 1}
                  style={{ padding: '2px', opacity: index === accounts.length - 1 ? 0.3 : 1, background: 'none', border: 'none', cursor: index === accounts.length - 1 ? 'default' : 'pointer', color: 'var(--color-text-secondary)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
              </div>

              <button
                className="btn btn-icon btn-secondary"
                onClick={() => {
                  if (window.confirm('Delete this wallet? Transferred transactions might lose reference.')) {
                    deleteAccount(acc.id);
                  }
                }}
                style={{ fontSize: 'var(--text-sm)', padding: '10px' }}
                disabled={accounts.length === 1}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

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
