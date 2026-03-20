import { getIncomeCategories, getExpenseCategories } from '../utils/categories';
import './CategoryPicker.css';

export default function CategoryPicker({ type, value, onChange }) {
  const categories = type === 'income' ? getIncomeCategories() : getExpenseCategories();

  return (
    <div className="category-picker" id="category-picker">
      {categories.map(([key, cat]) => (
        <button
          key={key}
          className={`category-picker-item ${value === key ? 'active' : ''}`}
          onClick={() => onChange(key)}
          style={{
            '--cat-color': cat.color,
          }}
          type="button"
        >
          <span className="category-picker-icon">{cat.icon}</span>
          <span className="category-picker-name">{cat.name}</span>
        </button>
      ))}
    </div>
  );
}
