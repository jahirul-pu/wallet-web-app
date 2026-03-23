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
  const [sortMode, setSortMode] = useState('recent');
  const [moreMenuId, setMoreMenuId] = useState(null);

  // New debt form
  const [newPerson, setNewPerson] = useState('');
  const [newType, setNewType] = useState('i_owe');
  const [newAmount, setNewAmount] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [remindOneDayBefore, setRemindOneDayBefore] = useState(true);
  const [remindOnDueDate, setRemindOnDueDate] = useState(true);

  const getActiveReminders = useDebtStore((s) => s.getActiveReminders);
  const activeReminders = useMemo(() => getActiveReminders(), [debts, getActiveReminders]);

  const filteredDebts = debts.filter((d) => d.status === tab);

  const netPosition = totalOwedToMe - totalIOwe;

  const sortedDebts = useMemo(() => {
    const list = [...filteredDebts];
    switch (sortMode) {
      case 'due_soon':
        return list.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
      case 'largest':
        return list.sort((a, b) => (b.totalAmount - b.paidAmount) - (a.totalAmount - a.paidAmount));
      case 'updated':
        return list.sort((a, b) => {
          const aLast = a.payments.length ? new Date(a.payments[a.payments.length - 1].date) : new Date(a.createdAt);
          const bLast = b.payments.length ? new Date(b.payments[b.payments.length - 1].date) : new Date(b.createdAt);
          return bLast - aLast;
        });
      case 'recent':
      default:
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }, [filteredDebts, sortMode]);

  const handleAddDebt = () => {
    if (!newPerson || !newAmount) return;
    addDebt({
      personName: newPerson,
      type: newType,
      totalAmount: newAmount,
      reason: newReason,
      dueDate: newDueDate || null,
      reminders: { oneDayBefore: remindOneDayBefore, onDueDate: remindOnDueDate },
    });

    // Credit/debit to wallet if an actual account is selected
    if (selectedAccountId) {
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
    setSelectedAccountId('');
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

      {/* Summary — Enhanced */}
      <div className="debt-summary-insight">
        <div className="debt-summary-cards">
          <div className="debt-summary-card card">
            <div className="debt-summary-label">
              <svg style={{display:'inline-block', verticalAlign:'middle', marginRight:'6px'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              You'll Receive
            </div>
            <div className="debt-summary-value income">{formatAmount(totalOwedToMe, currency)}</div>
          </div>
          <div className="debt-summary-card card">
            <div className="debt-summary-label">
              <svg style={{display:'inline-block', verticalAlign:'middle', marginRight:'6px'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              You Owe
            </div>
            <div className="debt-summary-value expense">{formatAmount(totalIOwe, currency)}</div>
          </div>
        </div>
        <div className={`debt-net-position ${netPosition >= 0 ? 'positive' : 'negative'}`}>
          <span className="net-label">Net Position</span>
          <span className="net-value">{netPosition >= 0 ? '+' : ''}{formatAmount(netPosition, currency)}</span>
        </div>
      </div>

      {/* Active Alerts */}
      {tab === 'active' && activeReminders.length > 0 && (
        <div className="debt-reminders-alerts">
          <div className="reminders-alert-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Upcoming Reminders
          </div>
          <div className="reminders-alert-list">
            {activeReminders.map(d => {
              const today = new Date().toISOString().split('T')[0];
              const isToday = d.dueDate === today;
              return (
                <div key={d.id} className="reminders-alert-item" onClick={() => {
                  const el = document.getElementById(`debt-${d.id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el?.classList.add('highlight-flash');
                  setTimeout(() => el?.classList.remove('highlight-flash'), 2000);
                }}>
                  <div className="alert-item-time">{isToday ? 'TODAY' : 'TOMORROW'}</div>
                  <div className="alert-item-text">{d.type === 'i_owe' ? 'Pay' : 'Collect from'} <strong>{d.personName}</strong>: {formatAmount(d.totalAmount - d.paidAmount, currency)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs + Sort */}
      <div className="debt-tabs">
        <button className={`debt-tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          Active ({debts.filter((d) => d.status === 'active').length})
        </button>
        <button className={`debt-tab ${tab === 'paid' ? 'active' : ''}`} onClick={() => setTab('paid')}>
          Settled ({debts.filter((d) => d.status === 'paid').length})
        </button>
      </div>

      {/* Sort Bar */}
      <div className="debt-sort-bar">
        <span className="debt-sort-label">Sort:</span>
        {[
          { key: 'recent', label: 'Recent' },
          { key: 'due_soon', label: 'Due Soon' },
          { key: 'largest', label: 'Largest' },
          { key: 'updated', label: 'Updated' },
        ].map((s) => (
          <button
            key={s.key}
            className={`debt-sort-chip ${sortMode === s.key ? 'active' : ''}`}
            onClick={() => setSortMode(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Debt list */}
      {sortedDebts.length > 0 ? (
        <div className="debt-list">
          {sortedDebts.map((d) => {
            const remaining = d.totalAmount - d.paidAmount;
            const pct = (d.paidAmount / d.totalAmount) * 100;
            const overdue = isOverdue(d.dueDate) && d.status === 'active';
            const days = daysUntil(d.dueDate);

            return (
              <div key={d.id} id={`debt-${d.id}`} className={`debt-card card ${overdue ? 'overdue' : ''}`}>
                <div className="debt-card-header">
                  <div>
                    <div className="debt-card-person">{d.personName}</div>
                    <div className={`debt-card-type ${d.type}`}>
                      {d.type === 'owed_to_me' 
                        ? <><svg style={{display:'inline-block', verticalAlign:'middle', marginRight:'4px'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg> They owe you</>
                        : <><svg style={{display:'inline-block', verticalAlign:'middle', marginRight:'4px'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="7" x2="7" y2="17"></line><polyline points="17 17 7 17 7 7"></polyline></svg> You owe them</>
                      }
                    </div>
                    <div className="debt-card-date">Since {formatDate(d.createdAt)}</div>
                  </div>
                  <div className="debt-card-amount">
                    {formatAmount(remaining, currency)}
                    <div className="debt-card-total">of {formatAmount(d.totalAmount, currency)}</div>
                  </div>
                </div>

                {d.reason && <div className="debt-card-reason">{d.reason}</div>}

                <div className="debt-progress-section">
                  <div className="debt-progress-labels">
                    <span className="debt-progress-paid">
                      {formatAmount(d.paidAmount, currency)} <span className="debt-progress-of">/ {formatAmount(d.totalAmount, currency)}</span>
                    </span>
                    <span className={`debt-progress-pct ${pct >= 100 ? 'complete' : pct >= 75 ? 'high' : ''}`}>
                      {Math.round(pct)}% paid
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-bar-fill ${d.type === 'i_owe' ? 'payable' : 'receivable'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  {remaining > 0 && (
                    <div className="debt-progress-remaining">
                      Remaining: <strong>{formatAmount(remaining, currency)}</strong>
                    </div>
                  )}
                </div>

                <div className="debt-card-meta">
                  {d.dueDate && d.status === 'active' && (() => {
                    let urgencyClass = 'urgency-neutral';
                    let text = `Due in ${days} day${days !== 1 ? 's' : ''}`;
                    
                    if (days < 0) {
                      urgencyClass = 'urgency-critical';
                      text = `🚨 Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`;
                    } else if (days <= 2) {
                      urgencyClass = 'urgency-warning';
                      text = days === 0 ? '⚠ Due Today!' : `⚠ Due in ${days} day${days !== 1 ? 's' : ''}`;
                    }

                    return (
                      <span className={`urgency-badge ${urgencyClass}`}>
                        {text}
                      </span>
                    );
                  })()}
                  {d.dueDate && d.status === 'paid' && (
                    <span className="urgency-settled">
                      ✅ Settled
                    </span>
                  )}
                  {d.payments.length > 0 && (
                    <span>{d.payments.length} payment{d.payments.length > 1 ? 's' : ''}</span>
                  )}
                  {d.status === 'active' && d.dueDate && (
                    <div className="debt-card-reminders-tags">
                      {d.reminders?.oneDayBefore && <span className="reminder-tag">1d before</span>}
                      {d.reminders?.onDueDate && <span className="reminder-tag">on due date</span>}
                      {!d.reminders?.oneDayBefore && !d.reminders?.onDueDate && <span className="reminder-tag muted">reminders off</span>}
                    </div>
                  )}
                </div>

                {d.payments.length > 0 && (
                  <div className="debt-timeline-container">
                    <div className="debt-timeline-header">Payment Timeline</div>
                    <div className="debt-timeline">
                      {/* Evolution of payments */}
                      {(() => {
                        let currentRunningBalance = d.totalAmount;
                        const timelineItems = [];

                        // 1. Initial State
                        timelineItems.push(
                          <div key="start" className="timeline-item start">
                            <div className="timeline-dot"></div>
                            <div className="timeline-content">
                              <div className="timeline-row">
                                <span className="timeline-label">Initial Amount</span>
                                <span className="timeline-value">{formatAmount(d.totalAmount, currency)}</span>
                              </div>
                            </div>
                          </div>
                        );

                        // 2. Payments
                        d.payments
                          .sort((a, b) => new Date(a.date) - new Date(b.date))
                          .forEach((p) => {
                            currentRunningBalance -= p.amount;
                            timelineItems.push(
                              <div key={p.id} className="timeline-item payment">
                                <div className="timeline-dot"></div>
                                <div className="timeline-content">
                                  <div className="timeline-row">
                                    <span className="timeline-date">{formatDate(p.date)}</span>
                                    <span className="timeline-amount">{formatAmount(p.amount, currency)}</span>
                                  </div>
                                  {p.note && <div className="timeline-note">{p.note}</div>}
                                  <div className="timeline-remaining">
                                    Remaining: {formatAmount(Math.max(0, currentRunningBalance), currency)}
                                  </div>
                                  <div className="timeline-actions">
                                    <button onClick={() => openEditPaySheet(d, p)}>Edit</button>
                                    <button className="danger" onClick={() => { if(window.confirm('Delete this payment record?')) deletePayment(d.id, p.id); }}>Delete</button>
                                  </div>
                                </div>
                              </div>
                            );
                          });

                        return timelineItems;
                      })()}
                    </div>
                  </div>
                )}

                {d.status === 'active' ? (
                  <div className="debt-card-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => openPaySheet(d)}>
                      + Payment
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => markAsPaid(d.id)}>
                      Settle {formatAmount(remaining, currency)}
                    </button>
                    <div className="debt-more-menu-wrapper">
                      <button
                        className="btn btn-icon btn-sm debt-more-btn"
                        onClick={() => setMoreMenuId(moreMenuId === d.id ? null : d.id)}
                      >
                        ⋮
                      </button>
                      {moreMenuId === d.id && (
                        <div className="debt-more-dropdown">
                          <button onClick={() => { if(window.confirm(`Delete this ${d.status} debt?`)) { deleteDebt(d.id); setMoreMenuId(null); } }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="debt-card-actions" style={{ marginTop: '16px' }}>
                    <div className="debt-more-menu-wrapper">
                      <button
                        className="btn btn-icon btn-sm debt-more-btn"
                        onClick={() => setMoreMenuId(moreMenuId === d.id ? null : d.id)}
                      >
                        ⋮
                      </button>
                      {moreMenuId === d.id && (
                        <div className="debt-more-dropdown">
                          <button onClick={() => { if(window.confirm('Delete this settled debt record?')) { deleteDebt(d.id); setMoreMenuId(null); } }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Delete Record
                          </button>
                        </div>
                      )}
                    </div>
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

          {/* Reminder settings */}
          {newDueDate && (
            <div className="input-group">
              <label>Remind Me</label>
              <div className="reminder-toggles">
                <div className="reminder-toggle-item" onClick={() => setRemindOneDayBefore(!remindOneDayBefore)}>
                  <div className={`reminder-checkbox ${remindOneDayBefore ? 'checked' : ''}`} />
                  <span>1 day before</span>
                </div>
                <div className="reminder-toggle-item" onClick={() => setRemindOnDueDate(!remindOnDueDate)}>
                  <div className={`reminder-checkbox ${remindOnDueDate ? 'checked' : ''}`} />
                  <span>On due date</span>
                </div>
              </div>
            </div>
          )}

          {/* Always-visible Account Picker */}
          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{newType === 'i_owe' ? 'Receive into Wallet' : 'Pay from Wallet'}</span>
            </label>
            <div className="debt-account-picker">
              {/* "None" Option */}
              <button
                type="button"
                className={`debt-account-option ${!selectedAccountId ? 'active' : ''}`}
                onClick={() => setSelectedAccountId('')}
              >
                <span className="debt-account-icon" style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </span>
                <span>None</span>
              </button>

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

          <button className={`btn submit-btn ${newType === 'owed_to_me' ? 'btn-income' : 'btn-expense'}`} onClick={handleAddDebt}>Add</button>
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
          <button className={`btn submit-btn ${selectedDebt?.type === 'owed_to_me' ? 'btn-income' : 'btn-expense'}`} onClick={handlePay}>{selectedPaymentId ? 'Update Payment' : 'Record Payment'}</button>
        </div>
      </BottomSheet>
    </div>
  );
}
