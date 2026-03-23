import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useDebtStore } from '../stores/useDebtStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { usePrivacy } from '../hooks/usePrivacy';
import { getMonthKey } from '../utils/dateFormat';
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
  const todayDateStr = now.toISOString().split('T')[0];
  const currentMonthKey = getMonthKey(now.toISOString());

  const data = useMemo(() => {
    // 1. Spent / Received Today
    const todayTxns = transactions.filter((t) => t.date === todayDateStr);
    const spentToday = todayTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const receivedToday = todayTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    // 2. Pending items (future dates)
    const pendingTxns = transactions.filter((t) => {
      const tdate = new Date(t.date);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return tdate > startOfToday && t.date !== todayDateStr; // strictly future
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

    return {
      spentToday,
      receivedToday,
      safeDailyTotal,
      pendingCount: pendingTxns.length,
      debtsDueSoonCount,
      mostUsedWallet: mostUsedWallet?.name,
      recentCount: todayTxns.length,
    };
  }, [transactions, budgets, debts, accounts, todayDateStr, currentMonthKey, getBudgetStatus, now]);

  return (
    <div className="today-section-container">
      <div className="today-header">
        <h2 className="today-title">Today's Pulse</h2>
        <span className="today-date">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
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
          
          <div className="today-daily-allowance">
             <div className="allowance-label">Remaining Safe Allowance</div>
             <div className="allowance-value">{mask(data.safeDailyTotal, currency)} / day</div>
          </div>
        </div>

        {/* Actionable secondary grid */}
        <div className="today-secondary-grid">
          <div className={`today-mini-card card ${data.pendingCount > 0 ? 'active' : ''}`} onClick={() => navigate('/transactions')}>
            <span className="mini-icon">⏳</span>
            <div className="mini-content">
              <span className="mini-num">{data.pendingCount}</span>
              <span className="mini-label">Pending</span>
            </div>
          </div>

          <div className={`today-mini-card card ${data.debtsDueSoonCount > 0 ? 'urgent' : ''}`} onClick={() => navigate('/debts')}>
            <span className="mini-icon">🚨</span>
            <div className="mini-content">
              <span className="mini-num">{data.debtsDueSoonCount}</span>
              <span className="mini-label">Debts Due</span>
            </div>
          </div>
          
          <div className="today-mini-card card" onClick={() => navigate('/accounts')}>
            <span className="mini-icon">💳</span>
            <div className="mini-content">
              <span className="mini-num">{data.mostUsedWallet || 'None'}</span>
              <span className="mini-label">Top Wallet</span>
            </div>
          </div>

          <div className="today-mini-card card" onClick={() => navigate('/transactions')}>
            <span className="mini-icon">⚡</span>
            <div className="mini-content">
              <span className="mini-num">{data.recentCount}</span>
              <span className="mini-label">Today's Txns</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
