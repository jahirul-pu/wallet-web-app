import { useMemo } from 'react';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useDebtStore } from '../stores/useDebtStore';
import { getCategoryInfo } from '../utils/categories';
import { formatAmount } from '../utils/currencies';
import { exportCSV } from '../utils/exportImport';
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
  const transactions = useTransactionStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.currency);
  const debts = useDebtStore((s) => s.debts);

  const { totalOwedToMe, totalIOwe } = useMemo(() => ({
    totalOwedToMe: debts.filter((d) => d.type === 'owed_to_me' && d.status === 'active').reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0),
    totalIOwe: debts.filter((d) => d.type === 'i_owe' && d.status === 'active').reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0),
  }), [debts]);

  const { monthlyData, categoryData, monthLabels } = useMemo(() => {
    // Last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const incomeByMonth = {};
    const expenseByMonth = {};
    months.forEach((m) => { incomeByMonth[m] = 0; expenseByMonth[m] = 0; });

    const catTotals = {};

    transactions.forEach((t) => {
      const d = new Date(t.date);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (t.type === 'income' && incomeByMonth[mk] !== undefined) incomeByMonth[mk] += t.amount;
      if (t.type === 'expense' && expenseByMonth[mk] !== undefined) expenseByMonth[mk] += t.amount;
      if (t.type === 'expense') {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
      }
    });

    const ml = months.map((m) => {
      const [y, mo] = m.split('-');
      return new Date(y, mo - 1).toLocaleDateString('en-US', { month: 'short' });
    });

    const md = {
      labels: ml,
      datasets: [
        {
          label: 'Income',
          data: months.map((m) => incomeByMonth[m]),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Expense',
          data: months.map((m) => expenseByMonth[m]),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };

    const catLabels = [];
    const catData = [];
    const catColors = [];
    Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .forEach(([key, val]) => {
        const cat = getCategoryInfo(key);
        catLabels.push(cat.name);
        catData.push(val);
        catColors.push(cat.color);
      });

    const cd = {
      labels: catLabels,
      datasets: [{
        data: catData,
        backgroundColor: catColors,
        borderWidth: 0,
        hoverOffset: 6,
      }],
    };

    return { monthlyData: md, categoryData: cd, monthLabels: ml };
  }, [transactions]);

  const handleExport = () => {
    exportCSV(transactions, getCategoryInfo, formatAmount, currency);
  };

  const chartTextColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim() || '#94a3b8';

  return (
    <div className="page" id="analytics-page">
      <div className="analytics-header">
        <h1 className="page-title" style={{ margin: 0 }}>Analytics</h1>
        <button className="btn btn-secondary" onClick={handleExport} id="export-csv-btn">
          📥 Export CSV
        </button>
      </div>

      {/* Monthly chart */}
      <div className="analytics-section">
        <h2 className="analytics-section-title">Monthly Overview</h2>
        <div className="card analytics-chart">
          <Bar
            data={monthlyData}
            options={{
              responsive: true,
              scales: {
                x: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 11 } } },
                y: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { color: chartTextColor, font: { size: 11 } } },
              },
              plugins: {
                legend: {
                  labels: { color: chartTextColor, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Category chart */}
      <div className="analytics-section">
        <h2 className="analytics-section-title">Expense by Category</h2>
        {categoryData.datasets[0].data.length > 0 ? (
          <div className="card analytics-chart" style={{ maxWidth: 300, margin: '0 auto' }}>
            <Doughnut
              data={categoryData}
              options={{
                responsive: true,
                cutout: '60%',
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: chartTextColor, usePointStyle: true, pointStyleWidth: 8, padding: 10, font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
        ) : (
          <div className="empty-state card">
            <div className="icon">📊</div>
            <p>No expense data yet</p>
          </div>
        )}
      </div>

      {/* Debt summary */}
      {(totalOwedToMe > 0 || totalIOwe > 0) && (
        <div className="analytics-section">
          <h2 className="analytics-section-title">Debt Summary</h2>
          <div className="debt-analytics-cards">
            <div className="card debt-analytics-card">
              <div className="debt-analytics-label">Total Receivable</div>
              <div className="debt-analytics-value income">{formatAmount(totalOwedToMe, currency)}</div>
            </div>
            <div className="card debt-analytics-card">
              <div className="debt-analytics-label">Total Payable</div>
              <div className="debt-analytics-value expense">{formatAmount(totalIOwe, currency)}</div>
            </div>
            <div className="card debt-analytics-card" style={{ gridColumn: '1 / -1' }}>
              <div className="debt-analytics-label">Net Position</div>
              <div className={`debt-analytics-value ${totalOwedToMe - totalIOwe >= 0 ? 'income' : 'expense'}`}>
                {formatAmount(totalOwedToMe - totalIOwe, currency)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
