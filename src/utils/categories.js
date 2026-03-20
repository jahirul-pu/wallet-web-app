// Category definitions with icons and colors
export const CATEGORIES = {
  // Income categories
  salary: { name: 'Salary', icon: '💼', type: 'income', color: '#10b981' },
  freelance: { name: 'Freelance', icon: '💻', type: 'income', color: '#06b6d4' },
  business: { name: 'Business', icon: '🏢', type: 'income', color: '#8b5cf6' },
  investment: { name: 'Investment', icon: '📈', type: 'income', color: '#f59e0b' },
  gift: { name: 'Gift', icon: '🎁', type: 'income', color: '#ec4899' },
  other_income: { name: 'Other', icon: '💰', type: 'income', color: '#14b8a6' },

  // Expense categories
  food: { name: 'Food & Dining', icon: '🍔', type: 'expense', color: '#ef4444' },
  transport: { name: 'Transport', icon: '🚗', type: 'expense', color: '#f97316' },
  shopping: { name: 'Shopping', icon: '🛍️', type: 'expense', color: '#ec4899' },
  entertainment: { name: 'Entertainment', icon: '🎬', type: 'expense', color: '#8b5cf6' },
  bills: { name: 'Bills & Utilities', icon: '🧾', type: 'expense', color: '#6366f1' },
  health: { name: 'Health', icon: '🏥', type: 'expense', color: '#10b981' },
  education: { name: 'Education', icon: '📚', type: 'expense', color: '#06b6d4' },
  rent: { name: 'Rent', icon: '🏠', type: 'expense', color: '#f59e0b' },
  groceries: { name: 'Groceries', icon: '🛒', type: 'expense', color: '#84cc16' },
  personal: { name: 'Personal Care', icon: '💅', type: 'expense', color: '#d946ef' },
  travel: { name: 'Travel', icon: '✈️', type: 'expense', color: '#0ea5e9' },
  subscriptions: { name: 'Subscriptions', icon: '📱', type: 'expense', color: '#a855f7' },
  other_expense: { name: 'Other', icon: '📦', type: 'expense', color: '#6b7280' },
};

export const getIncomeCategories = () =>
  Object.entries(CATEGORIES).filter(([, c]) => c.type === 'income');

export const getExpenseCategories = () =>
  Object.entries(CATEGORIES).filter(([, c]) => c.type === 'expense');

export const getCategoryInfo = (key) =>
  CATEGORIES[key] || { name: 'Unknown', icon: '❓', type: 'expense', color: '#6b7280' };
