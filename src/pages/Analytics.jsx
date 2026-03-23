import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useDebtStore } from '../stores/useDebtStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { getCategoryInfo } from '../utils/categories';
import { formatAmount } from '../utils/currencies';
import { usePrivacy } from '../hooks/usePrivacy';
import { exportCSV, exportPDF } from '../utils/exportImport';
import { getMonthKey, toInputDate, daysUntil, formatMonth } from '../utils/dateFormat';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import './Analytics.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function Analytics() {
  const navigate = useNavigate();
  const transactions = useTransactionStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.currency);
  const debts = useDebtStore((s) => s.debts);
  const budgets = useBudgetStore((s) => s.budgets);
  const getBudgetStatus = useBudgetStore((s) => s.getBudgetStatus);
  const { mask } = usePrivacy();

  const now = new Date();
  const thisMonthStr = toInputDate(now);
  const thisMonthKey = getMonthKey(thisMonthStr);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = getMonthKey(toInputDate(lastMonthDate));

  const { totalOwedToMe, totalIOwe, nextPayment } = useMemo(() => {
    const activeDebts = debts.filter((d) => d.status === 'active');
    const owedMe = activeDebts.filter((d) => d.type === 'owed_to_me').reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);
    const iOwe = activeDebts.filter((d) => d.type === 'i_owe').reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);
    
    // Find next payment (earliest due date >= today)
    const today = toInputDate(now);
    let nearest = null;
    let minDiff = Infinity;
    
    activeDebts.forEach(d => {
      if (d.dueDate && d.dueDate >= today) {
        const diff = daysUntil(d.dueDate);
        if (diff !== null && diff < minDiff) {
          minDiff = diff;
          nearest = d;
        }
      }
    });

    return { totalOwedToMe: owedMe, totalIOwe: iOwe, nextPayment: nearest };
  }, [debts]);

  const stats = useMemo(() => {
    const tmTxns = transactions.filter(t => t.date.startsWith(thisMonthKey));
    const lmTxns = transactions.filter(t => t.date.startsWith(lastMonthKey));

    const getStats = (txns) => {
      let inc = 0, exp = 0;
      const catTotals = {};
      const incCatTotals = {};
      const topTxs = [];
      txns.forEach(t => {
        if (t.type === 'income') {
          inc += t.amount;
          const c = t.category || 'other_income';
          incCatTotals[c] = (incCatTotals[c] || 0) + t.amount;
        } else if (t.type === 'expense') {
          exp += t.amount;
          const c = t.category || 'other_expense';
          catTotals[c] = (catTotals[c] || 0) + t.amount;
          topTxs.push(t);
        }
      });
      topTxs.sort((a,b) => b.amount - a.amount);
      return { inc, exp, net: inc - exp, catTotals, incCatTotals, topTxs: topTxs.slice(0,3) };
    }

    const tm = getStats(tmTxns);
    const lm = getStats(lmTxns);

    const pctChange = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

    const incTrend = pctChange(tm.inc, lm.inc);
    const expTrend = pctChange(tm.exp, lm.exp);
    const netTrend = pctChange(tm.net, lm.net);

    const savingsRate = tm.inc > 0 ? Math.round((Math.max(0, tm.net) / tm.inc) * 100) : 0;
    
    // Category sorting for lists
    const expCatList = Object.entries(tm.catTotals)
      .sort((a,b) => b[1] - a[1])
      .map(([k,v]) => ({ key: k, amount: v, pct: tm.exp > 0 ? Math.round((v/tm.exp)*100) : 0, info: getCategoryInfo(k) }));
      
    const incCatList = Object.entries(tm.incCatTotals)
      .sort((a,b) => b[1] - a[1])
      .map(([k,v]) => ({ key: k, amount: v, pct: tm.inc > 0 ? Math.round((v/tm.inc)*100) : 0, info: getCategoryInfo(k) }));

    // Bar chart data (This vs Last)
    const barData = {
      labels: [formatMonth(lastMonthDate).split(' ')[0], formatMonth(now).split(' ')[0]],
      datasets: [
        {
          label: 'Income',
          data: [lm.inc, tm.inc],
          backgroundColor: '#10b981',
          borderRadius: 4,
        },
        {
          label: 'Expense',
          data: [lm.exp, tm.exp],
          backgroundColor: '#f43f5e',
          borderRadius: 4,
        }
      ]
    };

    // Doughnut chart data
    const pieData = {
      labels: expCatList.slice(0,6).map(c => c.info.name),
      datasets: [{
        data: expCatList.slice(0,6).map(c => c.amount),
        backgroundColor: expCatList.slice(0,6).map(c => c.info.color),
        borderWidth: 0,
        hoverOffset: 8
      }]
    };

    // Budgets Overspent
    const overspent = [];
    budgets.filter(b => b.month === thisMonthKey).forEach(b => {
      const status = getBudgetStatus(b.id, transactions);
      if (status && status.percentage > 100) {
        overspent.push({ category: getCategoryInfo(b.category).name, diff: status.spent - status.totalLimit });
      }
    });

    return { tm, lm, incTrend, expTrend, netTrend, savingsRate, expCatList, incCatList, barData, pieData, overspent };
  }, [transactions, thisMonthKey, lastMonthKey, budgets, getBudgetStatus]);

  const monthName = formatMonth(now).split(' ')[0];
  const chartTextColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim() || '#94a3b8';

  const TrendPill = ({ val, inverse = false }) => {
    if (val === 0) return <span className="trend-pill neutral">—</span>;
    // inverse means higher is bad (e.g. expenses)
    const isGood = inverse ? val < 0 : val > 0;
    return (
      <span className={`trend-pill ${isGood ? 'positive' : 'negative'}`}>
        {val > 0 ? '↑' : '↓'} {Math.abs(Math.round(val))}%
      </span>
    );
  };

  const uncategorizedPct = stats.expCatList.find(c => c.key === 'other_expense')?.pct || 0;

  return (
    <div className="page" id="analytics-page">
      <div className="analytics-header">
        <h1 className="page-title" style={{ margin: 0 }}>Analytics</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => exportCSV(transactions, getCategoryInfo, formatAmount, currency)} title="Export CSV">
            <svg style={{marginRight: '6px'}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            CSV
          </button>
          <button className="btn btn-secondary" onClick={() => exportPDF(transactions, getCategoryInfo, formatAmount, currency)} title="Export PDF">
             <svg style={{marginRight: '6px'}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            PDF
          </button>
        </div>
      </div>

      {/* 1. Monthly Summary Hook (Anchor) */}
      <div className="analytics-top-summary card">
        <div className="summary-title">{monthName} Verdict</div>
        
        <div className="summary-verdict-grid">
           <div className="verdict-item">
             <span className="verdict-lbl">You Earned</span>
             <span className="verdict-val income">{mask(stats.tm.inc, currency)}</span>
             <TrendPill val={stats.incTrend} />
           </div>
           <div className="verdict-item">
             <span className="verdict-lbl">You Spent</span>
             <span className="verdict-val expense">{mask(stats.tm.exp, currency)}</span>
             <TrendPill val={stats.expTrend} inverse={true} />
           </div>
           <div className="verdict-item net">
             <span className="verdict-lbl">You Saved</span>
             <span className="verdict-val net-val" style={{ color: stats.tm.net >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}}>
               {stats.tm.net > 0 ? '+' : ''}{mask(stats.tm.net, currency)}
             </span>
             <TrendPill val={stats.netTrend} />
           </div>
        </div>

        <div className="summary-savings-viz">
           <div className="savings-viz-hdr">
              <span>Savings Rate</span>
              <span><strong>{stats.savingsRate}%</strong></span>
           </div>
           <div className="progress-bar">
             <div className="progress-bar-fill receivable stripe-animated" style={{ width: `${Math.min(100, stats.savingsRate)}%`}}></div>
           </div>
           <div className="savings-viz-compare">
             {stats.netTrend > 0 ? '✅ You saved more than last month' : (stats.netTrend < 0 ? '⚠ Savings dropped vs last month' : 'Stable savings rate')}
           </div>
        </div>
      </div>

      {/* 2 & 3. Bar Chart & Trend Insight */}
      <h2 className="analytics-section-title">Growth Trend</h2>
      <div className="card analytics-chart-wrap" onClick={() => navigate('/transactions')}>
        <div className="analytics-bar-diff">
          Net Difference this month: <strong>{stats.tm.net >= 0 ? '+' : ''}{mask(stats.tm.net, currency)}</strong>
        </div>
        <div className="analytics-chart">
          <Bar
            data={stats.barData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 12, weight: 'bold' } } },
                y: { display: false },
              },
              plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(15,23,42,0.9)' }
              },
            }}
          />
        </div>
        <div className="analytics-bar-legend">
           <div><span className="legend-dot income"></span> Income</div>
           <div><span className="legend-dot expense"></span> Expense</div>
        </div>
      </div>

      {/* Monthly Alerts Hook */}
      {(uncategorizedPct > 20 || stats.overspent.length > 0 || stats.expTrend > 20) && (
        <div className="analytics-alerts-wrapper">
          {stats.expTrend > 20 && (
             <div className="analytics-alert warning">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>Spending jumped <strong>{Math.round(stats.expTrend)}%</strong> compared to last month.</span>
             </div>
          )}
          {uncategorizedPct > 20 && (
            <div className="analytics-alert warning clickable" onClick={() => navigate('/transactions?type=expense')}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
               <span><strong>{uncategorizedPct}%</strong> of expenses are Uncategorized. [Review Now]</span>
            </div>
          )}
          {stats.overspent.map(o => (
             <div key={o.category} className="analytics-alert critical" onClick={() => navigate('/budgets')}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
               <span>You exceeded your <strong>{o.category}</strong> budget by {mask(o.diff, currency)}</span>
             </div>
          ))}
        </div>
      )}

      {/* 4. Expense by Category List + Pie */}
      <h2 className="analytics-section-title">Expense Depth</h2>
      <div className="card analytics-deep-dive">
        {stats.expCatList.length > 0 ? (
          <div className="analytics-split">
             <div className="analytics-split-pie">
                <Doughnut
                  data={stats.pieData}
                  options={{ responsive: true, cutout: '70%', plugins: { legend: { display: false } } }}
                />
                <div className="pie-center-label">
                   <div style={{fontSize: '0.7rem', opacity: 0.6, letterSpacing: '0.05em'}}>SPENT</div>
                   <div style={{fontWeight: 800, fontSize: '0.9rem'}}>{mask(stats.tm.exp, currency, true)}</div>
                </div>
             </div>
             <div className="analytics-split-list">
                {stats.expCatList.slice(0, 5).map(c => (
                   <div key={c.key} className="deep-list-item clickable" onClick={() => navigate(`/transactions?type=expense`)}>
                      <div className="dli-l">
                         <span className="dli-dot" style={{ background: c.info.color }}></span>
                         <span>{c.info.name}</span>
                      </div>
                      <div className="dli-r">
                         <span className="dli-amt">{mask(c.amount, currency)}</span>
                         <span className="dli-pct">({c.pct}%)</span>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        ) : (
          <div className="empty-state">No expenses to deeply analyze.</div>
        )}
      </div>

      {/* 5. Top Spending Highlights */}
      {stats.tm.topTxs.length > 0 && (
        <>
          <h2 className="analytics-section-title">Biggest Expense Leaks</h2>
          <div className="card top-leaks-card">
            {stats.tm.topTxs.map((t, i) => (
              <div key={t.id} className="leak-item clickable" onClick={() => navigate('/transactions')}>
                 <div className="leak-rank">#{i+1}</div>
                 <div className="leak-info">
                   <div className="leak-cat">{getCategoryInfo(t.category).name}</div>
                   <div className="leak-note">{t.note || 'No note'} • {formatMonth(t.date).split(' ')[0]} {t.date.split('-')[2]}</div>
                 </div>
                 <div className="leak-amt expense">{mask(t.amount, currency)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 7. Income Sources Breakdown */}
      {stats.incCatList.length > 0 && (
         <>
           <h2 className="analytics-section-title">Income Sources</h2>
           <div className="card income-sources-card">
              {stats.incCatList.map(c => (
                <div key={c.key} className="income-source-row clickable" onClick={() => navigate('/transactions?type=income')}>
                   <div className="is-l">
                     <span className="is-icon" style={{color: c.info.color}}>{c.info.icon}</span>
                     <span>{c.info.name}</span>
                   </div>
                   <div className="is-r income">+{mask(c.amount, currency)} <span className="is-pct">({c.pct}%)</span></div>
                </div>
              ))}
           </div>
         </>
      )}

      {/* 8. Actionable Debt Summary */}
      {(totalOwedToMe > 0 || totalIOwe > 0) && (
        <>
          <h2 className="analytics-section-title">Debt Pulse</h2>
          <div className="card debt-pulse-card clickable" onClick={() => navigate('/debts')}>
            <div className="dp-grid">
               <div className="dp-item">
                 <div className="dp-lbl">You are owed</div>
                 <div className="dp-val income">{mask(totalOwedToMe, currency)}</div>
               </div>
               <div className="dp-item right">
                 <div className="dp-lbl">You owe</div>
                 <div className="dp-val expense">{mask(totalIOwe, currency)}</div>
               </div>
            </div>
            <div className={`dp-net ${totalOwedToMe - totalIOwe >= 0 ? 'pos' : 'neg'}`}>
               Net Balance: <strong>{totalOwedToMe - totalIOwe >= 0 ? '+' : ''}{mask(totalOwedToMe - totalIOwe, currency)}</strong>
            </div>

            {stats.nextPayment && (
              <div className="dp-next-payment">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                 Next expected payment: {mask(stats.nextPayment.totalAmount - stats.nextPayment.paidAmount, currency)} ({daysUntil(stats.nextPayment.dueDate) === 0 ? 'Today' : `in ${daysUntil(stats.nextPayment.dueDate)} days`})
              </div>
            )}
          </div>
        </>
      )}

      {/* 10. Month Closure Feeling */}
      <div className="month-closure">
         <div><strong>{monthName} Reflection</strong></div>
         <div className="mc-bullet">
           ✨ Best point: {stats.savingsRate >= 20 ? 'Strong savings rate!' : (stats.incTrend > 0 ? 'Income growth!' : 'Expenses kept tracking')}
         </div>
         <div className="mc-bullet opacity-70">
           {uncategorizedPct > 20 ? '⚠ Focus next month: Categorize your expenses better.' : (stats.savingsRate < 10 ? '⚠ Focus next month: Try to increase savings.' : 'Keep up the good habits.')}
         </div>
      </div>

    </div>
  );
}
