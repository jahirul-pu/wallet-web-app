import { getCategoryInfo } from '../utils/categories';
import { formatAmount } from '../utils/currencies';
import { formatDate } from '../utils/dateFormat';
import { useSettingsStore } from '../stores/useSettingsStore';
import './TransactionItem.css';

export default function TransactionItem({ transaction, onDelete, onClick }) {
  const currency = useSettingsStore((s) => s.currency);
  const cat = getCategoryInfo(transaction.category);
  const isIncome = transaction.type === 'income';

  const isPending = new Date(transaction.date) > new Date();

  return (
    <div
      className="transaction-item"
      onClick={() => onClick?.(transaction)}
      id={`txn-${transaction.id}`}
    >
      <div
        className="transaction-item-icon"
        style={{ background: `${cat.color}18`, color: cat.color }}
      >
        {cat.icon}
      </div>
      <div className="transaction-item-main">
        <div className="transaction-item-name">{transaction.note || cat.name}</div>
        <div className="transaction-item-category">{cat.name}</div>
        <div className="transaction-item-meta mobile-only">
          <span className="transaction-item-date">{formatDate(transaction.date)}</span>
        </div>
      </div>
      
      <div className="transaction-item-date desktop-only">
        {formatDate(transaction.date)}
      </div>
      
      <div className="transaction-item-status desktop-only">
        <span className={`status-badge ${isPending ? 'pending' : 'cleared'}`}>
          {isPending ? 'PENDING' : 'CLEARED'}
        </span>
      </div>

      <div className="transaction-item-right">
        <div className={`transaction-item-amount ${isIncome ? 'income' : 'expense'}`}>
          {isIncome ? '+' : '-'}{formatAmount(transaction.amount, currency)}
        </div>
        {onDelete && (
          <button
            className="transaction-item-delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(transaction.id);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        )}
      </div>
    </div>
  );
}
