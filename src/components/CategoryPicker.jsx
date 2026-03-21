import { useState, useMemo } from 'react';
import { getIncomeCategories, getExpenseCategories } from '../utils/categories';
import { useTransactionStore } from '../stores/useTransactionStore';
import './CategoryPicker.css';

export default function CategoryPicker({ type, value, onChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const allCategories = type === 'income' ? getIncomeCategories() : getExpenseCategories();
  const transactions = useTransactionStore((s) => s.transactions);

  // Filter 1: Search
  const filteredCats = useMemo(() => {
    if (!searchTerm) return allCategories;
    const lower = searchTerm.toLowerCase();
    return allCategories.filter(([_, cat]) => cat.name.toLowerCase().includes(lower));
  }, [allCategories, searchTerm]);

  // Compute "Recently Used" or "Smart Suggestion" (only if NOT searching)
  const insights = useMemo(() => {
    if (searchTerm) return null;

    const txnsOfType = transactions.filter(t => t.type === type);
    if (txnsOfType.length === 0) return null;

    // Suggestion logic: Check recurring by DATE
    const now = new Date();
    const today = now.getDate();
    let suggestedCatKey = null;
    let suggestionText = '';

    if (type === 'income' && today >= 1 && today <= 6) {
       const hadEarlySalary = txnsOfType.some(t => {
         const d = new Date(t.date);
         return t.category === 'salary' && d.getDate() >= 1 && d.getDate() <= 6;
       });
       if (hadEarlySalary) {
         suggestedCatKey = 'salary';
         suggestionText = 'You usually receive Salary early in the month';
       }
    } else if (type === 'expense' && today >= 1 && today <= 6) {
       const hadEarlyRent = txnsOfType.some(t => {
         const d = new Date(t.date);
         return t.category === 'rent' && d.getDate() >= 1 && d.getDate() <= 6;
       });
       if (hadEarlyRent) {
         suggestedCatKey = 'rent';
         suggestionText = 'Rent is usually due early in the month';
       }
    }

    // Top 3 Frequently Used 
    const freq = {};
    txnsOfType.forEach(t => {
      const c = t.category || (type === 'income' ? 'other_income' : 'other_expense');
      freq[c] = (freq[c] || 0) + 1;
    });

    const recentKeys = Object.entries(freq)
      .sort((a,b) => b[1] - a[1])
      .map(k => k[0])
      .slice(0, 3);
    
    // Convert keys to full category arrays
    const recentCats = recentKeys.map(k => allCategories.find(c => c[0] === k)).filter(Boolean);
    const suggestedCat = suggestedCatKey ? allCategories.find(c => c[0] === suggestedCatKey) : null;

    return { recentCats, suggestedCat, suggestionText };
  }, [transactions, type, allCategories, searchTerm]);

  return (
    <div className="category-picker-container">
      <div className="picker-search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input 
           type="text" 
           placeholder="Search categories..." 
           value={searchTerm} 
           onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {insights && insights.suggestedCat && (
        <div className="picker-smart-suggestion" onClick={() => onChange(insights.suggestedCat[0])}>
           <span className="suggestion-icon">✨</span>
           <span className="suggestion-text">{insights.suggestionText}</span>
        </div>
      )}

      {insights && insights.recentCats.length > 0 && (
         <div className="picker-section">
           <div className="picker-section-title">Recently Used</div>
           <div className="category-picker">
              {insights.recentCats.map(([key, cat]) => (
                <button
                  key={key}
                  className={`category-picker-item ${value === key ? 'active' : ''}`}
                  onClick={() => onChange(key)}
                  style={{ '--cat-color': cat.color }}
                  type="button"
                >
                  <span className="category-picker-icon">{cat.icon}</span>
                  <span className="category-picker-name">{cat.name}</span>
                </button>
              ))}
           </div>
         </div>
      )}

      <div className="picker-section">
        <div className="picker-section-title">{searchTerm ? 'Search Results' : 'All Categories'}</div>
        <div className="category-picker">
          {filteredCats.map(([key, cat]) => (
            <button
              key={key}
              className={`category-picker-item ${value === key ? 'active' : ''}`}
              onClick={() => onChange(key)}
              style={{ '--cat-color': cat.color }}
              type="button"
            >
              <span className="category-picker-icon">{cat.icon}</span>
              <span className="category-picker-name">{cat.name}</span>
            </button>
          ))}
          {filteredCats.length === 0 && (
             <div className="picker-empty">No categories found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
