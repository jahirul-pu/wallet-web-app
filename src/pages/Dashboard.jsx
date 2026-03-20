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
          id="add-transaction-btn"
        >
          + Add
        </button>
      </div>

      <BalanceCard balance={balance} income={income} expense={expense} />

      {/* Overdue debts alert */}
      {overdueDebts.length > 0 && (
        <div className="dashboard-alert" onClick={() => navigate('/debts')}>
          ⚠️ You have {overdueDebts.length} overdue debt{overdueDebts.length > 1 ? 's' : ''}
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
            <div className="icon">📊</div>
            <p>No expenses this month yet</p>
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">Recent Transactions</h2>
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
            <div className="icon">💸</div>
            <p>No transactions yet. Tap "Add" to get started!</p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="dashboard-actions">
        <button className="quick-action card" onClick={() => navigate('/add?type=income')}>
          <span className="quick-action-icon income">↑</span>
          <span>Income</span>
        </button>
        <button className="quick-action card" onClick={() => navigate('/add?type=expense')}>
          <span className="quick-action-icon expense">↓</span>
          <span>Expense</span>
        </button>
        <button className="quick-action card" onClick={() => navigate('/add?type=transfer')}>
          <span className="quick-action-icon transfer">⇄</span>
          <span>Transfer</span>
        </button>
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
