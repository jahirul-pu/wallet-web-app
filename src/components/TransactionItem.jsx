import { getCategoryInfo } from '../utils/categories';
import { formatAmount } from '../utils/currencies';
import { formatDate } from '../utils/dateFormat';
import { useSettingsStore } from '../stores/useSettingsStore';
import './TransactionItem.css';

export default function TransactionItem({ transaction, onDelete, onClick }) {
  const currency = useSettingsStore((s) => s.currency);
  const cat = getCategoryInfo(transaction.category);
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';

  // Compare in local time to avoid UTC offset issues
  const txnParts = transaction.date.split('-');
  const txnDate = new Date(txnParts[0], txnParts[1] - 1, txnParts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPending = txnDate > today;

  // Helper to neatly format "YYYY-MM" into "Mar 2026"
  const formatSalaryMonth = (sm) => {
    if (!sm || !sm.includes('-')) return '';
    const [y, m] = sm.split('-');
    if (!y || !m || isNaN(y) || isNaN(m)) return '';
    const date = new Date(Number(y), Number(m) - 1);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  // Build primary title: Category Name
  const title = cat.name;
  
  // Build subtitle line: party/note • salary month • relative time
  const formattedMonth = formatSalaryMonth(transaction.salaryMonth);
  const partyOrNote = transaction.party || transaction.note || '';
  
  const subtitle = [
    partyOrNote,
    formattedMonth || null,
    formatDate(transaction.date),
  ].filter(Boolean).join(' • ');

  return (
    <div
      className="transaction-item"
      onClick={() => onClick?.(transaction)}
      id={`txn-${transaction.id}`}
    >
      {/* Icon */}
      <div
        className="txn-icon"
        style={{ '--txn-cat-color': cat.color }}
      >
        {cat.icon}
      </div>

      {/* Center content */}
      <div className="txn-body">
        <div className="txn-title-row">
          <span className="txn-title">{title}</span>
          {transaction.status === 'failed' ? (
            <span className="txn-badge failed">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              FAILED
            </span>
          ) : isPending ? (
            <span className="txn-badge pending">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              PENDING
            </span>
          ) : (
            <span className="txn-badge cleared">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
          )}
        </div>
        <div className="txn-subtitle">{subtitle}</div>
      </div>

      {/* Right: Amount */}
      <div className="txn-right">
        <div className={`txn-amount ${isIncome ? 'income' : isTransfer ? 'transfer' : 'expense'}`}>
          {isIncome ? '+' : isTransfer ? '' : '-'}{formatAmount(transaction.amount, currency)}
        </div>
        
        <div className="txn-right-meta">
          <span className={`txn-type-label ${transaction.type}`}>
            {isIncome ? 'Income' : isTransfer ? 'Transfer' : 'Expense'}
          </span>
          {transaction._runningBalance !== undefined && (
            <span className="txn-running-balance">
              • {formatAmount(transaction._runningBalance, currency)}
            </span>
          )}
        </div>
      </div>

      {onDelete && (
        <button
          className="txn-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(transaction.id);
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      )}
    </div>
  );
}
