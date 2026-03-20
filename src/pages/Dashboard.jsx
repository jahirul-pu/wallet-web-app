import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useDebtStore } from '../stores/useDebtStore';
import { getMonthKey } from '../utils/dateFormat';
import { formatAmount } from '../utils/currencies';
import BalanceCard from '../components/BalanceCard';
import TransactionItem from '../components/TransactionItem';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { getCategoryInfo } from '../utils/categories';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Dashboard() {
  const navigate = useNavigate();
  const transactions = useTransactionStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.currency);
  const debts = useDebtStore((s) => s.debts);

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

  const { balance, income, expense, recentTxns, chartData } = useMemo(() => {
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

    // Category breakdown for expenses
    const categoryTotals = {};
    monthTxns.filter((t) => t.type === 'expense').forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const labels = [];
    const data = [];
    const colors = [];
    Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([key, val]) => {
        const cat = getCategoryInfo(key);
        labels.push(cat.name);
        data.push(val);
        colors.push(cat.color);
      });

    const cd = {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 6,
      }],
    };

    return { balance: bal, income: inc, expense: exp, recentTxns: recent, chartData: cd };
  }, [transactions, currentMonth]);

  return (
    <div className="page" id="dashboard-page">
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

      <div className="dashboard-grid">
        {/* Left Column - Main Vault Activity */}
        <div className="dashboard-col-main">
          <BalanceCard balance={balance} income={income} expense={expense} />

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
        </div>

        {/* Right Column - Utility */}
        <div className="dashboard-col-side">
          <MyCardsWidget />
          <QuickSendWidget />

          {/* Expense chart */}
          <div className="dashboard-section">
            <h2 className="dashboard-section-title">This Month</h2>
            {chartData.datasets[0].data.length > 0 ? (
              <div className="dashboard-chart-container card">
                <Doughnut
                  data={chartData}
                  options={{
                    responsive: true,
                    cutout: '65%',
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 12,
                          usePointStyle: true,
                          pointStyleWidth: 8,
                          font: { size: 11, family: 'Inter' },
                          color: 'var(--color-text-secondary)',
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="empty-state card">
                <div className="icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                </div>
                <p>No expenses this month yet</p>
              </div>
            )}
          </div>
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

function MyCardsWidget() {
  return (
    <div className="dashboard-section ui-widget">
      <h2 className="dashboard-section-title">My Cards</h2>
      <div className="credit-card-viz card">
        <div className="card-viz-logo">LUMINA</div>
        <div className="card-viz-chip">
          <div className="chip-inner"></div>
        </div>
        <div className="card-viz-number">•••• •••• •••• 4289</div>
        <div className="card-viz-footer">
          <div>
            <div className="card-viz-label">Cardholder</div>
            <div className="card-viz-value">ALEX CHEN</div>
          </div>
          <div>
            <div className="card-viz-label">Expires</div>
            <div className="card-viz-value">12/28</div>
          </div>
        </div>
      </div>
      <div className="card-toggles card">
        <label className="card-toggle-row">
          <span>Freeze Physical Card</span>
          <input type="checkbox" className="toggle-checkbox" />
          <div className="toggle-switch"></div>
        </label>
        <label className="card-toggle-row">
          <span>Online Payments</span>
          <input type="checkbox" className="toggle-checkbox" defaultChecked />
          <div className="toggle-switch"></div>
        </label>
      </div>
    </div>
  );
}

function QuickSendWidget() {
  return (
    <div className="dashboard-section ui-widget">
      <h2 className="dashboard-section-title">Quick Send</h2>
      <div className="card quick-send-card">
        <div className="quick-send-avatars">
           <div className="qs-avatar add">+</div>
           <div className="qs-avatar" style={{background:'#6366f1'}}>S</div>
           <div className="qs-avatar" style={{background:'#ec4899'}}>M</div>
           <div className="qs-avatar" style={{background:'#f59e0b'}}>E</div>
        </div>
        <div className="quick-send-input-group">
           <span className="qs-currency">$</span>
           <input type="number" placeholder="0.00" className="qs-input" />
        </div>
        <button className="btn btn-primary" style={{width: '100%', marginTop:'var(--space-4)'}}>Authorize Transfer</button>
      </div>
    </div>
  );
}
