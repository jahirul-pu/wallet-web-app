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
          <span className="balance-card-stat-icon income">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
          </span>
          <div>
            <div className="balance-card-stat-label">Income</div>
            <div className="balance-card-stat-value">
              {formatAmount(Math.round(animatedIncome), currency)}
            </div>
          </div>
        </div>
        <div className="balance-card-stat">
          <span className="balance-card-stat-icon expense">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
          </span>
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
