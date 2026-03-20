import { getCategoryInfo } from '../utils/categories';
import { formatAmount } from '../utils/currencies';
import { formatDate } from '../utils/dateFormat';
import { useSettingsStore } from '../stores/useSettingsStore';
import './TransactionItem.css';

export default function TransactionItem({ transaction, onDelete, onClick }) {
  const currency = useSettingsStore((s) => s.currency);
  const cat = getCategoryInfo(transaction.category);
  const isIncome = transaction.type === 'income';

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
      <div className="transaction-item-info">
        <div className="transaction-item-name">{cat.name}</div>
        <div className="transaction-item-meta">
          {transaction.note && (
            <span className="transaction-item-note">{transaction.note}</span>
          )}
          <span className="transaction-item-date">{formatDate(transaction.date)}</span>
        </div>
      </div>
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
          🗑️
        </button>
      )}
    </div>
  );
}
