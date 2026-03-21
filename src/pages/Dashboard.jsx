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
import { getCategoryInfo } from '../utils/categories';
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
  const [qaAccountId, setQaAccountId] = useState('');
  const [qaSuccess, setQaSuccess] = useState(false);

  const filteredQaAccounts = useMemo(() => {
    return accounts.filter((a) => !a.type || a.type === 'all' || a.type === qaType);
  }, [accounts, qaType]);

  useMemo(() => {
    if (qaAccountId && !filteredQaAccounts.find(a => a.id === qaAccountId)) {
      setQaAccountId(filteredQaAccounts[0]?.id || '');
    } else if (!qaAccountId && filteredQaAccounts.length > 0) {
      setQaAccountId(filteredQaAccounts[0].id);
    }
  }, [filteredQaAccounts, qaAccountId]);

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

  // Analytics computations
  const analytics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMo = now.getMonth();
    const monthExpenses = transactions.filter((t) => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getFullYear() === currentYear && d.getMonth() === currentMo;
    });
    const catMap = {};
    monthExpenses.forEach((t) => {
      const cat = t.category || 'other_expense';
      catMap[cat] = (catMap[cat] || 0) + t.amount;
    });
    const totalExpenseAmt = Object.values(catMap).reduce((s, v) => s + v, 0);
    const categoryBreakdown = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, amount]) => {
        const info = getCategoryInfo(key);
        return { key, name: info.name, amount, percent: totalExpenseAmt > 0 ? (amount / totalExpenseAmt) * 100 : 0 };
      });
    const dayOfMonth = now.getDate();
    const dailyAvg = dayOfMonth > 0 ? totalExpenseAmt / dayOfMonth : 0;
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en', { weekday: 'short' }).substring(0, 2);
      const dayTotal = transactions
        .filter((t) => t.type === 'expense' && t.date === dateStr)
        .reduce((s, t) => s + t.amount, 0);
      last7.push({ label: dayLabel, amount: dayTotal });
    }
    const maxDay = Math.max(...last7.map((d) => d.amount), 1);
    return { categoryBreakdown, dailyAvg, savingsRate, last7, maxDay, totalExpenseAmt };
  }, [transactions, income, expense]);

  // Previous month data for % change comparison
  const prevMonth = useMemo(() => {
    const now = new Date();
    const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const pmKey = `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, '0')}`;
    const pmTxns = transactions.filter((t) => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === pmKey;
    });
    const pmInc = pmTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const pmExp = pmTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const pmNet = pmInc - pmExp;
    return { income: pmInc, expense: pmExp, net: pmNet };
  }, [transactions]);

  // 7-day sparkline data generators
  const spark7 = (filterFn) => {
    const pts = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      pts.push(transactions.filter((t) => t.date === ds && filterFn(t)).reduce((s, t) => s + t.amount, 0));
    }
    return pts;
  };

  const balanceSpark = useMemo(() => {
    const pts = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const running = transactions
        .filter((t) => t.date <= ds)
        .reduce((s, t) => {
          if (t.type === 'income') return s + t.amount;
          if (t.type === 'expense') return s - t.amount;
          return s;
        }, 0);
      pts.push(running);
    }
    return pts;
  }, [transactions]);

  const incomeSpark = useMemo(() => spark7((t) => t.type === 'income'), [transactions]);
  const expenseSpark = useMemo(() => spark7((t) => t.type === 'expense'), [transactions]);

  const pctChange = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // ── Smart Insights Engine ──
  const insights = useMemo(() => {
    const items = [];
    const sym = currency?.symbol || '৳';

    // 1. Category spending change vs last month
    const now = new Date();
    const cy = now.getFullYear(), cm = now.getMonth();
    const py = cm === 0 ? cy - 1 : cy, pmo = cm === 0 ? 11 : cm - 1;

    const catSpend = (year, month) => {
      const map = {};
      transactions.forEach((t) => {
        if (t.type !== 'expense') return;
        const d = new Date(t.date);
        if (d.getFullYear() !== year || d.getMonth() !== month) return;
        const cat = t.category || 'other_expense';
        map[cat] = (map[cat] || 0) + t.amount;
      });
      return map;
    };

    const currCats = catSpend(cy, cm);
    const prevCats = catSpend(py, pmo);

    // Find biggest category increase
    let biggestIncrease = null;
    Object.entries(currCats).forEach(([cat, amt]) => {
      const prev = prevCats[cat] || 0;
      if (prev > 0) {
        const pct = Math.round(((amt - prev) / prev) * 100);
        if (pct > 10 && (!biggestIncrease || pct > biggestIncrease.pct)) {
          const info = getCategoryInfo(cat);
          biggestIncrease = { name: info.name, pct, amt };
        }
      }
    });
    if (biggestIncrease) {
      items.push({
        type: 'warning',
        icon: '📊',
        text: `You're spending ${biggestIncrease.pct}% more on ${biggestIncrease.name} this month`,
      });
    }

    // 2. Savings rate change
    const currSavings = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
    const prevSavings = prevMonth.income > 0 ? Math.round(((prevMonth.income - prevMonth.expense) / prevMonth.income) * 100) : 0;
    const savingsDiff = currSavings - prevSavings;
    if (Math.abs(savingsDiff) >= 3 && prevMonth.income > 0) {
      items.push({
        type: savingsDiff > 0 ? 'positive' : 'warning',
        icon: savingsDiff > 0 ? '🎯' : '⚠️',
        text: savingsDiff > 0
          ? `Your savings rate improved by ${savingsDiff}% — keep it up!`
          : `Your savings rate dropped by ${Math.abs(savingsDiff)}% — watch your spending`,
      });
    }

    // 3. Biggest expense category awareness
    const topCat = Object.entries(currCats).sort((a, b) => b[1] - a[1])[0];
    if (topCat && expense > 0) {
      const info = getCategoryInfo(topCat[0]);
      const pct = Math.round((topCat[1] / expense) * 100);
      if (pct >= 30) {
        items.push({
          type: 'info',
          icon: '💡',
          text: `${info.name} is ${pct}% of your spending — your biggest category`,
        });
      }
    }

    // 4. Income growth
    if (prevMonth.income > 0 && income > prevMonth.income) {
      const incGrowth = Math.round(((income - prevMonth.income) / prevMonth.income) * 100);
      if (incGrowth >= 5) {
        items.push({
          type: 'positive',
          icon: '🚀',
          text: `Income is up ${incGrowth}% compared to last month`,
        });
      }
    }

    // 5. Spending velocity warning
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(cy, cm + 1, 0).getDate();
    const projectedExpense = dayOfMonth > 0 ? (expense / dayOfMonth) * daysInMonth : 0;
    if (prevMonth.expense > 0 && projectedExpense > prevMonth.expense * 1.2 && dayOfMonth >= 7) {
      items.push({
        type: 'warning',
        icon: '🔥',
        text: `At this pace, you'll spend ${sym}${Math.round(projectedExpense).toLocaleString()} — ${Math.round(((projectedExpense / prevMonth.expense) - 1) * 100)}% more than last month`,
      });
    }

    // 6. No-spend streak
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i - 1);
      const ds = d.toISOString().split('T')[0];
      const hadExpense = transactions.some((t) => t.type === 'expense' && t.date === ds);
      if (!hadExpense) streak++;
      else break;
    }
    if (streak >= 2) {
      items.push({
        type: 'positive',
        icon: '✨',
        text: `${streak}-day no-spend streak — impressive discipline!`,
      });
    }

    return items.slice(0, 4); // Max 4 insights
  }, [transactions, income, expense, prevMonth, currency]);

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

        {/* Row 1 — Financial Overview */}
        <div className="fin-overview-row">
          <OverviewCard
            label="Total Balance"
            amount={formatAmount(balance, currency)}
            change={pctChange(balance, balance - (income - expense) + (prevMonth.income - prevMonth.expense))}
            sparkData={balanceSpark}
            color="#6FFBBE"
          />
          <OverviewCard
            label="Monthly Income"
            amount={formatAmount(income, currency)}
            change={pctChange(income, prevMonth.income)}
            sparkData={incomeSpark}
            color="#34d399"
          />
          <OverviewCard
            label="Monthly Expense"
            amount={formatAmount(expense, currency)}
            change={pctChange(expense, prevMonth.expense)}
            sparkData={expenseSpark}
            color="#fb7185"
            invertChange
          />
        </div>

        {/* Row 2 — Smart Insights */}
        {insights.length > 0 && (
          <div className="smart-insights-row">
            {insights.map((insight, i) => (
              <div key={i} className={`smart-insight-chip ${insight.type}`}>
                <span className="smart-insight-icon">{insight.icon}</span>
                <span className="smart-insight-text">{insight.text}</span>
              </div>
            ))}
          </div>
        )}

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
                  {filteredQaAccounts.map((a) => (
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

          {/* Analytics Section */}
          <div className="dashboard-section" style={{ animationDelay: '0.35s' }}>
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">Analytics</h2>
              <span className="analytics-period-badge">This Month</span>
            </div>
            <div className="analytics-grid">
              <div className="analytics-stat-card card">
                <div className="analytics-stat-label">Savings Rate</div>
                <div className={`analytics-stat-value ${analytics.savingsRate >= 0 ? 'positive' : 'negative'}`}>
                  {analytics.savingsRate}%
                </div>
                <div className="analytics-stat-bar">
                  <div
                    className={`analytics-stat-bar-fill ${analytics.savingsRate >= 30 ? 'good' : analytics.savingsRate >= 0 ? 'okay' : 'bad'}`}
                    style={{ width: `${Math.min(Math.abs(analytics.savingsRate), 100)}%` }}
                  />
                </div>
              </div>
              <div className="analytics-stat-card card">
                <div className="analytics-stat-label">Daily Average</div>
                <div className="analytics-stat-value">
                  {formatAmount(analytics.dailyAvg, currency)}
                </div>
                <div className="analytics-stat-sublabel">spent per day</div>
              </div>
            </div>
            <div className="analytics-trend card">
              <div className="analytics-trend-title">7-Day Spending</div>
              <div className="analytics-sparkline">
                {analytics.last7.map((day, i) => (
                  <div key={i} className="sparkline-bar-group">
                    <div className="sparkline-bar-track">
                      <div
                        className="sparkline-bar-fill"
                        style={{ height: `${Math.max((day.amount / analytics.maxDay) * 100, 4)}%` }}
                        title={formatAmount(day.amount, currency)}
                      />
                    </div>
                    <span className="sparkline-label">{day.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {analytics.categoryBreakdown.length > 0 && (
              <div className="analytics-categories card">
                <div className="analytics-trend-title">Top Spending Categories</div>
                {analytics.categoryBreakdown.map((cat) => (
                  <div key={cat.key} className="analytics-cat-row">
                    <div className="analytics-cat-info">
                      <span className="analytics-cat-name">{cat.name}</span>
                      <span className="analytics-cat-amount">{formatAmount(cat.amount, currency)}</span>
                    </div>
                    <div className="analytics-cat-bar">
                      <div className="analytics-cat-bar-fill" style={{ width: `${cat.percent}%` }} />
                    </div>
                    <span className="analytics-cat-percent">{Math.round(cat.percent)}%</span>
                  </div>
                ))}
              </div>
            )}
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

/* ── Mini Sparkline (SVG) ── */
function MiniSparkline({ data, color = '#6FFBBE', width = 80, height = 32 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (width - pad * 2);
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <polygon
        points={`${pad},${height} ${points} ${width - pad},${height}`}
        fill={`url(#sg-${color.replace('#', '')})`}
      />
      {/* Line */}
      <polyline
        points={points}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Overview Stat Card ── */
function OverviewCard({ label, amount, change, sparkData, color, invertChange }) {
  const isPositive = invertChange ? change <= 0 : change >= 0;
  const arrow = change >= 0 ? '↑' : '↓';
  const absChange = Math.abs(change);

  return (
    <div className="fin-overview-card card">
      <div className="fin-overview-top">
        <span className="fin-overview-label">{label}</span>
        {change !== 0 && (
          <span className={`fin-overview-change ${isPositive ? 'positive' : 'negative'}`}>
            {arrow} {absChange}%
          </span>
        )}
      </div>
      <div className="fin-overview-amount">{amount}</div>
      <div className="fin-overview-spark">
        <MiniSparkline data={sparkData} color={color} width={100} height={28} />
      </div>
    </div>
  );
}
