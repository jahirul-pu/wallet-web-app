import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getCategoryInfo, getExpenseCategories } from '../utils/categories';
import { getMonthKey } from '../utils/dateFormat';
import { formatAmount } from '../utils/currencies';
import BottomSheet from '../components/BottomSheet';
import CalculatorInput from '../components/CalculatorInput';
import '../components/CategoryPicker.css';
import './Budgets.css';

export default function Budgets() {
  const budgets = useBudgetStore((s) => s.budgets);
  const addBudget = useBudgetStore((s) => s.addBudget);
  const deleteBudget = useBudgetStore((s) => s.deleteBudget);
  const updateBudget = useBudgetStore((s) => s.updateBudget);
  const getBudgetStatus = useBudgetStore((s) => s.getBudgetStatus);
  const transactions = useTransactionStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.currency);
  const navigate = useNavigate();

  const currentMonth = getMonthKey(new Date().toISOString());
  const [showSheet, setShowSheet] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [editingId, setEditingId] = useState(null);

  const monthBudgets = useMemo(() => {
    return budgets
      .filter((b) => b.month === currentMonth)
      .map((b) => ({
        ...b,
        status: getBudgetStatus(b.id, transactions),
      }));
  }, [budgets, transactions, currentMonth, getBudgetStatus]);

  const totalBudget = monthBudgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = monthBudgets.reduce((s, b) => s + (b.status?.spent || 0), 0);

  const handleAdd = () => {
    if (!newCategory || !newAmount) return;
    
    if (editingId) {
      updateBudget(editingId, { amount: newAmount });
    } else {
      addBudget({ category: newCategory, amount: newAmount, month: currentMonth });
    }
    
    setNewCategory('');
    setNewAmount('');
    setEditingId(null);
    setShowSheet(false);
  };

  const openEdit = (b) => {
    setEditingId(b.id);
    setNewCategory(b.category);
    setNewAmount(String(b.amount));
    setShowSheet(true);
  };

  const getDaysLeft = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(1, lastDay - now.getDate() + 1);
  };
  const daysLeft = getDaysLeft();
  const safeDailyTotal = Math.max(0, (totalBudget - totalSpent) / daysLeft);

  const existingCategories = monthBudgets.map((b) => b.category);
  const availableCategories = getExpenseCategories().filter(
    ([key]) => !existingCategories.includes(key)
  );

  return (
    <div className="page" id="budgets-page">
      <div className="budget-page-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>
            {new Date().toLocaleString('default', { month: 'long' })} Budget
          </h1>
          <div className="budget-reset-badge">
            <svg style={{display:'inline-block', verticalAlign:'middle', marginRight:'4px'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Resets in {daysLeft - 1} days
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className="budget-overview card">
        <div className="budget-overview-row">
          <div>
            <div className="budget-overview-label">Total Budget</div>
            <div className="budget-overview-value">{formatAmount(totalBudget, currency)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="budget-overview-label">Spent</div>
            <div className="budget-overview-value" style={{ color: totalSpent > totalBudget ? 'var(--color-danger)' : 'var(--color-expense)' }}>
              {formatAmount(totalSpent, currency)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="budget-overview-label">Remaining</div>
            <div className="budget-overview-value" style={{ color: totalBudget - totalSpent > 0 ? '#34d399' : 'var(--color-danger)' }}>
              {formatAmount(Math.max(0, totalBudget - totalSpent), currency)}
            </div>
          </div>
        </div>
        <div className="progress-bar" style={{ marginTop: 'var(--space-3)' }}>
          <div
            className={`progress-bar-fill ${totalBudget > 0 && (totalSpent / totalBudget) >= 1 ? 'danger' : (totalSpent / totalBudget) >= 0.8 ? 'warning' : ''}`}
            style={{ width: `${Math.min((totalSpent / (totalBudget || 1)) * 100, 100)}%` }}
          />
        </div>
        <div className="budget-overview-context">
          {Math.round((totalSpent / (totalBudget || 1)) * 100)}% used
          <span className="budget-context-dot">•</span>
          {daysLeft - 1 > 0 ? `${daysLeft - 1} days left` : 'Last day'}
        </div>
        
        {safeDailyTotal > 0 && (
          <div className="budget-daily-guidance">
            💡 You can spend <strong>{formatAmount(safeDailyTotal, currency)}/day</strong> overall to stay on track.
          </div>
        )}
      </div>

      {/* Budget list */}
      {monthBudgets.length > 0 ? (
        <div className="budget-list">
          {monthBudgets.map((b) => {
            const cat = getCategoryInfo(b.category);
            const pct = b.status?.percentage || 0;
            const spent = b.status?.spent || 0;
            const remaining = Math.max(0, b.amount - spent);
            const exceeded = pct >= 100;

            // Urgency tier
            let tierClass = 'budget-safe';
            let tierLabel = '';
            if (pct >= 100) {
              tierClass = 'budget-exceeded';
              tierLabel = `🚨 Over by ${formatAmount(spent - b.amount, currency)}`;
            } else if (pct >= 90) {
              tierClass = 'budget-critical';
              tierLabel = `⚠ Almost reached — ${formatAmount(remaining, currency)} left`;
            } else if (pct >= 70) {
              tierClass = 'budget-warning';
              tierLabel = `${formatAmount(remaining, currency)} remaining`;
            }

            return (
              <div key={b.id} className={`budget-item card ${tierClass}`}>
                <div className="budget-item-header">
                  <div className="budget-item-left">
                    <span className="budget-item-icon" style={{ background: `${cat.color}18` }}>{cat.icon}</span>
                    <div>
                      <span className="budget-item-name">{cat.name}</span>
                      <span className={`budget-pct-badge ${tierClass}`}>{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <button className="btn-delete-sm" onClick={() => deleteBudget(b.id)}>✕</button>
                </div>
                <div className="budget-item-amounts">
                  <span className={exceeded ? 'budget-spent-over' : ''}>{formatAmount(spent, currency)}</span>
                  <span className="budget-item-total">/ {formatAmount(b.amount, currency)}</span>
                  {!exceeded && <span className="budget-item-remaining">Remaining: {formatAmount(remaining, currency)}</span>}
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill ${pct >= 100 ? 'danger' : pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : ''}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="budget-item-context">
                  {Math.round(pct)}% used
                  <span className="budget-context-dot">•</span>
                  {daysLeft - 1 > 0 ? `${daysLeft - 1} days left` : 'Last day'}
                </div>
                
                {(!exceeded && remaining > 0) && (
                  <div className="budget-item-guidance">
                    Safe to spend: <strong>{formatAmount(remaining / daysLeft, currency)}/day</strong>
                  </div>
                )}

                {b.status?.topExpense && (
                  <div className="budget-item-insight">
                    Most spent on: <strong>{b.status.topExpense.party || b.status.topExpense.note || 'General'}</strong>
                  </div>
                )}

                {tierLabel && (
                  <div className={`budget-status-label ${tierClass}`}>
                    {tierLabel}
                  </div>
                )}
                
                <div className="budget-card-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/add?type=expense&category=${cat.id}`)}>
                    + Add Expense
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(b)}>
                    Adjust
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          </div>
          <p>No budgets set for this month</p>
        </div>
      )}

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-4)' }} onClick={() => {
        setEditingId(null);
        setNewCategory('');
        setNewAmount('');
        setShowSheet(true);
      }} id="add-budget-btn">
        + Set Budget
      </button>

      <BottomSheet isOpen={showSheet} onClose={() => setShowSheet(false)} title={editingId ? "Adjust Budget" : "Set Budget"}>
        <div className="sheet-form">
          <div className="input-group">
            <label>Category</label>
            <div className="category-picker" style={{ gap: '8px', marginTop: '8px', pointerEvents: editingId ? 'none' : 'auto', opacity: editingId ? 0.7 : 1 }}>
              {availableCategories.map(([key, cat]) => (
                <button
                  key={key}
                  className={`category-picker-item ${newCategory === key ? 'active' : ''}`}
                  onClick={() => setNewCategory(key)}
                  style={{ '--cat-color': cat.color }}
                  type="button"
                >
                  <span className="category-picker-icon">{cat.icon}</span>
                  <span className="category-picker-name">{cat.name}</span>
                </button>
              ))}
              {availableCategories.length === 0 && (
                <div style={{ color: 'var(--color-text-secondary)', padding: '10px 0', fontSize: '0.9em' }}>
                  All categories have limits set!
                </div>
              )}
            </div>
          </div>
          <div className="input-group">
            <label>Budget Amount</label>
            <CalculatorInput value={newAmount} onChange={setNewAmount} />
          </div>
          <button className="btn btn-primary submit-btn" onClick={handleAdd}>Set Budget</button>
        </div>
      </BottomSheet>
    </div>
  );
}
