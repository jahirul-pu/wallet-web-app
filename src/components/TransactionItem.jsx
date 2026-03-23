import { useNavigate } from 'react-router-dom';
import { getCategoryInfo } from '../utils/categories';
import { formatAmount } from '../utils/currencies';
import { usePrivacy } from '../hooks/usePrivacy';
import { formatDate } from '../utils/dateFormat';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useDebtStore } from '../stores/useDebtStore';
import './TransactionItem.css';

export default function TransactionItem({ transaction, onDelete, onClick }) {
  const navigate = useNavigate();
  const currency = useSettingsStore((s) => s.currency);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const adjustBalance = useAccountStore((s) => s.adjustBalance);
  const transfer = useAccountStore((s) => s.transfer);
  const debts = useDebtStore((s) => s.debts);
  const deleteDebt = useDebtStore((s) => s.deleteDebt);
  const deletePayment = useDebtStore((s) => s.deletePayment);
  const { mask } = usePrivacy();
  const cat = getCategoryInfo(transaction.category);
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';

  // Compare in local time to avoid UTC offset issues
  const txnParts = transaction.date.split('-');
  const txnDate = new Date(txnParts[0], txnParts[1] - 1, txnParts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPending = txnDate > today;

  const handleQuickDelete = (e) => {
    e.stopPropagation();
    if (onDelete) return onDelete(transaction.id);

    // Global fallback for self-contained use (like Dashboard)
    if (transaction.type === 'transfer') {
      transfer(transaction.toAccountId, transaction.accountId, transaction.amount);
    } else {
      const reverseType = transaction.type === 'income' ? 'expense' : 'income';
      adjustBalance(transaction.accountId, transaction.amount, reverseType);
    }

    // 2-Way Debt Sync
    const linkedDebt = debts.find(d => d.linkedTransactionId === transaction.id);
    if (linkedDebt) {
       deleteDebt(linkedDebt.id);
    } else {
       debts.forEach(d => {
          const linkedPayment = d.payments?.find(p => p.linkedTransactionId === transaction.id);
          if (linkedPayment) deletePayment(d.id, linkedPayment.id);
       });
    }

    deleteTransaction(transaction.id);
  };

  const handleDuplicate = (e) => {
    e.stopPropagation();
    const todayStr = new Date().toISOString().split('T')[0];
    const { id, ...newTxnData } = transaction; 
    newTxnData.date = todayStr;
    
    // Process new balance physics exactly like fresh creation
    if (transaction.type === 'transfer') {
      transfer(transaction.accountId, transaction.toAccountId, transaction.amount);
    } else {
      adjustBalance(transaction.accountId, transaction.amount, transaction.type);
    }
    addTransaction(newTxnData);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    const todayStr = new Date().toISOString().split('T')[0];
    updateTransaction({ ...transaction, date: todayStr });
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    navigate(`/add?edit=${transaction.id}`);
  };

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
          {isIncome ? '+' : isTransfer ? '' : '-'}{mask(transaction.amount, currency)}
        </div>
        
        <div className="txn-right-meta">
          <span className={`txn-type-label ${transaction.type}`}>
            {isIncome ? 'Income' : isTransfer ? 'Transfer' : 'Expense'}
          </span>
          {transaction._runningBalance !== undefined && (
            <span className="txn-running-balance">
              • {mask(transaction._runningBalance, currency)}
            </span>
          )}
        </div>
      </div>

      {/* Quick Actions Hover Overlay */}
      <div className="txn-actions">
        {isPending && (
          <button className="txn-action-btn clear-btn" onClick={handleClear} title="Mark Cleared">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>
        )}
        <button className="txn-action-btn edit-btn" onClick={handleEdit} title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        </button>
        <button className="txn-action-btn duplicate-btn" onClick={handleDuplicate} title="Duplicate">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button className="txn-action-btn delete-btn" onClick={handleQuickDelete} title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>
  );
}
