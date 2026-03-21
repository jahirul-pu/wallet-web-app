import { useState, useMemo } from 'react';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getCategoryInfo, getExpenseCategories } from '../utils/categories';
import { getMonthKey } from '../utils/dateFormat';
import { formatAmount } from '../utils/currencies';
import BottomSheet from '../components/BottomSheet';
import '../components/CategoryPicker.css';
import './Budgets.css';

export default function Budgets() {
  const budgets = useBudgetStore((s) => s.budgets);
  const addBudget = useBudgetStore((s) => s.addBudget);
  const deleteBudget = useBudgetStore((s) => s.deleteBudget);
  const getBudgetStatus = useBudgetStore((s) => s.getBudgetStatus);
  const transactions = useTransactionStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.currency);

  const currentMonth = getMonthKey(new Date().toISOString());
  const [showSheet, setShowSheet] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');

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
    addBudget({ category: newCategory, amount: newAmount, month: currentMonth });
    setNewCategory('');
    setNewAmount('');
    setShowSheet(false);
  };

  const existingCategories = monthBudgets.map((b) => b.category);
  const availableCategories = getExpenseCategories().filter(
    ([key]) => !existingCategories.includes(key)
  );

  return (
    <div className="page" id="budgets-page">
      <h1 className="page-title">Budgets</h1>

      {/* Overview */}
      <div className="budget-overview card">
        <div className="budget-overview-row">
          <div>
            <div className="budget-overview-label">Total Budget</div>
            <div className="budget-overview-value">{formatAmount(totalBudget, currency)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="budget-overview-label">Spent</div>
            <div className="budget-overview-value" style={{ color: totalSpent > totalBudget ? 'var(--color-danger)' : 'var(--color-accent)' }}>
              {formatAmount(totalSpent, currency)}
            </div>
          </div>
        </div>
        <div className="progress-bar" style={{ marginTop: 'var(--space-3)' }}>
          <div
            className={`progress-bar-fill ${totalBudget > 0 && (totalSpent / totalBudget) >= 1 ? 'danger' : (totalSpent / totalBudget) >= 0.8 ? 'warning' : ''}`}
            style={{ width: `${Math.min((totalSpent / (totalBudget || 1)) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Budget list */}
      {monthBudgets.length > 0 ? (
        <div className="budget-list">
          {monthBudgets.map((b) => {
            const cat = getCategoryInfo(b.category);
            const pct = b.status?.percentage || 0;
            return (
              <div key={b.id} className="budget-item card">
                <div className="budget-item-header">
                  <div className="budget-item-left">
                    <span className="budget-item-icon" style={{ background: `${cat.color}18` }}>{cat.icon}</span>
                    <span className="budget-item-name">{cat.name}</span>
                  </div>
                  <button className="btn-delete-sm" onClick={() => deleteBudget(b.id)}>✕</button>
                </div>
                <div className="budget-item-amounts">
                  <span>{formatAmount(b.status?.spent || 0, currency)}</span>
                  <span className="budget-item-total">/ {formatAmount(b.amount, currency)}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill ${pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : ''}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                {pct >= 100 && (
                  <div className="budget-alert danger">
                    <svg style={{display:'inline-block', verticalAlign:'middle', marginRight:'4px'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Budget exceeded!
                  </div>
                )}
                {pct >= 80 && pct < 100 && (
                  <div className="budget-alert warning">
                    <svg style={{display:'inline-block', verticalAlign:'middle', marginRight:'4px'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                    Almost at limit
                  </div>
                )}
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

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-4)' }} onClick={() => setShowSheet(true)} id="add-budget-btn">
        + Set Budget
      </button>

      <BottomSheet isOpen={showSheet} onClose={() => setShowSheet(false)} title="Set Budget">
        <div className="sheet-form">
          <div className="input-group">
            <label>Category</label>
            <div className="category-picker" style={{ gap: '8px', marginTop: '8px' }}>
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
            <input className="input" type="number" placeholder="0.00" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} min="0" step="0.01" />
          </div>
          <button className="btn btn-primary submit-btn" onClick={handleAdd}>Set Budget</button>
        </div>
      </BottomSheet>
    </div>
  );
}
