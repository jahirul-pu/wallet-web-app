import { useState, useMemo } from 'react';
import { useDebtStore } from '../stores/useDebtStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { formatAmount } from '../utils/currencies';
import { formatDate, isOverdue, daysUntil } from '../utils/dateFormat';
import BottomSheet from '../components/BottomSheet';
import './Debts.css';

export default function Debts() {
  const debts = useDebtStore((s) => s.debts);
  const addDebt = useDebtStore((s) => s.addDebt);
  const addPayment = useDebtStore((s) => s.addPayment);
  const markAsPaid = useDebtStore((s) => s.markAsPaid);
  const deleteDebt = useDebtStore((s) => s.deleteDebt);
  const currency = useSettingsStore((s) => s.currency);

  const { totalOwedToMe, totalIOwe } = useMemo(() => ({
    totalOwedToMe: debts.filter((d) => d.type === 'owed_to_me' && d.status === 'active').reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0),
    totalIOwe: debts.filter((d) => d.type === 'i_owe' && d.status === 'active').reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0),
  }), [debts]);

  const [tab, setTab] = useState('active');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showPaySheet, setShowPaySheet] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  // New debt form
  const [newPerson, setNewPerson] = useState('');
  const [newType, setNewType] = useState('i_owe');
  const [newAmount, setNewAmount] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

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
    setNewPerson(''); setNewAmount(''); setNewReason(''); setNewDueDate('');
    setShowAddSheet(false);
  };

  const handlePay = () => {
    if (!payAmount || !selectedDebt) return;
    addPayment(selectedDebt.id, Number(payAmount), payNote);
    setPayAmount(''); setPayNote('');
    setShowPaySheet(false);
  };

  const openPaySheet = (debt) => {
    setSelectedDebt(debt);
    setPayAmount('');
    setPayNote('');
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
                    <span>{d.payments.length} payment{d.payments.length > 1 ? 's' : ''} made</span>
                  )}
                </div>

                {d.status === 'active' && (
                  <div className="debt-card-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => openPaySheet(d)}>
                      + Payment
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => markAsPaid(d.id)}>
                       Settle
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteDebt(d.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
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
          <div className="input-group"><label>Amount</label><input className="input" type="number" placeholder="0.00" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} min="0" /></div>
          <div className="input-group"><label>Reason (optional)</label><input className="input" placeholder="What for?" value={newReason} onChange={(e) => setNewReason(e.target.value)} /></div>
          <div className="input-group"><label>Due Date (optional)</label><input className="input" type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} /></div>
          <button className="btn btn-primary submit-btn" onClick={handleAddDebt}>Add</button>
        </div>
      </BottomSheet>

      {/* Payment Sheet */}
      <BottomSheet isOpen={showPaySheet} onClose={() => setShowPaySheet(false)} title={`Pay ${selectedDebt?.personName || ''}`}>
        <div className="sheet-form">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2)' }}>
            <div className="debt-card-total">Remaining: {formatAmount((selectedDebt?.totalAmount || 0) - (selectedDebt?.paidAmount || 0), currency)}</div>
          </div>
          <div className="input-group"><label>Payment Amount</label><input className="input" type="number" placeholder="0.00" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} min="0" /></div>
          <div className="input-group"><label>Note (optional)</label><input className="input" placeholder="Payment note..." value={payNote} onChange={(e) => setPayNote(e.target.value)} /></div>
          <button className="btn btn-primary submit-btn" onClick={handlePay}>Record Payment</button>
        </div>
      </BottomSheet>
    </div>
  );
}
