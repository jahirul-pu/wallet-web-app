import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import CategoryPicker from '../components/CategoryPicker';
import AccountDropdown from '../components/AccountDropdown';
import CalculatorInput from '../components/CalculatorInput';
import DatePicker from '../components/DatePicker';
import { toInputDate } from '../utils/dateFormat';
import './AddTransaction.css';

export default function AddTransaction() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const accounts = useAccountStore((s) => s.accounts);
  const adjustBalance = useAccountStore((s) => s.adjustBalance);
  const transfer = useAccountStore((s) => s.transfer);

  const initialType = searchParams.get('type') || 'expense';

  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(toInputDate());
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    if (type === 'transfer') {
      if (accountId === toAccountId) return;
      transfer(accountId, toAccountId, Number(amount));
      addTransaction({
        type: 'transfer',
        amount: Number(amount),
        category: 'transfer',
        date,
        note: note || `Transfer: ${getAccountName(accountId)} → ${getAccountName(toAccountId)}`,
        accountId,
        toAccountId,
      });
    } else {
      if (!category) return;
      addTransaction({ type, amount: Number(amount), category, date, note, accountId });
      adjustBalance(accountId, Number(amount), type);
    }

    navigate(-1);
  };

  const getAccountName = (id) => accounts.find((a) => a.id === id)?.name || '';

  return (
    <div className="page" id="add-transaction-page">
      <div className="add-header">
        <button className="btn btn-icon btn-secondary" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1 className="page-title" style={{ margin: 0 }}>
          {type === 'transfer' ? 'Transfer' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
        </h1>
        <div style={{ width: 44 }} />
      </div>

      {/* Type selector */}
      <div className="type-selector">
        {['income', 'expense', 'transfer'].map((t) => (
          <button
            key={t}
            className={`type-btn ${type === t ? `active ${t}` : ''}`}
            onClick={() => { setType(t); setCategory(''); }}
            type="button"
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="add-form">
        {/* Amount */}
        <div className="amount-input-container">
          <CalculatorInput
            value={amount}
            onChange={setAmount}
            id="amount-input"
          />
        </div>

        {/* Account */}
        <div className="input-group" style={{ position: 'relative', zIndex: 10 }}>
          <label>{type === 'transfer' ? 'From Account' : 'Account'}</label>
          <AccountDropdown 
            accounts={accounts} 
            value={accountId} 
            onChange={setAccountId} 
          />
        </div>

        {/* To account (transfer only) */}
        {type === 'transfer' && (
          <div className="input-group" style={{ position: 'relative', zIndex: 9 }}>
            <label>To Account</label>
            <AccountDropdown 
              accounts={accounts.filter((a) => a.id !== accountId)} 
              value={toAccountId} 
              onChange={setToAccountId} 
            />
          </div>
        )}

        {/* Category (not for transfers) */}
        {type !== 'transfer' && (
          <div className="input-group">
            <label>Category</label>
            <CategoryPicker type={type} value={category} onChange={setCategory} />
          </div>
        )}

        {/* Date */}
        <div className="input-group" style={{ position: 'relative', zIndex: 8 }}>
          <label>Date</label>
          <DatePicker
            value={date}
            onChange={setDate}
            id="date-input"
          />
        </div>

        {/* Note */}
        <div className="input-group">
          <label>Note (optional)</label>
          <input
            type="text"
            className="input"
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            id="note-input"
          />
        </div>

        <button type="submit" className="btn btn-primary submit-btn" id="submit-btn">
          {type === 'transfer' ? 'Transfer' : 'Save Transaction'}
        </button>
      </form>
    </div>
  );
}
