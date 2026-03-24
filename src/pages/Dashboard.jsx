import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useAccountStore } from '../stores/useAccountStore';
import { renderAccountIcon } from '../utils/accountIcons';
import { useDebtStore } from '../stores/useDebtStore';
import { getMonthKey } from '../utils/dateFormat';
import { usePrivacy } from '../hooks/usePrivacy';
import BalanceCard from '../components/BalanceCard';
import TransactionItem from '../components/TransactionItem';
import { getCategoryInfo, getExpenseCategories, getIncomeCategories } from '../utils/categories';
import { toInputDate } from '../utils/dateFormat';
import BottomSheet from '../components/BottomSheet';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import TodaySection from '../components/TodaySection';
import './Dashboard.css';

function AnimatedAmount({ value, currency }) {
  const animated = useAnimatedCounter(value || 0, 1200);
  const { mask } = usePrivacy();
  return <>{mask(animated, currency)}</>;
}



export default function Dashboard() {
  const navigate = useNavigate();
  const transactions = useTransactionStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.currency);
  const accounts = useAccountStore((s) => s.accounts);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const adjustBalance = useAccountStore((s) => s.adjustBalance);
  const debts = useDebtStore((s) => s.debts);
  const { mask } = usePrivacy();

  // Quick-add state
  const [qaAmount, setQaAmount] = useState('');
  const [qaType, setQaType] = useState('expense');
  const [qaNote, setQaNote] = useState('');
  const [qaAccountId, setQaAccountId] = useState('');
  const [qaCategory, setQaCategory] = useState('food');
  const [qaSuccess, setQaSuccess] = useState(false);
  const [qaExpanded, setQaExpanded] = useState(false);
  const [showLowBalanceWarning, setShowLowBalanceWarning] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('month'); // 'week', 'month', 'last_month'
  const qaInputRef = useRef(null);

  // Prevent auto-scroll on expansion
  useEffect(() => {
    if (qaExpanded && qaInputRef.current) {
      setTimeout(() => {
        qaInputRef.current?.focus({ preventScroll: true });
      }, 50);
    }
  }, [qaExpanded]);

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

  const executeQuickAdd = () => {
    const amt = Number(qaAmount);
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

  const handleQuickAdd = (e) => {
    e?.preventDefault();
    const amt = Number(qaAmount);
    if (!amt || amt <= 0) return;

    if (qaType === 'expense') {
      const account = accounts.find(a => a.id === qaAccountId);
      if (account && amt > (account.balance || 0)) {
        setShowLowBalanceWarning(true);
        return;
      }
    }

    executeQuickAdd();
  };

  const currentMonth = getMonthKey(toInputDate());

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
    const bal = accounts.reduce((s, a) => s + a.balance, 0);

    const recent = [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    return { balance: bal, income: inc, expense: exp, recentTxns: recent };
  }, [transactions, currentMonth, accounts]);

  // Smoothed path helper (Cubic Bezier)
  const getCurvePath = (data, accessor, max, width = 100, height = 40) => {
    if (!data.length) return '';
    const points = data.map((d, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - (accessor(d) / max) * (height * 0.85) - 2
    }));

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 2;
        const cp2x = p0.x + (p1.x - p0.x) / 2;
        path += ` C ${cp1x} ${p0.y}, ${cp2x} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  // ── Contextual data for summary cards ──
  const cardContext = useMemo(() => {
    const sym = currency?.symbol || '৳';
    const now = new Date();
    const todayStr = toInputDate(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toInputDate(yesterday);

    // Balance change since yesterday
    const todayNet = transactions
      .filter((t) => t.date === todayStr)
      .reduce((s, t) => {
        if (t.type === 'income') return s + t.amount;
        if (t.type === 'expense') return s - t.amount;
        return s;
      }, 0);
    const balDir = todayNet >= 0 ? '↑' : '↓';
    const balContext = todayNet !== 0
      ? `${balDir} ${sym}${Math.abs(todayNet).toLocaleString()} since yesterday`
      : 'No change today';

    // Income source count this month
    const monthTxns = transactions.filter((t) => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonth;
    });
    const incomeSources = new Set(
      monthTxns.filter((t) => t.type === 'income').map((t) => t.category || 'other_income')
    );
    const incContext = incomeSources.size > 0
      ? `${incomeSources.size} source${incomeSources.size !== 1 ? 's' : ''} this month`
      : 'No income yet';

    // Top expense category this month
    const expCatMap = {};
    monthTxns.forEach((t) => {
      if (t.type === 'expense') {
        const cat = t.category || 'other_expense';
        expCatMap[cat] = (expCatMap[cat] || 0) + t.amount;
      }
    });
    const topExpCat = Object.entries(expCatMap).sort((a, b) => b[1] - a[1])[0];
    const expContext = topExpCat
      ? `Top: ${getCategoryInfo(topExpCat[0]).name}`
      : 'No expenses yet';

    return { balContext, incContext, expContext };
  }, [transactions, currency, currentMonth]);

  // Analytics computations
  const analytics = useMemo(() => {
    const now = new Date();
    let startDate, endDate;

    if (analyticsPeriod === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (analyticsPeriod === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else {
      // Default: This Month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    }
    
    let biggestTxn = null;
    const catMap = {};
    let totalIncomeAmt = 0;
    
    const startStr = toInputDate(startDate);
    const endStr = toInputDate(endDate);

    const filterTxns = transactions.filter((t) => {
      return t.date >= startStr && t.date <= endStr;
    });

    filterTxns.forEach(t => {
      if (t.type === 'expense') {
        const cat = t.category || 'other_expense';
        catMap[cat] = (catMap[cat] || 0) + t.amount;
        if (!biggestTxn || t.amount > biggestTxn.amount) {
           biggestTxn = t;
        }
      } else if (t.type === 'income') {
        totalIncomeAmt += t.amount;
      }
    });

    const totalExpenseAmt = Object.values(catMap).reduce((s, v) => s + v, 0);
    const netFlow = totalIncomeAmt - totalExpenseAmt;
    const savingsRate = totalIncomeAmt > 0 ? Math.round((netFlow / totalIncomeAmt) * 100) : 0;
    
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

    // Line chart data (4 points)
    const weeksData = [];
    let maxVal = 1;
    const rangeMs = endDate - startDate;
    const stepMs = rangeMs / 3;

    for (let i = 0; i <= 3; i++) {
       const stepEnd = new Date(startDate.getTime() + (i * stepMs));
       const stepStart = i === 0 ? startDate : new Date(startDate.getTime() + ((i-1) * stepMs));
       
       const stepTxns = transactions.filter(t => {
          const d = new Date(t.date);
          return d >= stepStart && d <= stepEnd;
       });
       
       const inc = stepTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
       const exp = stepTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
       const net = inc - exp;
       
       maxVal = Math.max(maxVal, inc, exp, Math.abs(net));
       weeksData.push({ label: `P${i+1}`, inc, exp, net });
    }

    // Smart Warnings
    const warnings = [];
    if (topCategory && topCategory.percent > 50) {
      warnings.push(`Spending highly concentrated in ${topCategory.name} (${topCategory.percent}%)`);
    }
    if (biggestTxn && totalExpenseAmt > 0 && (biggestTxn.amount / totalExpenseAmt) > 0.3) {
      warnings.push(`Single high transaction detected: ${biggestTxn.note || 'Expense'}`);
    }

    return { 
      totalExpenseAmt, 
      totalIncomeAmt, 
      netFlow, 
      savingsRate, 
      biggestTxn, 
      pieSegments, 
      topCategory, 
      weeksData, 
      maxVal,
      warnings,
      periodLabel: analyticsPeriod === 'week' ? 'Past 7 Days' : analyticsPeriod === 'last_month' ? 'Last Month' : 'This Month'
    };
  }, [transactions, analyticsPeriod]);

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
      const ds = toInputDate(d);
      pts.push(transactions.filter((t) => t.date === ds && filterFn(t)).reduce((s, t) => s + t.amount, 0));
    }
    return pts;
  };

  const balanceSpark = useMemo(() => {
    const pts = [];
    const now = new Date();
    const totalBal = accounts.reduce((s, a) => s + a.balance, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = toInputDate(d);
      const futureTxns = transactions.filter((t) => t.date > ds);
      const futureNet = futureTxns.reduce((s, t) => {
          if (t.type === 'income') return s + t.amount;
          if (t.type === 'expense') return s - t.amount;
          return s;
      }, 0);
      pts.push(totalBal - futureNet);
    }
    return pts;
  }, [transactions, accounts]);

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
        
        {/* Main Vault Asset & Fast Input System */}
        <div className="dashboard-col-main" style={{ marginBottom: '16px' }}>
          <div className="dashboard-hero-date">
            <span className="today-date-pill">Today &bull; {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>

          <BalanceCard balance={balance} income={income} expense={expense} />

          {/* Moved Fast Input System here */}
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
                    ref={qaInputRef}
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
            
            {qaSuccess && (
              <div className="fast-success-msg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Transaction added!
              </div>
            )}
          </div>
        </div>

        <TodaySection />

        {/* Row 1 — Financial Overview */}
        <div className="fin-overview-row">
          <OverviewCard
            label="Monthly Income"
            amount={<AnimatedAmount value={income} currency={currency} />}
            change={pctChange(income, prevMonth.income)}
            sparkData={incomeSpark}
            color="#34d399"
            onClick={() => navigate('/transactions?type=income')}
            subtitle="this month"
            contextLine={cardContext.incContext}
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
            contextLine={cardContext.expContext}
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


          {/* My Accounts */}
          <div className="dashboard-section" style={{ animationDelay: '0.12s' }}>
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">My Accounts</h2>
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
                        <span className="wallet-row-amount">{mask(acc.balance, currency)}</span>
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
                  <span className="debt-value income">{mask(totalOwedToMe, currency)}</span>
                </div>
                <div className="dashboard-debt-item">
                  <span className="debt-label">Payable</span>
                  <span className="debt-value expense">{mask(totalIOwe, currency)}</span>
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
              <div style={{ fontSize: '1.6rem', flexShrink: 0, color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg></div>
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
          <div className="dashboard-section analytics-section" style={{ animationDelay: '0.35s' }}>
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">Analytics Insight</h2>
              <div className="analytics-filters">
                 {['week', 'month', 'last_month'].map(p => (
                   <button 
                     key={p} 
                     className={`filter-chip ${analyticsPeriod === p ? 'active' : ''}`}
                     onClick={() => setAnalyticsPeriod(p)}
                   >
                     {p === 'week' ? 'Past 7D' : p === 'month' ? 'This Month' : 'Last Month'}
                   </button>
                 ))}
              </div>
            </div>

            {/* Smart Summary Layer */}
            <div className="analytics-smart-summary card">
               <div className="summary-header">
                  <span className="summary-period">{analytics.periodLabel} Summary</span>
               </div>
               <div className="summary-bullets">
                  <div className="summary-bullet">
                    <span className="bullet-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg></span>
                    <span className="bullet-text">
                       {analytics.totalExpenseAmt > 0 ? (
                         <>You spent most on <strong>{analytics.topCategory?.name}</strong> ({analytics.topCategory?.percent}%)</>
                       ) : 'No expenses recorded in this period.'}
                    </span>
                  </div>
                  <div className="summary-bullet">
                    <span className="bullet-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></span>
                    <span className="bullet-text">
                       {analyticsPeriod === 'month' && (
                         <>Spending <strong>{pctChange(analytics.totalExpenseAmt, prevMonth.expense) > 0 ? 'increased' : 'decreased'}</strong> vs last month</>
                       )}
                       {analyticsPeriod !== 'month' && <>Spending is <strong>{analytics.totalExpenseAmt > 0 ? 'active' : 'stable'}</strong></>}
                    </span>
                  </div>
                  {analytics.biggestTxn && (
                    <div className="summary-bullet clickable" onClick={() => navigate('/transactions')}>
                      <span className="bullet-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
                      <span className="bullet-text">Biggest single expense: <strong><AnimatedAmount value={analytics.biggestTxn.amount} currency={currency} /></strong> ({analytics.biggestTxn.note || 'Lent/Expense'})</span>
                    </div>
                  )}
               </div>
               {analytics.warnings.map((w, i) => (
                 <div key={i} className="analytics-warning-msg">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    {w}
                 </div>
               ))}
            </div>
            
            <div className="analytics-insights-row">
              <div className="analytics-insight-card card clickable" onClick={() => navigate('/transactions')}>
                <span className="insight-card-label">Savings Insight</span>
                <div className="insight-card-val"><AnimatedAmount value={analytics.netFlow} currency={currency} /></div>
                <div className="insight-card-sub">{analytics.savingsRate}% savings rate</div>
              </div>
              <div className="analytics-insight-card card clickable" onClick={() => navigate('/transactions?type=expense')}>
                <span className="insight-card-label">Total Spent</span>
                <div className="insight-card-val"><AnimatedAmount value={analytics.totalExpenseAmt} currency={currency} /></div>
                <div className="insight-card-sub">{analytics.pieSegments.length} categories</div>
              </div>
            </div>

            {/* 2. Enhanced Cashflow Trend */}
            <div className="analytics-trend-chart card">
              <div className="analytics-card-header">
                 <span>Cashflow Trend</span>
                 <div className="analytics-legend">
                    <span className="legend-dot income"></span> Income
                    <span className="legend-dot expense"></span> Expense
                    <span className="legend-dot net"></span> Net
                 </div>
              </div>
              <div className="chart-quick-summary">
                 <div className="qs-item">
                    <span className="qs-lbl">Income</span>
                    <span className="qs-val income">{mask(analytics.totalIncomeAmt, currency)}</span>
                 </div>
                 <div className="qs-item">
                    <span className="qs-lbl">Expense</span>
                    <span className="qs-val expense">{mask(analytics.totalExpenseAmt, currency)}</span>
                 </div>
                 <div className="qs-item">
                    <span className="qs-lbl">Net Flow</span>
                    <span className="qs-val" style={{ color: analytics.netFlow >= 0 ? '#10b981' : '#f43f5e' }}>{mask(analytics.netFlow, currency)}</span>
                 </div>
              </div>
              <div className="analytics-line-wrapper enhanced modern">
                 <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="analytics-svg-line">
                   <defs>
                      <linearGradient id="grad-inc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="grad-exp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="grad-net" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                   </defs>
                   
                   {/* Smoothed Area Fills */}
                   <path 
                      d={`${getCurvePath(analytics.weeksData, (d) => d.inc, analytics.maxVal)} L 100 40 L 0 40 Z`}
                      fill="url(#grad-inc)"
                   />
                   <path 
                      d={`${getCurvePath(analytics.weeksData, (d) => d.exp, analytics.maxVal)} L 100 40 L 0 40 Z`}
                      fill="url(#grad-exp)"
                   />
                   
                   {/* Smoothed Lines */}
                   <path 
                      d={getCurvePath(analytics.weeksData, (d) => d.inc, analytics.maxVal)}
                      fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                   />
                   <path 
                      d={getCurvePath(analytics.weeksData, (d) => d.exp, analytics.maxVal)}
                      fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                   />
                   <path 
                      d={getCurvePath(analytics.weeksData, (d) => d.net, analytics.maxVal)}
                      fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                   />

                   {/* Point Highlights */}
                   {analytics.weeksData.map((d, i) => {
                      const x = (i / (analytics.weeksData.length - 1)) * 100;
                      const yInc = 40 - (d.inc / analytics.maxVal) * 34 - 2;
                      const yExp = 40 - (d.exp / analytics.maxVal) * 34 - 2;
                      return (
                        <g key={i}>
                           <circle cx={x} cy={yInc} r="1" fill="#10b981" stroke="#fff" strokeWidth="0.5" />
                           <circle cx={x} cy={yExp} r="1" fill="#f43f5e" stroke="#fff" strokeWidth="0.5" />
                        </g>
                      );
                   })}
                 </svg>
                 <div className="analytics-x-axis">
                   {analytics.weeksData.map((w, i) => <span key={i}>{w.label}</span>)}
                 </div>
              </div>
            </div>

            {/* 3. Deep Spending Breakdown */}
            <div className="analytics-breakdown card">
              <div className="analytics-card-header">
                <span>Spending Breakdown</span>
                <span className="header-sub">{analytics.periodLabel}</span>
              </div>
              <div className="analytics-pie-row">
                <div className="analytics-pie-container">
                  <svg viewBox="0 0 100 100" className="analytics-donut modern">
                    {/* Ring background for modern depth */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--color-bg-input)" strokeWidth="12" />
                    
                    {analytics.pieSegments.map((seg, i) => {
                       const r = 40;
                       const c = 2 * Math.PI * r;
                       // Add a 2% gap between segments
                       const gap = analytics.pieSegments.length > 1 ? 1.5 : 0;
                       const strokeDasharray = `${(seg.percent * c) / 100 - gap} ${c}`;
                       const strokeDashoffset = -(seg.startPercent * c) / 100;
                       return (
                         <circle 
                           key={seg.key}
                           cx="50" cy="50" r={r} 
                           fill="transparent" 
                           stroke={seg.color} 
                           strokeWidth="12" 
                           strokeDasharray={strokeDasharray} 
                           strokeDashoffset={strokeDashoffset}
                           strokeLinecap="round"
                         />
                       )
                    })}
                  </svg>
                  <div className="analytics-donut-center">
                     <span className="donut-total"><AnimatedAmount value={analytics.totalExpenseAmt} currency={currency} /></span>
                     <span className="donut-lbl">Spent</span>
                  </div>
                </div>
                <div className="analytics-pie-legend">
                  {analytics.pieSegments.slice(0, 5).map((seg) => (
                    <div className="pie-legend-item clickable" key={seg.key} onClick={() => navigate(`/transactions?category=${seg.key}`)}>
                      <div className="pie-legend-color" style={{ background: seg.color }}></div>
                      <div className="pie-legend-name">{seg.name}</div>
                      <div className="pie-legend-amount">{mask(seg.amount, currency)}</div>
                      <div className="pie-legend-pct">{seg.percent}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Where Money Went Section */}
            <div className="analytics-top-list card section-spacing">
               <div className="analytics-card-header">
                  <span>Where Money Went</span>
                  <button className="btn-link" onClick={() => navigate('/transactions')}>View All</button>
               </div>
               <div className="top-spending-items">
                  {analytics.pieSegments.slice(0, 3).map((seg, i) => (
                    <div key={seg.key} className="top-spending-row" onClick={() => navigate(`/transactions?category=${seg.key}`)}>
                        <div className="ts-rank">{i + 1}</div>
                        <div className="ts-info">
                           <div className="ts-name">{seg.name}</div>
                           <div className="ts-bar-wrap">
                              <div className="ts-bar-fill" style={{ width: `${seg.percent}%`, background: seg.color }}></div>
                           </div>
                        </div>
                        <div className="ts-amount">{mask(seg.amount, currency)}</div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>

        {/* Right Column - Utility */}
        <div className="dashboard-col-side">
          {/* You can add smaller widgets here later */}
        </div>
      {/* Low Balance Warning Sheet */}
      <BottomSheet isOpen={showLowBalanceWarning} onClose={() => setShowLowBalanceWarning(false)} title="Insufficient Funds" centered>
        <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>⚠️</div>
          <h3 style={{ marginBottom: 'var(--space-2)' }}>Low Balance</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
            This transaction exceeds the available balance in <strong>{accounts.find(a => a.id === qaAccountId)?.name || 'the current wallet'}</strong>.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexDirection: 'column' }}>
            <button className="btn btn-primary" onClick={() => {
              setShowLowBalanceWarning(false);
              const fallbackAccount = accounts.find(a => a.id !== qaAccountId && a.balance >= Number(qaAmount))?.id || accounts.find(a => a.id !== qaAccountId)?.id || '';
              navigate(`/add?type=transfer&toAccount=${qaAccountId}&account=${fallbackAccount}`);
            }}>
              Transfer Funds Here
            </button>
            <button className="btn btn-secondary" onClick={() => setShowLowBalanceWarning(false)}>Cancel</button>
          </div>
        </div>
      </BottomSheet>
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
function OverviewCard({ label, amount, change, sparkData, color, invertChange, onClick, subtitle, contextLine }) {
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
        {contextLine && (
          <div className="fin-overview-context">{contextLine}</div>
        )}
      </div>
      <div className="fin-overview-spark">
        <MiniSparkline data={sparkData} color={color} />
      </div>
    </div>
  );
}
