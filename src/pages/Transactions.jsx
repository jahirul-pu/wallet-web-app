import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useDebtStore } from '../stores/useDebtStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getIncomeCategories, getExpenseCategories } from '../utils/categories';
import { usePrivacy } from '../hooks/usePrivacy';
import TransactionItem from '../components/TransactionItem';
import './Transactions.css';

export default function Transactions() {
  const transactions = useTransactionStore((s) => s.transactions);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const adjustBalance = useAccountStore((s) => s.adjustBalance);
  const transfer = useAccountStore((s) => s.transfer);
  const currency = useSettingsStore((s) => s.currency);
  const location = useLocation();
  const navigate = useNavigate();
  const { mask } = usePrivacy();

  const debts = useDebtStore((s) => s.debts);
  const deleteDebt = useDebtStore((s) => s.deleteDebt);
  const deletePayment = useDebtStore((s) => s.deletePayment);

  const handleDelete = (id) => {
    const txn = transactions.find(t => t.id === id);
    if (!txn) return;

    if (txn.type === 'transfer') {
      transfer(txn.toAccountId, txn.accountId, txn.amount);
    } else {
      const reverseType = txn.type === 'income' ? 'expense' : 'income';
      adjustBalance(txn.accountId, txn.amount, reverseType);
    }

    const linkedDebt = debts.find(d => d.linkedTransactionId === id);
    if (linkedDebt) {
       deleteDebt(linkedDebt.id);
    } else {
       debts.forEach(d => {
          const linkedPayment = d.payments?.find(p => p.linkedTransactionId === id);
          if (linkedPayment) deletePayment(d.id, linkedPayment.id);
       });
    }

    deleteTransaction(id);
  };

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('this_month');
  const [catFilter, setCatFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');
    if (typeParam && ['income', 'expense', 'transfer'].includes(typeParam)) {
      setFilterType(typeParam);
    }
  }, [location.search]);

  // Reset category filter if parent type changes
  useEffect(() => {
    setCatFilter('all');
  }, [filterType]);

  const availableCategories = useMemo(() => {
    if (filterType === 'income') return getIncomeCategories();
    if (filterType === 'expense') return getExpenseCategories();
    return [...getIncomeCategories(), ...getExpenseCategories()];
  }, [filterType]);

  const filtered = useMemo(() => {
    // 1. Calculate running balances chronologically first
    const chronological = [...transactions].sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff !== 0) return dateDiff;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0); // Strict same-day order (Oldest first)
    });
    
    let runningBal = 0;
    const annotated = chronological.map(t => {
      if (t.type === 'income') runningBal += t.amount;
      else if (t.type === 'expense') runningBal -= t.amount;
      return { ...t, _runningBalance: runningBal };
    });

    // 2. Sort newest to oldest for display
    let list = annotated.sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); // Strict same-day order (Newest first)
    });

    // Type Filter
    if (filterType !== 'all') {
      list = list.filter((t) => t.type === filterType);
    }

    // Category Filter
    if (catFilter !== 'all') {
      list = list.filter((t) => t.category === catFilter);
    }

    // Date Timeframe bounds
    if (dateRange !== 'all_time') {
      const now = new Date();
      list = list.filter(t => {
        // Parse securely preventing UTC skip logic
        const parts = t.date.split('-');
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        
        if (dateRange === 'this_month') {
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }
        if (dateRange === 'last_month') {
          const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
        }
        if (dateRange === 'this_year') {
          return d.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // Numeric Bounds
    if (minAmount !== '') {
      list = list.filter(t => t.amount >= Number(minAmount));
    }
    if (maxAmount !== '') {
      list = list.filter(t => t.amount <= Number(maxAmount));
    }

    // Explicit Context Text Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.note || '').toLowerCase().includes(q) ||
          (t.party || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q) ||
          String(t.amount).includes(q)
      );
    }

    return list;
  }, [transactions, search, filterType, dateRange, catFilter, minAmount, maxAmount]);

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

  const insights = useMemo(() => {
    if (filtered.length === 0) return null;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const getLocalStr = (d) => {
       const yr = d.getFullYear();
       const mo = String(d.getMonth() + 1).padStart(2,'0');
       const da = String(d.getDate()).padStart(2,'0');
       return `${yr}-${mo}-${da}`;
    };
    
    const todayStr = getLocalStr(today);
    const yesterdayStr = getLocalStr(yesterday);

    const todayTxns = filtered.filter(t => t.date === todayStr);
    const yesterdayTxns = filtered.filter(t => t.date === yesterdayStr);

    let text = '';
    let subText = '';
    let icon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;

    // INCOME BIAS
    const todayIncome = todayTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const yesIncome = yesterdayTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    
    // EXPENSE BIAS
    const todayExp = todayTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const yesExp = yesterdayTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    if (filterType === 'income' || (filterType === 'all' && todayIncome > 0 && todayIncome >= todayExp)) {
      const incCount = todayTxns.filter(t => t.type === 'income').length;
      if (incCount > 0) {
        text = `You received ${incCount} payment${incCount > 1 ? 's' : ''} today (+${mask(todayIncome, currency)})`;
        icon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
        if (yesIncome > 0) {
          const pct = Math.round(((todayIncome - yesIncome) / yesIncome) * 100);
          subText = pct > 0 ? `Your income increased ${pct}% vs yesterday` : `Your income dropped ${Math.abs(pct)}% vs yesterday`;
        } else if (yesIncome === 0 && todayIncome > 0) {
          subText = `Nice! You had no income yesterday.`;
        }
      }
    } 
    
    if (!text && (filterType === 'expense' || (filterType === 'all' && todayExp > 0))) {
      const expCount = todayTxns.filter(t => t.type === 'expense').length;
      if (expCount > 0) {
        text = `You spent ${mask(todayExp, currency)} today across ${expCount} transaction${expCount > 1 ? 's' : ''}`;
        icon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 8 12 12 14 14"></polyline></svg>;
        if (yesExp > 0) {
          const pct = Math.round(((todayExp - yesExp) / yesExp) * 100);
          subText = pct >= 0 ? `Spending is ${pct}% higher than yesterday` : `Spending dropped ${Math.abs(pct)}% vs yesterday`;
        }
      }
    }

    if (!text) {
      const totalAmt = filtered.reduce((s,t) => s + t.amount, 0);
      text = `Tracking ${filtered.length} total transactions in this view`;
      if (filterType !== 'all') {
         subText = `Total aggregate volume: ${mask(totalAmt, currency)}`;
      }
    }

    return { text, subText, icon };
  }, [filtered, filterType, currency]);

  return (
    <div className="page" id="transactions-page">
      <h1 className="page-title">Transactions</h1>

      {insights && insights.text && (
        <div className="intelligence-bar">
          <div className="insight-icon">{insights.icon}</div>
          <div className="insight-content">
            <div className="insight-text">{insights.text}</div>
            {insights.subText && <div className="insight-subtext">{insights.subText}</div>}
          </div>
        </div>
      )}

      <div className="search-bar">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          id="search-input"
        />
        <button 
          className={`filter-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
          title="Advanced Filters"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line>
            <line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line>
            <line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line>
          </svg>
        </button>
      </div>

      <div className="filter-chips">
        {['all', 'income', 'expense', 'transfer'].map((t) => (
          <button
            key={t}
            className={`filter-chip ${filterType === t ? 'active ' + t : ''}`}
            onClick={() => setFilterType(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="advanced-filters-panel">
          <div className="filter-group">
            <label>Timeframe</label>
            <div className="select-wrapper">
              <select value={dateRange} onChange={e => setDateRange(e.target.value)}>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_year">This Year</option>
                <option value="all_time">All Time</option>
              </select>
            </div>
          </div>
          
          <div className="filter-group">
            <label>Category</label>
            <div className="select-wrapper">
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {availableCategories.map(([key, cat]) => (
                  <option key={key} value={key}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-group amount-range">
            <label>Amount Range</label>
            <div className="amount-inputs">
              <input type="number" placeholder="Min" value={minAmount} onChange={e => setMinAmount(e.target.value)} />
              <span className="amount-dash">-</span>
              <input type="number" placeholder="Max" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {/* Transaction list */}
      {grouped.length > 0 ? (
        grouped.map(([date, txns]) => {
          // Calculate net total for this specific day
          const dailyTotal = txns.reduce((sum, t) => {
            if (t.type === 'income') return sum + t.amount;
            if (t.type === 'expense') return sum - t.amount;
            return sum;
          }, 0);

          return (
            <div key={date} className="transaction-group">
              <div className="transaction-group-date">
                <span>{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span className={`daily-net ${dailyTotal > 0 ? 'positive' : dailyTotal < 0 ? 'negative' : ''}`}>
                  {dailyTotal > 0 ? '+' : dailyTotal < 0 ? '-' : ''}{mask(Math.abs(dailyTotal), currency)}
                </span>
              </div>
            <div className="transaction-list-column" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {txns.map((txn) => (
                <TransactionItem
                  key={txn.id}
                  transaction={txn}
                  onDelete={handleDelete}
                />
              ))}
            </div>
            </div>
          );
        })
      ) : transactions.length === 0 ? (
        <div className="empty-state card advanced-empty-state">
          <div className="empty-illustration">
             <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="url(#gradient-empty)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
               <defs>
                 <linearGradient id="gradient-empty" x1="0%" y1="0%" x2="100%" y2="100%">
                   <stop offset="0%" stopColor="var(--color-accent)" />
                   <stop offset="100%" stopColor="var(--color-income)" />
                 </linearGradient>
               </defs>
               <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
               <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
               <path d="M18 12h2"></path>
               <circle cx="15" cy="16" r="2"></circle>
             </svg>
          </div>
          <h3>Your ledger is empty</h3>
          <p>You haven't recorded any income or expenses yet.</p>
          <button className="btn btn-primary cta-btn" onClick={() => navigate('/add')}>
            Add your first transaction
          </button>
        </div>
      ) : (
        <div className="empty-state card advanced-empty-state">
          <div className="empty-illustration filter-miss">
             <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
             </svg>
          </div>
          <h3>No matches found</h3>
          <p>Try adjusting your search filters or dates to find what you're looking for.</p>
          <button className="btn btn-secondary cta-btn" onClick={() => {
             setSearch('');
             setFilterType('all');
             setDateRange('all');
             setCatFilter('all');
             setMinAmount('');
             setMaxAmount('');
          }}>
             Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
