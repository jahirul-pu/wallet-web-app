import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useAccountStore } from '../stores/useAccountStore';
import { renderAccountIcon } from '../utils/accountIcons';
import { useDebtStore } from '../stores/useDebtStore';
import { getMonthKey } from '../utils/dateFormat';
import { formatAmount } from '../utils/currencies';
import BalanceCard from '../components/BalanceCard';
import TransactionItem from '../components/TransactionItem';
import { toInputDate } from '../utils/dateFormat';
import './Dashboard.css';



export default function Dashboard() {
  const navigate = useNavigate();
  const transactions = useTransactionStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.currency);
  const accounts = useAccountStore((s) => s.accounts);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const adjustBalance = useAccountStore((s) => s.adjustBalance);
  const debts = useDebtStore((s) => s.debts);

  // Quick-add state
  const [qaAmount, setQaAmount] = useState('');
  const [qaType, setQaType] = useState('expense');
  const [qaNote, setQaNote] = useState('');
  const [qaAccountId, setQaAccountId] = useState(accounts[0]?.id || '');
  const [qaSuccess, setQaSuccess] = useState(false);

  const handleQuickAdd = (e) => {
    e.preventDefault();
    const amt = Number(qaAmount);
    if (!amt || amt <= 0) return;
    addTransaction({
      type: qaType,
      amount: amt,
      category: 'other',
      date: toInputDate(),
      note: qaNote || `Quick ${qaType}`,
      accountId: qaAccountId,
    });
    adjustBalance(qaAccountId, amt, qaType);
    setQaAmount('');
    setQaNote('');
    setQaSuccess(true);
    setTimeout(() => setQaSuccess(false), 2000);
  };

  const currentMonth = getMonthKey(new Date().toISOString());

  // Derive debt summaries from raw debts array (avoids getSnapshot loop in React 19)
  const { overdueDebts, totalOwedToMe, totalIOwe } = useMemo(() => {
    const now = new Date(new Date().toDateString());
    const overdue = debts.filter(
      (d) => d.status === 'active' && d.dueDate && new Date(d.dueDate) < now
    );
    const owedToMe = debts
      .filter((d) => d.type === 'owed_to_me' && d.status === 'active')
      .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);
    const iOwe = debts
      .filter((d) => d.type === 'i_owe' && d.status === 'active')
      .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);
    return { overdueDebts: overdue, totalOwedToMe: owedToMe, totalIOwe: iOwe };
  }, [debts]);

    const { balance, income, expense, recentTxns } = useMemo(() => {
    const monthTxns = transactions.filter((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === currentMonth;
    });

    const inc = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const bal = transactions.reduce((s, t) => {
      if (t.type === 'income') return s + t.amount;
      if (t.type === 'expense') return s - t.amount;
      return s;
    }, 0);

    const recent = [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    return { balance: bal, income: inc, expense: exp, recentTxns: recent };
  }, [transactions, currentMonth]);

  return (
    <div className="page" id="dashboard-page">
      <div className="dashboard-grid">
        <div className="dashboard-header">
          <div>
            <div className="dashboard-greeting">Good {getGreeting()} 👋</div>
            <h1 className="page-title">Dashboard</h1>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/add')}
            id="add-transaction-btn-desktop"
          >
            + Add
          </button>
        </div>

        {/* Left Column - Main Vault Activity */}
        <div className="dashboard-col-main">
          <BalanceCard balance={balance} income={income} expense={expense} />

          {/* Quick Add Transaction */}
          <div className="dashboard-section quick-add-section" style={{ animationDelay: '0.08s' }}>
            <h2 className="dashboard-section-title">Quick Add</h2>
            <form className="quick-add-form card" onSubmit={handleQuickAdd}>
              <div className="qa-type-row">
                <button
                  type="button"
                  className={`qa-type-btn ${qaType === 'expense' ? 'active expense' : ''}`}
                  onClick={() => setQaType('expense')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                  Expense
                </button>
                <button
                  type="button"
                  className={`qa-type-btn ${qaType === 'income' ? 'active income' : ''}`}
                  onClick={() => setQaType('income')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                  Income
                </button>
              </div>
              <div className="qa-input-row">
                <input
                  type="number"
                  className="qa-amount-input"
                  placeholder="0.00"
                  value={qaAmount}
                  onChange={(e) => setQaAmount(e.target.value)}
                  step="any"
                  min="0"
                  required
                />
                <input
                  type="text"
                  className="qa-note-input"
                  placeholder="Note (optional)"
                  value={qaNote}
                  onChange={(e) => setQaNote(e.target.value)}
                />
              </div>
              <div className="qa-bottom-row">
                <select
                  className="qa-account-select"
                  value={qaAccountId}
                  onChange={(e) => setQaAccountId(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <button type="submit" className={`qa-submit-btn ${qaType === 'income' ? 'btn-income' : 'btn-expense'}`}>
                  {qaSuccess ? '✓ Added' : '+ Add'}
                </button>
              </div>
            </form>
          </div>

          {/* My Wallets */}
          <div className="dashboard-section" style={{ animationDelay: '0.12s' }}>
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">My Wallets</h2>
              <button
                className="btn-link"
                onClick={() => navigate('/accounts')}
              >
                See all →
              </button>
            </div>
            <div className="dashboard-wallets-grid">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="dashboard-wallet-chip card"
                  onClick={() => navigate('/accounts')}
                >
                  <div
                    className="dashboard-wallet-icon"
                    style={{ background: `${acc.color}18`, color: acc.color }}
                  >
                    {renderAccountIcon(acc.icon, 20)}
                  </div>
                  <div className="dashboard-wallet-info">
                    <div className="dashboard-wallet-name">{acc.name}</div>
                    <div
                      className="dashboard-wallet-balance"
                      style={{ color: acc.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
                    >
                      {formatAmount(acc.balance, currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overdue debts alert */}
          {overdueDebts.length > 0 && (
            <div className="dashboard-alert" onClick={() => navigate('/debts')}>
              <svg style={{display:'inline-block', verticalAlign:'middle', marginRight:'6px'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              You have {overdueDebts.length} overdue debt{overdueDebts.length > 1 ? 's' : ''}
            </div>
          )}

          {/* Debt summary */}
          {(totalOwedToMe > 0 || totalIOwe > 0) && (
            <div className="dashboard-debt-summary card" onClick={() => navigate('/debts')}>
              <div className="dashboard-debt-row">
                <div className="dashboard-debt-item">
                  <span className="debt-label">Receivable</span>
                  <span className="debt-value income">{formatAmount(totalOwedToMe, currency)}</span>
                </div>
                <div className="dashboard-debt-item">
                  <span className="debt-label">Payable</span>
                  <span className="debt-value expense">{formatAmount(totalIOwe, currency)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent transactions */}
          <div className="dashboard-section">
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">Vault Activity</h2>
              {transactions.length > 5 && (
                <button
                  className="btn-link"
                  onClick={() => navigate('/transactions')}
                >
                  See all →
                </button>
              )}
            </div>
            {recentTxns.length > 0 ? (
              <div className="card" style={{ padding: 'var(--space-2)' }}>
                {recentTxns.map((txn) => (
                  <TransactionItem key={txn.id} transaction={txn} />
                ))}
              </div>
            ) : (
              <div className="empty-state card">
                <div className="icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <p>No transactions yet. Tap "Add" to get started!</p>
              </div>
            )}
          </div>
          
          {/* Quick actions (Mainly visible on mobile, grid puts it below) */}
          <div className="dashboard-actions dashboard-actions-mobile">
            <button className="quick-action card" onClick={() => navigate('/add?type=income')}>
              <span className="quick-action-icon income">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
              </span>
              <span>Income</span>
            </button>
            <button className="quick-action card" onClick={() => navigate('/add?type=expense')}>
              <span className="quick-action-icon expense">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
              </span>
              <span>Expense</span>
            </button>
            <button className="quick-action card" onClick={() => navigate('/add?type=transfer')}>
              <span className="quick-action-icon transfer">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 8 16 13"></polyline><line x1="21" y1="8" x2="9" y2="8"></line><polyline points="8 21 3 16 8 11"></polyline><line x1="3" y1="16" x2="15" y2="16"></line></svg>
              </span>
              <span>Transfer</span>
            </button>
          </div>
        </div>

        {/* Right Column - Utility */}
        <div className="dashboard-col-side">
          {/* You can add smaller widgets here later */}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}
