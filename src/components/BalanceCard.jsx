import { useSettingsStore } from '../stores/useSettingsStore';
import { formatAmount } from '../utils/currencies';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import './BalanceCard.css';

export default function BalanceCard({ balance, income, expense }) {
  const currency = useSettingsStore((s) => s.currency);

  const animatedBalance = useAnimatedCounter(balance, 900);
  const animatedIncome = useAnimatedCounter(income, 700);
  const animatedExpense = useAnimatedCounter(expense, 700);

  return (
    <div className="balance-card gradient-card" id="balance-card">
      <div className="balance-card-label">Total Balance</div>
      <div className="balance-card-amount">
        {formatAmount(Math.round(animatedBalance), currency)}
      </div>
      <div className="balance-card-row">
        <div className="balance-card-stat">
          <span className="balance-card-stat-icon income">↑</span>
          <div>
            <div className="balance-card-stat-label">Income</div>
            <div className="balance-card-stat-value">
              {formatAmount(Math.round(animatedIncome), currency)}
            </div>
          </div>
        </div>
        <div className="balance-card-stat">
          <span className="balance-card-stat-icon expense">↓</span>
          <div>
            <div className="balance-card-stat-label">Expense</div>
            <div className="balance-card-stat-value">
              {formatAmount(Math.round(animatedExpense), currency)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
