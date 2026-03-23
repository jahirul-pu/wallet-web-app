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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const transactions = useTransactionStore((s) => s.transactions);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const accounts = useAccountStore((s) => s.accounts);
  const adjustBalance = useAccountStore((s) => s.adjustBalance);
  const transfer = useAccountStore((s) => s.transfer);
  const getPrimaryAccountId = useAccountStore((s) => s.getPrimaryAccountId);

  const editId = searchParams.get('edit');
  const editTxn = useMemo(() => editId ? transactions.find(t => t.id === editId) : null, [editId, transactions]);

  const initialType = editTxn ? editTxn.type : (searchParams.get('type') || 'expense');

  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState(editTxn ? String(editTxn.amount) : '');
  const [category, setCategory] = useState(editTxn ? editTxn.category : '');
  const [date, setDate] = useState(editTxn ? editTxn.date : toInputDate());
  const [party, setParty] = useState(editTxn?.party || '');
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [salaryMonth, setSalaryMonth] = useState(editTxn?.salaryMonth || defaultMonth);
  const [note, setNote] = useState(editTxn?.note || '');

  const filteredAccounts = useMemo(() => {
    if (type === 'transfer') return accounts;
    return accounts.filter((a) => !a.type || a.type === 'all' || a.type === type);
  }, [accounts, type]);

  const [accountId, setAccountId] = useState(editTxn ? editTxn.accountId : (searchParams.get('account') || getPrimaryAccountId() || filteredAccounts[0]?.id || ''));
  const [toAccountId, setToAccountId] = useState(editTxn && editTxn.type === 'transfer' ? editTxn.toAccountId : (accounts[1]?.id || ''));

  // Keep selected account valid when switching types (skip if editing to prevent override loops)
  useMemo(() => {
    if (!editTxn && accountId && !filteredAccounts.find(a => a.id === accountId)) {
      setAccountId(filteredAccounts[0]?.id || '');
    }
  }, [filteredAccounts, accountId, editTxn]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    if (type === 'transfer' && accountId === toAccountId) return;
    if (type !== 'transfer' && !category) return;

    // Mathematical Ledger Reversal constraint mapping
    if (editTxn) {
      if (editTxn.type === 'transfer') {
        transfer(editTxn.toAccountId, editTxn.accountId, editTxn.amount);
      } else {
        const revType = editTxn.type === 'income' ? 'expense' : 'income';
        adjustBalance(editTxn.accountId, editTxn.amount, revType);
      }
    }

    if (type === 'transfer') {
      transfer(accountId, toAccountId, Number(amount));
      const payload = {
        id: editTxn ? editId : undefined,
        type: 'transfer',
        amount: Number(amount),
        category: 'transfer',
        date,
        note: note || `Transfer: ${getAccountName(accountId)} → ${getAccountName(toAccountId)}`,
        accountId,
        toAccountId,
      };
      if (editTxn) updateTransaction(payload);
      else addTransaction(payload);
    } else {
      const payload = { 
        id: editTxn ? editId : undefined,
        type, 
        amount: Number(amount), 
        category, 
        date, 
        party, 
        note, 
        accountId 
      };
      if (category === 'salary' || category === 'salary_expense') {
        payload.salaryMonth = salaryMonth;
      }
      
      if (editTxn) updateTransaction(payload);
      else addTransaction(payload);
      
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
            accounts={filteredAccounts} 
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

        {/* Paid To / Paid By */}
        {type !== 'transfer' && (
          <div className="input-group">
            <label>{type === 'expense' ? 'Paid to' : 'Paid by'}</label>
            <input
              type="text"
              className="input"
              placeholder={type === 'expense' ? 'e.g. Starbucks, Landlord' : 'e.g. Employer, Client'}
              value={party}
              onChange={(e) => setParty(e.target.value)}
            />
          </div>
        )}

        {/* Salary Month */}
        {(category === 'salary' || category === 'salary_expense') && (
          <div className="input-group">
            <label>Salary Month</label>
            <select
              className="input"
              value={salaryMonth}
              onChange={(e) => setSalaryMonth(e.target.value)}
            >
              {Array.from({ length: 14 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - 12 + i, 1);
                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                return <option key={val} value={val}>{label}</option>;
              })}
            </select>
          </div>
        )}

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

        <button type="submit" className={`btn submit-btn ${type === 'income' ? 'btn-income' : type === 'expense' ? 'btn-expense' : 'btn-secondary'}`} id="submit-btn">
          {type === 'transfer' ? 'Transfer' : 'Save Transaction'}
        </button>
      </form>
    </div>
  );
}
