import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useDebtStore } from '../stores/useDebtStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { usePrivacy } from '../hooks/usePrivacy';
import { getMonthKey, toInputDate } from '../utils/dateFormat';
import { getCategoryInfo } from '../utils/categories';
import './TodaySection.css';

export default function TodaySection() {
  const navigate = useNavigate();
  const transactions = useTransactionStore((s) => s.transactions);
  const accounts = useAccountStore((s) => s.accounts);
  const budgets = useBudgetStore((s) => s.budgets);
  const getBudgetStatus = useBudgetStore((s) => s.getBudgetStatus);
  const debts = useDebtStore((s) => s.debts);
  const currency = useSettingsStore((s) => s.currency);
  const { mask } = usePrivacy();

  const now = new Date();
  const todayDateStr = toInputDate(now);
  const currentMonthKey = getMonthKey(toInputDate(now));

  const data = useMemo(() => {
    // 1. Spent / Received Today
    const todayTxns = transactions.filter((t) => t.date === todayDateStr);
    const spentToday = todayTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const receivedToday = todayTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    // 2. Pending items (future dates)
    const pendingTxns = transactions.filter((t) => {
      const tdate = new Date(t.date);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return tdate > startOfToday && t.date !== todayDateStr;
    });

    // 3. Debts due soon (Next 7 days + overdue)
    let debtsDueSoonCount = 0;
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    debts.forEach(d => {
      if (d.status === 'active' && d.dueDate) {
        const dueDate = new Date(d.dueDate);
        if (dueDate <= sevenDaysFromNow) {
          debtsDueSoonCount++;
        }
      }
    });

    // 4. Most used wallet today
    const walletCountMap = {};
    let mostUsedWalletId = null;
    let maxUsage = 0;
    todayTxns.forEach(t => {
      if (!t.accountId) return;
      walletCountMap[t.accountId] = (walletCountMap[t.accountId] || 0) + 1;
      if (walletCountMap[t.accountId] > maxUsage) {
        maxUsage = walletCountMap[t.accountId];
        mostUsedWalletId = t.accountId;
      }
    });
    const mostUsedWallet = accounts.find(a => a.id === mostUsedWalletId);

    // 5. Remaining daily allowance (Budget calculation)
    const monthBudgets = budgets.filter((b) => b.month === currentMonthKey);
    let totalBudget = 0;
    let totalSpent = 0;
    monthBudgets.forEach(b => {
      const status = getBudgetStatus(b.id, transactions);
      totalBudget += status?.totalLimit || b.amount;
      totalSpent += status ? status.spent : 0;
    });

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
    const safeDailyTotal = Math.max(0, (totalBudget - totalSpent) / daysLeft);

    // 6. Today's category breakdown
    const todayCatMap = {};
    todayTxns.forEach((t) => {
      if (t.type === 'expense') {
        const cat = t.category || 'other_expense';
        todayCatMap[cat] = (todayCatMap[cat] || 0) + t.amount;
      }
    });
    const todayBreakdown = Object.entries(todayCatMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([key, amount]) => {
        const info = getCategoryInfo(key);
        return { key, name: info.name, icon: info.icon, color: info.color || '#6b7280', amount };
      });

    return {
      spentToday,
      receivedToday,
      safeDailyTotal,
      pendingCount: pendingTxns.length,
      debtsDueSoonCount,
      mostUsedWallet: mostUsedWallet?.name,
      recentCount: todayTxns.length,
      todayBreakdown,
    };
  }, [transactions, budgets, debts, accounts, todayDateStr, currentMonthKey, getBudgetStatus, now]);

  return (
    <div className="today-section-container">
      <div className="today-header">
        <h2 className="today-title">Today's Pulse</h2>
        <span className="today-date">Today &bull; {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
      </div>
      
      <div className="today-grid">
        {/* Main highlight: Spent vs Received */}
        <div className="today-card primary card" onClick={() => navigate('/transactions')}>
          <div className="today-pulse-row">
            <div>
              <div className="today-label">Spent Today</div>
              <div className="today-value expense">{mask(data.spentToday, currency)}</div>
            </div>
            {data.receivedToday > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div className="today-label">Received</div>
                <div className="today-value income">+{mask(data.receivedToday, currency)}</div>
              </div>
            )}
          </div>

          {/* Today's Breakdown — where did it go? */}
          {data.todayBreakdown.length > 0 && (
            <div className="today-breakdown">
              <div className="today-breakdown-title">Where it went</div>
              <div className="today-breakdown-list">
                {data.todayBreakdown.map((cat) => (
                  <div className="today-breakdown-item" key={cat.key}>
                    <span className="today-breakdown-dot" style={{ background: cat.color }} />
                    <span className="today-breakdown-name">{cat.name}</span>
                    <span className="today-breakdown-amount">{mask(cat.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="today-daily-allowance">
             <div className="allowance-label">Remaining Safe Allowance</div>
             <div className="allowance-value">{mask(data.safeDailyTotal, currency)} / day</div>
          </div>
        </div>

        {/* Actionable secondary grid — ordered by urgency */}
        <div className="today-secondary-grid">
          {/* 🚨 Priority 1: Debts Due — strongest urgency */}
          <div className={`today-mini-card card mini-debts ${data.debtsDueSoonCount > 0 ? 'urgent' : ''}`} onClick={() => navigate('/debts')}>
            <span className="mini-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
            <div className="mini-content">
              <span className="mini-num">{data.debtsDueSoonCount}</span>
              <span className="mini-label">Debts Due</span>
            </div>
            {data.debtsDueSoonCount > 0 && <span className="mini-pulse" />}
          </div>

          {/* ⚠ Priority 2: Pending — amber warning */}
          <div className={`today-mini-card card mini-pending ${data.pendingCount > 0 ? 'warning' : ''}`} onClick={() => navigate('/transactions')}>
            <span className="mini-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
            <div className="mini-content">
              <span className="mini-num">{data.pendingCount}</span>
              <span className="mini-label">Pending</span>
            </div>
          </div>

          {/* 💰 Priority 3: Spending Status */}
          <div className="today-mini-card card mini-spending" onClick={() => navigate('/transactions')}>
            <span className="mini-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
            <div className="mini-content">
              <span className="mini-num">{mask(data.spentToday, currency)}</span>
              <span className="mini-label">Spent Today</span>
            </div>
          </div>

          {/* 📊 Priority 4: Activity */}
          <div className="today-mini-card card mini-activity" onClick={() => navigate('/transactions')}>
            <span className="mini-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></span>
            <div className="mini-content">
              <span className="mini-num">{data.recentCount}</span>
              <span className="mini-label">Activity</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
