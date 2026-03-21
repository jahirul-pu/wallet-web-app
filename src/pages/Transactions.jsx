import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useAccountStore } from '../stores/useAccountStore';
import TransactionItem from '../components/TransactionItem';
import './Transactions.css';

export default function Transactions() {
  const transactions = useTransactionStore((s) => s.transactions);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const adjustBalance = useAccountStore((s) => s.adjustBalance);
  const transfer = useAccountStore((s) => s.transfer);
  const location = useLocation();

  const handleDelete = (id) => {
    const txn = transactions.find(t => t.id === id);
    if (!txn) return;

    if (txn.type === 'transfer') {
      transfer(txn.toAccountId, txn.accountId, txn.amount);
    } else {
      const reverseType = txn.type === 'income' ? 'expense' : 'income';
      adjustBalance(txn.accountId, txn.amount, reverseType);
    }

    deleteTransaction(id);
  };

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');
    if (typeParam && ['income', 'expense', 'transfer'].includes(typeParam)) {
      setFilterType(typeParam);
    }
  }, [location.search]);

  const filtered = useMemo(() => {
    // 1. Calculate running balances chronologically first
    const chronological = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBal = 0;
    const annotated = chronological.map(t => {
      if (t.type === 'income') runningBal += t.amount;
      else if (t.type === 'expense') runningBal -= t.amount;
      return { ...t, _runningBalance: runningBal };
    });

    // 2. Sort newest to oldest for display
    let list = annotated.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filterType !== 'all') {
      list = list.filter((t) => t.type === filterType);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.note || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q) ||
          String(t.amount).includes(q)
      );
    }

    return list;
  }, [transactions, search, filterType]);

  // Group by date
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((t) => {
      const key = t.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [filtered]);

  return (
    <div className="page" id="transactions-page">
      <h1 className="page-title">Transactions</h1>

      {/* Search */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          id="search-input"
        />
      </div>

      {/* Filter chips */}
      <div className="filter-chips">
        {['all', 'income', 'expense', 'transfer'].map((t) => (
          <button
            key={t}
            className={`filter-chip ${filterType === t ? 'active' : ''}`}
            onClick={() => setFilterType(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {grouped.length > 0 ? (
        grouped.map(([date, txns]) => (
          <div key={date} className="transaction-group">
            <div className="transaction-group-date">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            <div className="card" style={{ padding: 'var(--space-2)' }}>
              {txns.map((txn) => (
                <TransactionItem
                  key={txn.id}
                  transaction={txn}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>{search ? 'No transactions found' : 'No transactions yet'}</p>
        </div>
      )}
    </div>
  );
}
