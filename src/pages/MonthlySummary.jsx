import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useDebtStore } from '../stores/useDebtStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getCategoryInfo } from '../utils/categories';
import { formatAmount } from '../utils/currencies';
import { usePrivacy } from '../hooks/usePrivacy';
import { getMonthKey } from '../utils/dateFormat';
import { exportCSV, exportPDF } from '../utils/exportImport';
import './MonthlySummary.css';

export default function MonthlySummary() {
  const navigate = useNavigate();
  const transactions = useTransactionStore((s) => s.transactions);
  const accounts = useAccountStore((s) => s.accounts);
  const budgets = useBudgetStore((s) => s.budgets);
  const getBudgetStatus = useBudgetStore((s) => s.getBudgetStatus);
  const debts = useDebtStore((s) => s.debts);
  const currency = useSettingsStore((s) => s.currency);
  const { mask } = usePrivacy();

  const now = new Date();
  const currentMonthKey = getMonthKey(now.toISOString());
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = getMonthKey(prevMonthDate.toISOString());

  const daysLeft = (() => {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
  })();

  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const prevMonthName = prevMonthDate.toLocaleString('default', { month: 'long' });

  // Current & previous month transaction stats
  const { current, previous } = useMemo(() => {
    const calc = (key) => {
      const txns = transactions.filter((t) => {
        const d = new Date(t.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === key;
      });
      const income = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const txnCount = txns.length;
      
      // Top expense categories
      const catMap = {};
      txns.filter((t) => t.type === 'expense').forEach((t) => {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
      });
      const topCategories = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key, amount]) => ({ ...getCategoryInfo(key), amount, key }));

      return { income, expense, savings: income - expense, txnCount, topCategories };
    };
    return { current: calc(currentMonthKey), previous: calc(prevMonthKey) };
  }, [transactions, currentMonthKey, prevMonthKey]);

  // Budget utilization
  const budgetStats = useMemo(() => {
    const monthBudgets = budgets
      .filter((b) => b.month === currentMonthKey)
      .map((b) => ({
        ...b,
        status: getBudgetStatus(b.id, transactions),
        catInfo: getCategoryInfo(b.category),
      }));
    const totalBudget = monthBudgets.reduce((s, b) => s + b.amount, 0);
    const totalSpent = monthBudgets.reduce((s, b) => s + (b.status?.spent || 0), 0);
    const exceeded = monthBudgets.filter((b) => b.status?.percentage >= 100);
    const warning = monthBudgets.filter((b) => b.status?.percentage >= 70 && b.status?.percentage < 100);
    return { monthBudgets, totalBudget, totalSpent, exceeded, warning };
  }, [budgets, transactions, currentMonthKey, getBudgetStatus]);

  // Debt payments this month
  const debtStats = useMemo(() => {
    let totalPaymentsThisMonth = 0;
    let debtsSettled = 0;
    const paymentEntries = [];

    debts.forEach((d) => {
      (d.payments || []).forEach((p) => {
        if (p.date && p.date.startsWith(currentMonthKey)) {
          totalPaymentsThisMonth += p.amount;
          paymentEntries.push({ ...p, personName: d.personName, debtType: d.type });
        }
      });
      // Check if settled this month
      if (d.status === 'paid') {
        const lastPayment = (d.payments || []).slice(-1)[0];
        if (lastPayment && lastPayment.date && lastPayment.date.startsWith(currentMonthKey)) {
          debtsSettled++;
        }
      }
    });

    const activeDebts = debts.filter((d) => d.status === 'active').length;
    return { totalPaymentsThisMonth, debtsSettled, activeDebts, paymentEntries };
  }, [debts, currentMonthKey]);

  // Wallet growth
  const walletGrowth = useMemo(() => {
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    const netThisMonth = current.income - current.expense;
    const balanceLastMonth = totalBalance - netThisMonth;
    const growthPct = balanceLastMonth > 0 ? Math.round((netThisMonth / balanceLastMonth) * 100) : (netThisMonth > 0 ? 100 : 0);
    return { totalBalance, netThisMonth, balanceLastMonth, growthPct };
  }, [accounts, current]);

  const pctChange = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const handleExportCSV = () => {
    const monthTxns = transactions.filter((t) => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonthKey;
    });
    exportCSV(monthTxns, getCategoryInfo, formatAmount, currency);
  };

  const handleExportPDF = () => {
    const monthTxns = transactions.filter((t) => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonthKey;
    });
    exportPDF(monthTxns, getCategoryInfo, formatAmount, currency);
  };

  return (
    <div className="page" id="monthly-summary-page">
      <div className="ms-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>{monthName}</h1>
          <div className="ms-subtitle">
            <svg style={{display:'inline-block', verticalAlign:'middle', marginRight:'4px'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            {daysLeft > 0 ? `${daysLeft} days remaining` : 'Last day of the month'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary ms-export-btn" onClick={handleExportCSV} title="Export CSV">
            <svg style={{marginRight: '6px'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            CSV
          </button>
          <button className="btn btn-secondary ms-export-btn" onClick={handleExportPDF} title="Export PDF">
            <svg style={{marginRight: '6px'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            PDF
          </button>
        </div>
      </div>

      {/* ── Score Card ── */}
      <div className="ms-score-card card">
        <div className="ms-score-header">Monthly Snapshot</div>
        <div className="ms-score-grid">
          <div className="ms-score-item">
            <div className="ms-score-label">Income</div>
            <div className="ms-score-value income">{mask(current.income, currency)}</div>
            <div className={`ms-score-change ${pctChange(current.income, previous.income) >= 0 ? 'positive' : 'negative'}`}>
              {pctChange(current.income, previous.income) >= 0 ? '↑' : '↓'} {Math.abs(pctChange(current.income, previous.income))}% vs {prevMonthName}
            </div>
          </div>
          <div className="ms-score-item">
            <div className="ms-score-label">Expense</div>
            <div className="ms-score-value expense">{mask(current.expense, currency)}</div>
            <div className={`ms-score-change ${pctChange(current.expense, previous.expense) <= 0 ? 'positive' : 'negative'}`}>
              {pctChange(current.expense, previous.expense) >= 0 ? '↑' : '↓'} {Math.abs(pctChange(current.expense, previous.expense))}% vs {prevMonthName}
            </div>
          </div>
          <div className="ms-score-item highlight">
            <div className="ms-score-label">Savings</div>
            <div className={`ms-score-value ${current.savings >= 0 ? 'income' : 'expense'}`}>{mask(current.savings, currency)}</div>
            <div className={`ms-score-change ${pctChange(current.savings, previous.savings) >= 0 ? 'positive' : 'negative'}`}>
              {pctChange(current.savings, previous.savings) >= 0 ? '↑' : '↓'} {Math.abs(pctChange(current.savings, previous.savings))}% vs {prevMonthName}
            </div>
          </div>
        </div>
      </div>

      {/* ── Wallet Growth ── */}
      <div className="ms-section">
        <h2 className="ms-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          Wallet Growth
        </h2>
        <div className="ms-wallet-growth card">
          <div className="ms-wallet-row">
            <div className="ms-wallet-item">
              <div className="ms-wallet-label">Current Balance</div>
              <div className="ms-wallet-value">{mask(walletGrowth.totalBalance, currency)}</div>
            </div>
            <div className="ms-wallet-item">
              <div className="ms-wallet-label">Net This Month</div>
              <div className={`ms-wallet-value ${walletGrowth.netThisMonth >= 0 ? 'positive' : 'negative'}`}>
                {walletGrowth.netThisMonth >= 0 ? '+' : ''}{mask(walletGrowth.netThisMonth, currency)}
              </div>
            </div>
            <div className="ms-wallet-item">
              <div className="ms-wallet-label">Growth</div>
              <div className={`ms-wallet-value ${walletGrowth.growthPct >= 0 ? 'positive' : 'negative'}`}>
                {walletGrowth.growthPct >= 0 ? '+' : ''}{walletGrowth.growthPct}%
              </div>
            </div>
          </div>
          <div className="ms-wallet-bar">
            <div className="ms-wallet-bar-label">
              <span>Last Month</span>
              <span>This Month</span>
            </div>
            <div className="ms-wallet-bar-track">
              <div className="ms-wallet-bar-prev" style={{ width: `${Math.min(100, walletGrowth.balanceLastMonth > 0 ? (walletGrowth.balanceLastMonth / Math.max(walletGrowth.totalBalance, walletGrowth.balanceLastMonth)) * 100 : 50)}%` }}></div>
              <div className={`ms-wallet-bar-curr ${walletGrowth.growthPct >= 0 ? 'positive' : 'negative'}`} style={{ width: `${Math.min(100, walletGrowth.totalBalance > 0 ? (walletGrowth.totalBalance / Math.max(walletGrowth.totalBalance, walletGrowth.balanceLastMonth)) * 100 : 50)}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Budget Summary ── */}
      <div className="ms-section">
        <h2 className="ms-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          Budget Review
        </h2>
        <div className="ms-budget-summary card">
          <div className="ms-budget-overview-row">
            <div className="ms-budget-stat">
              <div className="ms-budget-stat-val">{mask(budgetStats.totalBudget, currency)}</div>
              <div className="ms-budget-stat-label">Total Budget</div>
            </div>
            <div className="ms-budget-stat">
              <div className="ms-budget-stat-val">{mask(budgetStats.totalSpent, currency)}</div>
              <div className="ms-budget-stat-label">Spent</div>
            </div>
            <div className="ms-budget-stat">
              <div className="ms-budget-stat-val">{Math.round(budgetStats.totalBudget > 0 ? (budgetStats.totalSpent / budgetStats.totalBudget) * 100 : 0)}%</div>
              <div className="ms-budget-stat-label">Utilization</div>
            </div>
          </div>
          {budgetStats.exceeded.length > 0 && (
            <div className="ms-budget-alert danger">
              🚨 {budgetStats.exceeded.length} budget{budgetStats.exceeded.length > 1 ? 's' : ''} exceeded: {budgetStats.exceeded.map((b) => b.catInfo.name).join(', ')}
            </div>
          )}
          {budgetStats.warning.length > 0 && (
            <div className="ms-budget-alert warning">
              ⚠ {budgetStats.warning.length} budget{budgetStats.warning.length > 1 ? 's' : ''} near limit: {budgetStats.warning.map((b) => b.catInfo.name).join(', ')}
            </div>
          )}
          {budgetStats.monthBudgets.length === 0 && (
            <div className="ms-empty-note">No budgets set for this month.</div>
          )}
          <button className="btn btn-secondary btn-sm ms-link-btn" onClick={() => navigate('/budgets')}>
            View Budgets →
          </button>
        </div>
      </div>

      {/* ── Debt Payments ── */}
      <div className="ms-section">
        <h2 className="ms-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v12"></path><path d="M15 9.5H10.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H9"></path></svg>
          Debt Activity
        </h2>
        <div className="ms-debt-summary card">
          <div className="ms-debt-stats">
            <div className="ms-debt-stat-item">
              <div className="ms-debt-stat-val">{mask(debtStats.totalPaymentsThisMonth, currency)}</div>
              <div className="ms-debt-stat-label">Payments Made</div>
            </div>
            <div className="ms-debt-stat-item">
              <div className="ms-debt-stat-val">{debtStats.debtsSettled}</div>
              <div className="ms-debt-stat-label">Debts Settled</div>
            </div>
            <div className="ms-debt-stat-item">
              <div className="ms-debt-stat-val">{debtStats.activeDebts}</div>
              <div className="ms-debt-stat-label">Still Active</div>
            </div>
          </div>
          {debtStats.paymentEntries.length > 0 && (
            <div className="ms-debt-timeline">
              {debtStats.paymentEntries.slice(0, 5).map((p) => (
                <div key={p.id} className="ms-debt-timeline-item">
                  <div className="ms-debt-timeline-dot"></div>
                  <div className="ms-debt-timeline-content">
                    <span className="ms-debt-timeline-person">{p.personName}</span>
                    <span className="ms-debt-timeline-note">{p.note || (p.debtType === 'i_owe' ? 'Paid' : 'Received')}</span>
                  </div>
                  <div className="ms-debt-timeline-amount">{mask(p.amount, currency)}</div>
                </div>
              ))}
            </div>
          )}
          {debtStats.paymentEntries.length === 0 && (
            <div className="ms-empty-note">No debt payments recorded this month.</div>
          )}
          <button className="btn btn-secondary btn-sm ms-link-btn" onClick={() => navigate('/debts')}>
            View Debts →
          </button>
        </div>
      </div>

      {/* ── Top Spending ── */}
      {current.topCategories.length > 0 && (
        <div className="ms-section">
          <h2 className="ms-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            Top Spending Categories
          </h2>
          <div className="ms-categories card">
            {current.topCategories.map((cat) => {
              const pct = current.expense > 0 ? Math.round((cat.amount / current.expense) * 100) : 0;
              return (
                <div key={cat.key} className="ms-category-row">
                  <span className="ms-category-icon" style={{ background: `${cat.color}18` }}>{cat.icon}</span>
                  <div className="ms-category-info">
                    <div className="ms-category-name">{cat.name}</div>
                    <div className="ms-category-bar-track">
                      <div className="ms-category-bar-fill" style={{ width: `${pct}%`, background: cat.color }}></div>
                    </div>
                  </div>
                  <div className="ms-category-right">
                    <div className="ms-category-amount">{mask(cat.amount, currency)}</div>
                    <div className="ms-category-pct">{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Month Reset Banner ── */}
      {daysLeft <= 3 && (
        <div className="ms-reset-banner card">
          <div className="ms-reset-icon">🔄</div>
          <div className="ms-reset-text">
            <div className="ms-reset-title">Month Reset {daysLeft === 0 ? 'Today' : `in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`}</div>
            <div className="ms-reset-sub">Budgets will reset. Review your progress and set new goals for next month.</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/budgets')}>Set New Budgets</button>
        </div>
      )}

      {/* ── Stats Footer ── */}
      <div className="ms-stats-footer">
        <div className="ms-footer-stat">
          <span className="ms-footer-val">{current.txnCount}</span>
          <span className="ms-footer-label">Transactions</span>
        </div>
        <div className="ms-footer-stat">
          <span className="ms-footer-val">{budgetStats.monthBudgets.length}</span>
          <span className="ms-footer-label">Budgets Set</span>
        </div>
        <div className="ms-footer-stat">
          <span className="ms-footer-val">{debtStats.paymentEntries.length}</span>
          <span className="ms-footer-label">Debt Payments</span>
        </div>
      </div>
    </div>
  );
}
