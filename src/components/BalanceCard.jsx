import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { usePrivacy } from '../hooks/usePrivacy';
import { toInputDate } from '../utils/dateFormat';
import './BalanceCard.css';

export default function BalanceCard() {
  const navigate = useNavigate();
  const currency = useSettingsStore((s) => s.currency);
  const transactions = useTransactionStore((s) => s.transactions);
  const [timeFilter, setTimeFilter] = useState('month'); // week, month, year
  const { mask } = usePrivacy();
  const accounts = useAccountStore((s) => s.accounts);

  const { balance, income, expense, sparkData, pctChangeStr, pctChangeColor } = useMemo(() => {
    const now = new Date();
    const todayStr = toInputDate(now);
    
    // total absolute balance
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

    let startDate = new Date();
    let sparkPoints = [];
    let prevStartDate = new Date();
    let prevEndDate = new Date();

    if (timeFilter === 'week') {
      startDate.setDate(now.getDate() - 7);
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        sparkPoints.push(toInputDate(d));
      }
    } else if (timeFilter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1); // last day of prev month
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= days; i += 3) {
        const d = new Date(now.getFullYear(), now.getMonth(), i);
        if (d <= now) sparkPoints.push(toInputDate(d));
      }
      if (sparkPoints[sparkPoints.length - 1] !== todayStr) {
         sparkPoints.push(todayStr); // always end on today
      }
    } else if (timeFilter === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(now.getFullYear() - 1, 0, 1);

      for (let i = 0; i <= now.getMonth(); i++) {
        const d = new Date(now.getFullYear(), i + 1, 0); // last day of month
        sparkPoints.push(toInputDate(d));
      }
    }

    const startStr = toInputDate(startDate);
    const prevStartStr = toInputDate(prevStartDate);
    const prevEndStr = toInputDate(prevEndDate);

    // Current period transactions
    const currentTxns = transactions.filter(t => t.date >= startStr && t.date <= todayStr);
    const prevTxns = transactions.filter(t => t.date >= prevStartStr && t.date <= prevEndStr);

    const inc = currentTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = currentTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    // Growth vs Previous period
    const currentGrowth = inc - exp;
    const prevInc = prevTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const prevExp = prevTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const prevGrowth = prevInc - prevExp;

    let growthStr = '0%';
    let growthColor = 'neutral';
    if (prevGrowth !== 0) {
       const pct = Math.round(((currentGrowth - prevGrowth) / Math.abs(prevGrowth)) * 100);
       if (pct > 0) {
         growthStr = `+${pct}%`;
         growthColor = 'positive';
       } else if (pct < 0) {
         growthStr = `${pct}%`;
         growthColor = 'negative';
       }
    } else if (currentGrowth > 0) {
       growthStr = `+100%`;
       growthColor = 'positive';
    }

    // Chart Data (Running Balance)
    const runningBalChartData = sparkPoints.map(dateStr => {
      // Find balance closing at this date
      const futureTxns = transactions.filter(t => t.date > dateStr);
      const futureNetFlow = futureTxns.reduce((s, t) => t.type === 'income' ? s + t.amount : t.type === 'expense' ? s - t.amount : s, 0);
      return totalBalance - futureNetFlow;
    });

    if (runningBalChartData.length < 2) {
       runningBalChartData.push(totalBalance, totalBalance);
    }

    return { 
      balance: totalBalance, 
      income: inc, 
      expense: exp, 
      sparkData: runningBalChartData,
      pctChangeStr: growthStr,
      pctChangeColor: growthColor
    };
  }, [transactions, timeFilter, accounts]);

  const animatedBalance = useAnimatedCounter(balance, 900);
  const animatedIncome = useAnimatedCounter(income, 700);
  const animatedExpense = useAnimatedCounter(expense, 700);

  const minChart = Math.min(...sparkData);
  const maxChart = Math.max(...sparkData);
  const chartRange = maxChart - minChart || 1;
  const chartPoints = sparkData.map((v, i) => {
    const x = (i / (sparkData.length - 1)) * 100;
    const y = 40 - ((v - minChart) / chartRange) * 35; // 40 max height, leave 5 top padding
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="balance-card vault-command-card card" id="balance-card">
      <div className="command-card-header">
        <div className="command-filters">
          <button className={`command-filter ${timeFilter === 'week' ? 'active' : ''}`} onClick={() => setTimeFilter('week')}>1W</button>
          <button className={`command-filter ${timeFilter === 'month' ? 'active' : ''}`} onClick={() => setTimeFilter('month')}>1M</button>
          <button className={`command-filter ${timeFilter === 'year' ? 'active' : ''}`} onClick={() => setTimeFilter('year')}>1Y</button>
        </div>
        <button className="command-details-btn" onClick={() => navigate('/accounts')}>
          View Details &rarr;
        </button>
      </div>

      <div className="command-card-body">
        <div className="command-col-left">
          <div className="command-label">Total Vault Assets</div>
          <div className="command-balance">{mask(Math.round(animatedBalance), currency)}</div>
          <div className="command-growth">
            <span className={`growth-badge ${pctChangeColor}`}>{pctChangeStr}</span>
            <span className="growth-text">vs last {timeFilter}</span>
          </div>

          <div className="command-stats">
            <div className="cmd-stat-box">
              <span className="cmd-stat-icon income">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
              </span>
              <div className="cmd-stat-info">
                <div className="cmd-stat-lbl">In ({timeFilter === 'week' ? '1W' : timeFilter === 'month' ? '1M' : '1Y'})</div>
                <div className="cmd-stat-val">{mask(Math.round(animatedIncome), currency)}</div>
              </div>
            </div>
            <div className="cmd-stat-box">
              <span className="cmd-stat-icon expense">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
              </span>
              <div className="cmd-stat-info">
                <div className="cmd-stat-lbl">Out ({timeFilter === 'week' ? '1W' : timeFilter === 'month' ? '1M' : '1Y'})</div>
                <div className="cmd-stat-val">{mask(Math.round(animatedExpense), currency)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="command-col-right">
          <svg className="command-chart" viewBox="0 0 100 40" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cmd-trend-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6FFBBE" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#6FFBBE" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <polygon points={`0,40 ${chartPoints} 100,40`} fill="url(#cmd-trend-gradient)" />
            <polyline points={chartPoints} fill="none" stroke="#6FFBBE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      </div>

      <div className="command-micro-actions">
        <button className="cmd-action-btn solid-income" onClick={() => navigate('/add?type=income')}>
          <span className="cmd-action-icon">+</span> Add Income
        </button>
        <button className="cmd-action-btn solid-expense" onClick={() => navigate('/add?type=expense')}>
          <span className="cmd-action-icon">-</span> Add Expense
        </button>
        <button className="cmd-action-btn solid-transfer" onClick={() => navigate('/add?type=transfer')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle', marginRight:'4px'}}><polyline points="16 3 21 8 16 13"></polyline><line x1="21" y1="8" x2="9" y2="8"></line><polyline points="8 21 3 16 8 11"></polyline><line x1="3" y1="16" x2="15" y2="16"></line></svg>
          Transfer
        </button>
      </div>
    </div>
  );
}
