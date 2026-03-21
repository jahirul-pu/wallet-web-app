import { useState, useMemo } from 'react';
import { useDebtStore } from '../stores/useDebtStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { formatAmount } from '../utils/currencies';
import { formatDate, isOverdue, daysUntil, toInputDate } from '../utils/dateFormat';
import { getAccountIcon } from '../utils/accountIcons';
import BottomSheet from '../components/BottomSheet';
import DatePicker from '../components/DatePicker';
import CalculatorInput from '../components/CalculatorInput';
import './Debts.css';

export default function Debts() {
  const debts = useDebtStore((s) => s.debts);
  const addDebt = useDebtStore((s) => s.addDebt);
  const addPayment = useDebtStore((s) => s.addPayment);
  const markAsPaid = useDebtStore((s) => s.markAsPaid);
  const deleteDebt = useDebtStore((s) => s.deleteDebt);
  const deletePayment = useDebtStore((s) => s.deletePayment);
  const editPayment = useDebtStore((s) => s.editPayment);
  const currency = useSettingsStore((s) => s.currency);
  const accounts = useAccountStore((s) => s.accounts);
  const adjustBalance = useAccountStore((s) => s.adjustBalance);
  const addTransaction = useTransactionStore((s) => s.addTransaction);

  const { totalOwedToMe, totalIOwe } = useMemo(() => ({
    totalOwedToMe: debts.filter((d) => d.type === 'owed_to_me' && d.status === 'active').reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0),
    totalIOwe: debts.filter((d) => d.type === 'i_owe' && d.status === 'active').reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0),
  }), [debts]);

  const [tab, setTab] = useState('active');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showPaySheet, setShowPaySheet] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payDate, setPayDate] = useState('');

  // New debt form
  const [newPerson, setNewPerson] = useState('');
  const [newType, setNewType] = useState('i_owe');
  const [newAmount, setNewAmount] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [creditToWallet, setCreditToWallet] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');

  const filteredDebts = debts.filter((d) => d.status === tab);

  const handleAddDebt = () => {
    if (!newPerson || !newAmount) return;
    addDebt({
      personName: newPerson,
      type: newType,
      totalAmount: newAmount,
      reason: newReason,
      dueDate: newDueDate || null,
    });

    // Credit/debit to wallet if enabled
    if (creditToWallet && selectedAccountId) {
      const amt = Number(newAmount);
      if (newType === 'i_owe') {
        // Loan received → money comes IN to your wallet
        adjustBalance(selectedAccountId, amt, 'income');
        addTransaction({
          type: 'income',
          amount: amt,
          category: 'other',
          date: toInputDate(),
          note: `Loan from ${newPerson}${newReason ? ' — ' + newReason : ''}`,
          accountId: selectedAccountId,
        });
      } else {
        // Lent money → money goes OUT from your wallet
        adjustBalance(selectedAccountId, amt, 'expense');
        addTransaction({
          type: 'expense',
          amount: amt,
          category: 'other',
          date: toInputDate(),
          note: `Lent to ${newPerson}${newReason ? ' — ' + newReason : ''}`,
          accountId: selectedAccountId,
        });
      }
    }

    setNewPerson(''); setNewAmount(''); setNewReason(''); setNewDueDate('');
    setCreditToWallet(false);
    setShowAddSheet(false);
  };

  const handlePay = () => {
    if (!payAmount || !selectedDebt) return;
    if (selectedPaymentId) {
      editPayment(selectedDebt.id, selectedPaymentId, Number(payAmount), payNote, payDate);
    } else {
      addPayment(selectedDebt.id, Number(payAmount), payNote, payDate);
    }
    setPayAmount(''); setPayNote(''); setPayDate(''); setSelectedPaymentId(null);
    setShowPaySheet(false);
  };

  const openPaySheet = (debt) => {
    setSelectedDebt(debt);
    setSelectedPaymentId(null);
    setPayAmount('');
    setPayNote('');
    setPayDate(toInputDate());
    setShowPaySheet(true);
  };

  const openEditPaySheet = (debt, p) => {
    setSelectedDebt(debt);
    setSelectedPaymentId(p.id);
    setPayAmount(p.amount.toString());
    setPayNote(p.note || '');
    setPayDate(toInputDate(p.date));
    setShowPaySheet(true);
  };

  return (
    <div className="page" id="debts-page">
      <h1 className="page-title">Debts & Loans</h1>

      {/* Summary */}
      <div className="debt-summary-cards">
        <div className="debt-summary-card card">
          <div className="debt-summary-label">
            <svg style={{display:'inline-block', verticalAlign:'middle', marginRight:'6px'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Receivable
          </div>
          <div className="debt-summary-value income">{formatAmount(totalOwedToMe, currency)}</div>
        </div>
        <div className="debt-summary-card card">
          <div className="debt-summary-label">
            <svg style={{display:'inline-block', verticalAlign:'middle', marginRight:'6px'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            Payable
          </div>
          <div className="debt-summary-value expense">{formatAmount(totalIOwe, currency)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="debt-tabs">
        <button className={`debt-tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          Active ({debts.filter((d) => d.status === 'active').length})
        </button>
        <button className={`debt-tab ${tab === 'paid' ? 'active' : ''}`} onClick={() => setTab('paid')}>
          Settled ({debts.filter((d) => d.status === 'paid').length})
        </button>
      </div>

      {/* Debt list */}
      {filteredDebts.length > 0 ? (
        <div className="debt-list">
          {filteredDebts.map((d) => {
            const remaining = d.totalAmount - d.paidAmount;
            const pct = (d.paidAmount / d.totalAmount) * 100;
            const overdue = isOverdue(d.dueDate) && d.status === 'active';
            const days = daysUntil(d.dueDate);

            return (
              <div key={d.id} className={`debt-card card ${overdue ? 'overdue' : ''}`}>
                <div className="debt-card-header">
                  <div>
                    <div className="debt-card-person">{d.personName}</div>
                    <div className={`debt-card-type ${d.type}`}>
                      {d.type === 'owed_to_me' 
                        ? <><svg style={{display:'inline-block', verticalAlign:'middle', marginRight:'4px'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg> They owe you</>
                        : <><svg style={{display:'inline-block', verticalAlign:'middle', marginRight:'4px'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="7" x2="7" y2="17"></line><polyline points="17 17 7 17 7 7"></polyline></svg> You owe them</>
                      }
                    </div>
                  </div>
                  <div className="debt-card-amount">
                    {formatAmount(remaining, currency)}
                    <div className="debt-card-total">of {formatAmount(d.totalAmount, currency)}</div>
                  </div>
                </div>

                {d.reason && <div className="debt-card-reason">{d.reason}</div>}

                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>

                <div className="debt-card-meta">
                  {d.dueDate && (
                    <span className={overdue ? 'overdue-text' : ''}>
                      {overdue ? <><svg style={{display:'inline-block', verticalAlign:'middle', marginRight:'4px'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Overdue by {Math.abs(days)} days</> : `Due: ${formatDate(d.dueDate)}`}
                    </span>
                  )}
                  {d.payments.length > 0 && (
                    <span>{d.payments.length} payment{d.payments.length > 1 ? 's' : ''}</span>
                  )}
                </div>

                {d.payments.length > 0 && (
                  <div className="debt-payments-breakdown" style={{ marginTop: 'var(--space-3)', background: 'var(--color-bg-input)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '8px', letterSpacing: '1px' }}>Payment History</div>
                    {d.payments.map((p, index) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: index === d.payments.length - 1 ? 0 : '8px', fontSize: 'var(--text-sm)', borderBottom: index === d.payments.length - 1 ? 'none' : '1px solid var(--color-border)', paddingBottom: index === d.payments.length - 1 ? 0 : '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: 'var(--color-text-primary)' }}>{formatDate(p.date)}</div>
                          {p.note && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{p.note}</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ fontWeight: '500' }}>{formatAmount(p.amount, currency)}</div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button style={{ background: 'none', border: 'none', color: 'var(--color-primary)', padding: '4px', cursor: 'pointer', display: 'flex' }} onClick={() => openEditPaySheet(d, p)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            </button>
                            <button style={{ background: 'none', border: 'none', color: 'var(--color-danger)', padding: '4px', cursor: 'pointer', display: 'flex' }} onClick={() => { if(window.confirm('Delete this payment record?')) deletePayment(d.id, p.id); }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {d.status === 'active' ? (
                  <div className="debt-card-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => openPaySheet(d)}>
                      + Payment
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => markAsPaid(d.id)}>
                       Settle
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => { if(window.confirm('Delete this active debt?')) deleteDebt(d.id); }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </div>
                ) : (
                  <div className="debt-card-actions" style={{ marginTop: '16px' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => { if(window.confirm('Delete this settled debt record?')) deleteDebt(d.id); }}>
                      Delete Settled Record
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <p>{tab === 'active' ? 'No active debts or loans' : 'No settled debts'}</p>
        </div>
      )}

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-4)' }} onClick={() => setShowAddSheet(true)} id="add-debt-btn">
        + Add Debt / Loan
      </button>

      {/* Add Debt Sheet */}
      <BottomSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} title="Add Debt / Loan">
        <div className="sheet-form">
          <div className="type-selector" style={{ marginBottom: 0 }}>
            <button className={`type-btn ${newType === 'i_owe' ? 'active expense' : ''}`} onClick={() => setNewType('i_owe')} type="button">I Owe</button>
            <button className={`type-btn ${newType === 'owed_to_me' ? 'active income' : ''}`} onClick={() => setNewType('owed_to_me')} type="button">Owed to Me</button>
          </div>
          <div className="input-group"><label>Person Name</label><input className="input" placeholder="Who?" value={newPerson} onChange={(e) => setNewPerson(e.target.value)} /></div>
          <div className="input-group"><label>Amount</label><CalculatorInput value={newAmount} onChange={setNewAmount} /></div>
          <div className="input-group"><label>Reason (optional)</label><input className="input" placeholder="What for?" value={newReason} onChange={(e) => setNewReason(e.target.value)} /></div>
          <div className="input-group" style={{ position: 'relative', zIndex: 8 }}><label>Due Date (optional)</label><DatePicker value={newDueDate} onChange={setNewDueDate} /></div>

          {/* Credit/Debit to Wallet */}
          <div className="input-group">
            <label className="qa-wallet-toggle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
              <span>{newType === 'i_owe' ? 'Credit to a Wallet' : 'Debit from a Wallet'}</span>
              <div style={{ position: 'relative' }}>
                <input type="checkbox" checked={creditToWallet} onChange={(e) => setCreditToWallet(e.target.checked)} style={{ display: 'none' }} />
                <div className={`toggle-switch ${creditToWallet ? 'on' : ''}`} style={{ width: '44px', height: '24px', background: creditToWallet ? 'var(--color-accent)' : 'var(--color-bg-input)', borderRadius: '12px', position: 'relative', transition: 'all 150ms ease', border: `1px solid ${creditToWallet ? 'var(--color-accent)' : 'var(--color-border)'}`, cursor: 'pointer' }}>
                  <div style={{ width: '18px', height: '18px', background: creditToWallet ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)', borderRadius: '50%', position: 'absolute', top: '2px', left: creditToWallet ? '22px' : '2px', transition: 'all 150ms ease' }} />
                </div>
              </div>
            </label>
          </div>

          {creditToWallet && (
            <div className="input-group">
              <label>{newType === 'i_owe' ? 'Receive money into' : 'Send money from'}</label>
              <div className="debt-account-picker">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    className={`debt-account-option ${selectedAccountId === acc.id ? 'active' : ''}`}
                    onClick={() => setSelectedAccountId(acc.id)}
                  >
                    <span className="debt-account-icon" style={{ background: `${acc.color}18`, color: acc.color }}>
                      {getAccountIcon(acc, 18)}
                    </span>
                    <span>{acc.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button className="btn btn-primary submit-btn" onClick={handleAddDebt}>Add</button>
        </div>
      </BottomSheet>

      {/* Payment Sheet */}
      <BottomSheet isOpen={showPaySheet} onClose={() => { setShowPaySheet(false); setSelectedPaymentId(null); }} title={selectedPaymentId ? `Edit Payment for ${selectedDebt?.personName}` : `Pay ${selectedDebt?.personName || ''}`}>
        <div className="sheet-form">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2)' }}>
            <div className="debt-card-total">Remaining: {formatAmount((selectedDebt?.totalAmount || 0) - (selectedDebt?.paidAmount || 0) + (selectedPaymentId ? selectedDebt?.payments.find(p => p.id === selectedPaymentId)?.amount || 0 : 0), currency)}</div>
          </div>
          <div className="input-group"><label>Payment Amount</label><CalculatorInput value={payAmount} onChange={setPayAmount} /></div>
          <div className="input-group" style={{ position: 'relative', zIndex: 8 }}><label>Date</label><DatePicker value={payDate} onChange={setPayDate} /></div>
          <div className="input-group"><label>Note (optional)</label><input className="input" placeholder="Payment note..." value={payNote} onChange={(e) => setPayNote(e.target.value)} /></div>
          <button className="btn btn-primary submit-btn" onClick={handlePay}>{selectedPaymentId ? 'Update Payment' : 'Record Payment'}</button>
        </div>
      </BottomSheet>
    </div>
  );
}
