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
import { getCategoryInfo, getExpenseCategories, getIncomeCategories } from '../utils/categories';
import { toInputDate } from '../utils/dateFormat';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import './Dashboard.css';

function AnimatedAmount({ value, currency }) {
  const animated = useAnimatedCounter(value || 0, 1200);
  return <>{formatAmount(animated, currency)}</>;
}



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
  const [qaCategory, setQaCategory] = useState('food');
  const [qaSuccess, setQaSuccess] = useState(false);
  const [qaExpanded, setQaExpanded] = useState(false);

  const qaCategoryList = useMemo(() => {
    return qaType === 'income' ? getIncomeCategories() : getExpenseCategories();
  }, [qaType]);

  const openExpandedQa = (type) => {
    setQaType(type);
    setQaCategory(type === 'income' ? 'salary' : 'food');
    setQaExpanded(true);
  };

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
      category: qaCategory || (qaType === 'income' ? 'salary' : 'food'),
      date: toInputDate(),
      note: qaNote,
      accountId: qaAccountId,
    });
    adjustBalance(qaAccountId, amt, qaType);
    setQaAmount('');
    setQaNote('');
    setQaSuccess(true);
    setTimeout(() => {
      setQaSuccess(false);
      setQaExpanded(false);
    }, 1500);
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
    
    let biggestTxn = null;
    const catMap = {};
    const monthTxns = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMo;
    });

    monthTxns.forEach(t => {
      if (t.type === 'expense') {
        const cat = t.category || 'other_expense';
        catMap[cat] = (catMap[cat] || 0) + t.amount;
        if (!biggestTxn || t.amount > biggestTxn.amount) {
           biggestTxn = t;
        }
      }
    });

    const totalExpenseAmt = Object.values(catMap).reduce((s, v) => s + v, 0);
    
    let startPercent = 0;
    const pieSegments = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([key, amount]) => {
         const info = getCategoryInfo(key);
         const percentNum = totalExpenseAmt > 0 ? (amount / totalExpenseAmt) * 100 : 0;
         const segment = { 
            key, 
            name: info.name, 
            amount, 
            percent: Math.round(percentNum), 
            startPercent, 
            color: info.color || '#3b82f6' 
         };
         startPercent += percentNum;
         return segment;
      });

    const topCategory = pieSegments.length > 0 ? pieSegments[0] : null;

    const weeksData = [];
    let maxVal = 1;
    for (let w = 3; w >= 0; w--) {
       const startDay = new Date(now);
       startDay.setHours(0,0,0,0);
       startDay.setDate(now.getDate() - (w * 7) - 6);
       
       const endDay = new Date(now);
       endDay.setHours(23,59,59,999);
       endDay.setDate(now.getDate() - (w * 7));

       const wTxns = transactions.filter(t => {
          const d = new Date(t.date);
          return d >= startDay && d <= endDay;
       });
       
       const inc = wTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
       const exp = wTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
       
       maxVal = Math.max(maxVal, inc, exp);
       weeksData.push({ label: `W${4-w}`, inc, exp });
    }

    return { totalExpenseAmt, biggestTxn, pieSegments, topCategory, weeksData, maxVal };
  }, [transactions]);

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
    const now = new Date();

    // 1. Savings Insight: "You saved ৳12,400 this month (+18%)"
    const currentSavings = income - expense;
    const prevSavings = prevMonth.income - prevMonth.expense;
    if (currentSavings > 0) {
      let savingsText = `You saved ${sym}${currentSavings.toLocaleString()} this month`;
      if (prevSavings > 0) {
        const savingsGrowth = Math.round(((currentSavings - prevSavings) / prevSavings) * 100);
        if (savingsGrowth > 0) {
          savingsText += ` (+${savingsGrowth}%)`;
          items.push({ type: 'positive', icon: '💰', text: savingsText });
        } else if (savingsGrowth < 0) {
          savingsText += ` (${savingsGrowth}%)`;
          items.push({ type: 'warning', icon: '💰', text: savingsText });
        } else {
          items.push({ type: 'positive', icon: '💰', text: savingsText });
        }
      } else {
        items.push({ type: 'positive', icon: '💰', text: savingsText });
      }
    }

    // 2. Category spending increase vs last month: "Your food spending increased 22% ⚠"
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
        icon: '⚠️',
        text: `Your ${biggestIncrease.name.toLowerCase()} spending increased ${biggestIncrease.pct}%`,
      });
    }

    // 3. Goal tracking / general pace: "You’re on track to hit your savings goal"
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(cy, cm + 1, 0).getDate();
    const projectedExpense = dayOfMonth > 0 ? (expense / dayOfMonth) * daysInMonth : 0;

    // Only show pace warnings if we're a few days into the month
    if (prevMonth.expense > 0 && dayOfMonth >= 5) {
      if (projectedExpense > prevMonth.expense * 1.1) {
        items.push({
          type: 'warning',
          icon: '📉',
          text: `You're on pace to overspend by ${Math.round(((projectedExpense / prevMonth.expense) - 1) * 100)}% this month`,
        });
      } else if (projectedExpense < prevMonth.expense * 0.9) {
        items.push({
          type: 'positive',
          icon: '📈',
          text: `You're on track to spend less than last month!`,
        });
      }
    }

    // 4. Overdue Debts Action
    const overdueCount = overdueDebts.length;
    if (overdueCount > 0) {
      items.push({
        type: 'negative',
        icon: '🚨',
        text: `You have ${overdueCount} overdue debt${overdueCount > 1 ? 's' : ''}. Settle them to avoid penalties.`,
        action: '/debts',
        actionText: 'Pay Now'
      });
    }

    // 5. Unused Wallet Alert
    if (accounts.length > 1) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      const idleWallets = accounts.filter(acc => {
        if (acc.balance <= 0) return false;
        const hasRecentTxn = transactions.some(t => t.accountId === acc.id && t.date >= thirtyDaysAgoStr);
        return !hasRecentTxn;
      });

      if (idleWallets.length > 0 && items.length < 4) {
        items.push({
          type: 'info',
          icon: '💤',
          text: `Your ${idleWallets[0].name} wallet has been idle. Consider investing it.`,
        });
      }
    }

    // If no negative insights, add a generic positive one:
    if (items.filter(i => i.type === 'positive').length === 0 && items.filter(i => i.type === 'warning' || i.type === 'negative').length === 0) {
      if (income > 0 && expense < income) {
        items.push({
          type: 'positive',
          icon: '🎯',
          text: `You're on track to hit your savings goal`,
        });
      }
    }

    return items.slice(0, 4); // Max 4 insights
  }, [transactions, income, expense, prevMonth, currency, overdueDebts, accounts]);

  return (
    <div className="page" id="dashboard-page">
      <div className="dashboard-grid">
        <div className="dashboard-header">
          <div>
            <div className="dashboard-greeting">Good {getGreeting()} 👋</div>
            <h1 className="page-title">Dashboard</h1>
          </div>
        </div>

        {/* Row 1 — Financial Overview */}
        <div className="fin-overview-row">
          <OverviewCard
            label="Total Balance"
            amount={<AnimatedAmount value={balance} currency={currency} />}
            change={pctChange(balance, balance - (income - expense) + (prevMonth.income - prevMonth.expense))}
            sparkData={balanceSpark}
            color="#38bdf8"
            onClick={() => navigate('/accounts')}
            subtitle="from last month"
          />
          <OverviewCard
            label="Monthly Income"
            amount={<AnimatedAmount value={income} currency={currency} />}
            change={pctChange(income, prevMonth.income)}
            sparkData={incomeSpark}
            color="#34d399"
            onClick={() => navigate('/transactions?type=income')}
            subtitle="this month"
          />
          <OverviewCard
            label="Monthly Expense"
            amount={<AnimatedAmount value={expense} currency={currency} />}
            change={pctChange(expense, prevMonth.expense)}
            sparkData={expenseSpark}
            color="#fb7185"
            invertChange
            onClick={() => navigate('/transactions?type=expense')}
            subtitle="this month"
          />
        </div>

        {/* Row 2 — Smart Insights */}
        {insights.length > 0 && (
          <div className="smart-insights-row">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`smart-insight-chip ${insight.type} ${insight.action ? 'has-action' : ''}`}
                onClick={insight.action ? () => navigate(insight.action) : undefined}
              >
                <div className="smart-insight-content">
                  <span className="smart-insight-icon">{insight.icon}</span>
                  <span className="smart-insight-text">{insight.text}</span>
                </div>
                {insight.actionText && (
                  <button className="insight-action-btn">{insight.actionText}</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Left Column - Main Vault Activity */}
        <div className="dashboard-col-main">
          <BalanceCard balance={balance} income={income} expense={expense} />

          {/* Fast Input System */}
          <div className="dashboard-section quick-add-section" style={{ animationDelay: '0.08s' }}>
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">Fast Input</h2>
              {qaExpanded && (
                <button className="btn-link" onClick={() => { setQaExpanded(false); setQaAmount(''); setQaNote(''); }}>
                  Cancel
                </button>
              )}
            </div>

            {!qaExpanded ? (
              <div className="fast-input-minimal">
                <button className="fast-btn fast-expense" onClick={() => openExpandedQa('expense')}>
                  <span className="fast-icon">-</span> Add Expense
                </button>
                <button className="fast-btn fast-income" onClick={() => openExpandedQa('income')}>
                  <span className="fast-icon">+</span> Add Income
                </button>
              </div>
            ) : (
              <form className="fast-input-expanded card" onSubmit={handleQuickAdd}>
                <div className={`fast-input-header ${qaType}`}>
                  <span className="fast-mode-label">{qaType === 'expense' ? 'New Expense' : 'New Income'}</span>
                  <div className="fast-type-toggle">
                    <button type="button" className={qaType === 'expense' ? 'active' : ''} onClick={() => { setQaType('expense'); setQaCategory('food'); }}>Exp</button>
                    <button type="button" className={qaType === 'income' ? 'active' : ''} onClick={() => { setQaType('income'); setQaCategory('salary'); }}>Inc</button>
                  </div>
                </div>

                <div className="fast-amount-wrapper">
                  <span className="fast-currency">{currency?.symbol || '৳'}</span>
                  <input
                    type="number"
                    className="fast-amount-input"
                    placeholder="0.00"
                    value={qaAmount}
                    onChange={(e) => setQaAmount(e.target.value)}
                    step="any"
                    min="0"
                    autoFocus
                    required
                  />
                </div>

                <div className="fast-input-row">
                  <input
                    type="text"
                    className="fast-note-input"
                    placeholder="What was this for? (optional)"
                    value={qaNote}
                    onChange={(e) => setQaNote(e.target.value)}
                  />
                </div>

                <div className="fast-categories">
                  {qaCategoryList.slice(0, 7).map(([key, cat]) => (
                    <button
                      key={key}
                      type="button"
                      className={`fast-cat-chip ${qaCategory === key ? 'active' : ''}`}
                      onClick={() => setQaCategory(key)}
                    >
                      <span className="fast-cat-icon">{cat.icon}</span>
                      <span className="fast-cat-name">{cat.name}</span>
                    </button>
                  ))}
                </div>

                <div className="fast-footer">
                  <select
                    className="fast-account-select"
                    value={qaAccountId}
                    onChange={(e) => setQaAccountId(e.target.value)}
                  >
                    {filteredQaAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <button type="submit" className={`fast-submit-btn ${qaType}`}>
                    {qaSuccess ? '✓ Saved' : '+ Save'}
                  </button>
                </div>
              </form>
            )}
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
            <div className="dashboard-wallets-list">
              {accounts.map((acc) => {
                const totalPositiveBal = accounts.reduce((sum, a) => sum + Math.max(0, a.balance), 0);
                const pct = totalPositiveBal > 0 && acc.balance > 0
                  ? Math.round((acc.balance / totalPositiveBal) * 100)
                  : 0;

                return (
                  <div
                    key={acc.id}
                    className="dashboard-wallet-row card"
                    onClick={() => navigate('/accounts')}
                  >
                    <div className="wallet-row-left">
                      <div
                        className="wallet-row-icon"
                        style={{ background: `${acc.color}15`, color: acc.color }}
                      >
                        {renderAccountIcon(acc.icon, 20)}
                      </div>
                      <div className="wallet-row-info">
                        <div className="wallet-row-name">{acc.name}</div>
                        <div className="wallet-row-type" style={{ color: acc.color }}>
                          {acc.type === 'income' ? 'Income Only' : acc.type === 'expense' ? 'Expense Only' : 'Standard'}
                        </div>
                      </div>
                    </div>
                    <div className="wallet-row-right">
                      <div className="wallet-row-balances">
                        <span className="wallet-row-amount">{formatAmount(acc.balance, currency)}</span>
                        <span className="wallet-row-pct">({pct}%)</span>
                      </div>
                      <div className="wallet-row-bar-bg">
                        <div className="wallet-row-bar-fill" style={{ width: `${pct}%`, background: acc.color }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overdue debts alert */}
          {overdueDebts.length > 0 && (
            <div className="dashboard-alert" onClick={() => navigate('/debts')}>
              <svg style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
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
              <div className="recent-txns-column" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
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

          {/* Monthly Rhythm CTA */}
          <div className="dashboard-section" style={{ animationDelay: '0.3s' }}>
            <div className="ms-dashboard-cta card" onClick={() => navigate('/monthly')} style={{ cursor: 'pointer', padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', border: '1px solid rgba(99, 102, 241, 0.2)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(59, 130, 246, 0.06))' }}>
              <div style={{ fontSize: '1.6rem', flexShrink: 0 }}>📊</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 'var(--text-sm)', marginBottom: '2px' }}>
                  {new Date().toLocaleString('default', { month: 'long' })} Summary
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Review your monthly performance & export report
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>

          {/* Analytics Section */}
          <div className="dashboard-section" style={{ animationDelay: '0.35s' }}>
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">Analytics</h2>
              <span className="analytics-period-badge">This Month</span>
            </div>
            
            {/* 1. Category Insights */}
            <div className="analytics-insights-row">
              <div className="analytics-insight-card card">
                <span className="insight-card-label">Top Category</span>
                <div className="insight-card-val">{analytics.topCategory ? analytics.topCategory.name : 'None'}</div>
                <div className="insight-card-sub">{analytics.topCategory ? `${analytics.topCategory.percent}% of spending` : '-'}</div>
              </div>
              <div className="analytics-insight-card card">
                <span className="insight-card-label">Biggest Expense</span>
                <div className="insight-card-val">{analytics.biggestTxn ? (analytics.biggestTxn.note || getCategoryInfo(analytics.biggestTxn.category).name) : 'None'}</div>
                <div className="insight-card-sub">{analytics.biggestTxn ? <AnimatedAmount value={analytics.biggestTxn.amount} currency={currency} /> : '-'}</div>
              </div>
            </div>

            {/* 2. Income vs Expense Trend (Line) */}
            <div className="analytics-trend-chart card">
              <div className="analytics-card-header">
                 <span>Cashflow Trend</span>
                 <div className="analytics-legend">
                    <span className="legend-dot income"></span> Income
                    <span className="legend-dot expense"></span> Expense
                 </div>
              </div>
              <div className="analytics-line-wrapper">
                 <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="analytics-svg-line">
                   {/* Draw lines */}
                   <polyline 
                      points={analytics.weeksData.map((w, i) => `${(i / 3) * 100},${40 - (w.inc / analytics.maxVal) * 35}`).join(' ')} 
                      fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" 
                   />
                   <polyline 
                      points={analytics.weeksData.map((w, i) => `${(i / 3) * 100},${40 - (w.exp / analytics.maxVal) * 35}`).join(' ')} 
                      fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" 
                   />
                 </svg>
                 <div className="analytics-x-axis">
                   {analytics.weeksData.map((w, i) => <span key={i}>{w.label}</span>)}
                 </div>
              </div>
            </div>

            {/* 3. Spending Breakdown (Pie/Donut) */}
            {analytics.pieSegments.length > 0 && (
              <div className="analytics-breakdown card">
                <div className="analytics-card-header">
                  <span>Spending Breakdown</span>
                </div>
                <div className="analytics-pie-row">
                  <div className="analytics-pie-container">
                    <svg viewBox="0 0 100 100" className="analytics-donut">
                      {analytics.pieSegments.map((seg, i) => {
                         const strokeDasharray = `${seg.percent} ${100 - seg.percent}`;
                         const strokeDashoffset = 25 - seg.startPercent;
                         return (
                           <circle 
                             key={seg.key}
                             cx="50" cy="50" r="15.915494309" 
                             fill="transparent" 
                             stroke={seg.color} 
                             strokeWidth="5" 
                             strokeDasharray={strokeDasharray} 
                             strokeDashoffset={strokeDashoffset}
                           />
                         )
                      })}
                    </svg>
                    <div className="analytics-donut-center">
                       <span className="donut-total"><AnimatedAmount value={analytics.totalExpenseAmt} currency={currency} /></span>
                       <span className="donut-lbl">Total Spent</span>
                    </div>
                  </div>
                  <div className="analytics-pie-legend">
                    {analytics.pieSegments.map((seg) => (
                      <div className="pie-legend-item" key={seg.key}>
                        <div className="pie-legend-color" style={{ background: seg.color }}></div>
                        <div className="pie-legend-name">{seg.name}</div>
                        <div className="pie-legend-pct">{seg.percent}%</div>
                      </div>
                    ))}
                  </div>
                </div>
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
function MiniSparkline({ data, color = '#6FFBBE', width = 200, height = 60 }) {
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
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" fill="none" style={{ display: 'block', position: 'absolute', bottom: 0, left: 0 }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
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
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ── Overview Stat Card ── */
function OverviewCard({ label, amount, change, sparkData, color, invertChange, onClick, subtitle }) {
  const isPositive = invertChange ? change <= 0 : change >= 0;
  const arrow = change >= 0 ? '↑' : '↓';
  const absChange = Math.abs(change);

  return (
    <div className="fin-overview-card card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', '--card-color': color }}>
      <div className="fin-overview-bg-gradient" />
      <div className="fin-overview-content">
        <div className="fin-overview-top">
          <span className="fin-overview-label">{label}</span>
        </div>
        <div className="fin-overview-amount">{amount}</div>
        <div className="fin-overview-bottom">
          {change !== 0 ? (
            <span className={`fin-overview-change-wrap ${isPositive ? 'positive' : 'negative'}`}>
              <span className="fin-overview-change">
                {change > 0 ? '+' : (change < 0 ? '-' : '')}{absChange}% {arrow}
              </span>
              <span className="fin-overview-change-text">{subtitle || 'this month'}</span>
            </span>
          ) : (
            <span className="fin-overview-change-wrap neutral">
              <span className="fin-overview-change">0%</span>
              <span className="fin-overview-change-text">{subtitle || 'this month'}</span>
            </span>
          )}
        </div>
      </div>
      <div className="fin-overview-spark">
        <MiniSparkline data={sparkData} color={color} />
      </div>
    </div>
  );
}
