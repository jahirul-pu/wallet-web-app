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
    <div className="balance-card vault-assets-card" id="balance-card">
      <div className="vault-assets-header">
        <div className="vault-assets-left">
          <div className="balance-card-label">Total Vault Assets</div>
          <div className="balance-card-amount">
            {formatAmount(Math.round(animatedBalance), currency)}
          </div>
          <div className="vault-assets-growth">
            <span className="growth-badge">+12.4%</span>
            <span className="growth-text">this month</span>
          </div>
          <div className="balance-card-row">
            <div className="balance-card-stat">
              <span className="balance-card-stat-icon income">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
              </span>
              <div>
                <div className="balance-card-stat-label">Income In</div>
                <div className="balance-card-stat-value">
                  {formatAmount(Math.round(animatedIncome), currency)}
                </div>
              </div>
            </div>
            <div className="balance-card-stat">
              <span className="balance-card-stat-icon expense">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
              </span>
              <div>
                <div className="balance-card-stat-label">Spend Out</div>
                <div className="balance-card-stat-value">
                  {formatAmount(Math.round(animatedExpense), currency)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="vault-assets-right">
          <svg className="vault-trend-line" viewBox="0 0 100 40" preserveAspectRatio="none">
            <path d="M0 35 L15 25 L30 30 L45 15 L60 20 L75 5 L100 10" fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M0 35 L15 25 L30 30 L45 15 L60 20 L75 5 L100 10 L100 40 L0 40 Z" fill="url(#trend-gradient)" stroke="none"/>
            <defs>
              <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}
