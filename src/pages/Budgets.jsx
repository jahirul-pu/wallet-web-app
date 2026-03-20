import { useState, useMemo } from 'react';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getCategoryInfo, getExpenseCategories } from '../utils/categories';
import { getMonthKey } from '../utils/dateFormat';
import { formatAmount } from '../utils/currencies';
import BottomSheet from '../components/BottomSheet';
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
                  <div className="budget-alert danger">⚠️ Budget exceeded!</div>
                )}
                {pct >= 80 && pct < 100 && (
                  <div className="budget-alert warning">⚡ Almost at limit</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="icon">📊</div>
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
            <select className="select" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              <option value="">Select category</option>
              {availableCategories.map(([key, cat]) => (
                <option key={key} value={key}>{cat.icon} {cat.name}</option>
              ))}
            </select>
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
