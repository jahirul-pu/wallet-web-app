// Data export/import utilities

export const exportData = (stores) => {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: stores.transactions || [],
    accounts: stores.accounts || [],
    budgets: stores.budgets || [],
    debts: stores.debts || [],
    settings: stores.settings || {},
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `wallet-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importData = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version) {
          reject(new Error('Invalid backup file'));
          return;
        }
        resolve(data);
      } catch (err) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

export const exportCSV = (transactions, getCategoryInfo, formatAmount, currency) => {
  const headers = ['Date', 'Type', 'Category', 'Amount', 'Note', 'Account'];
  const rows = transactions.map((t) => {
    const cat = getCategoryInfo(t.category);
    return [
      t.date,
      t.type,
      cat.name,
      formatAmount(t.amount, currency),
      `"${(t.note || '').replace(/"/g, '""')}"`,
      t.accountId || '',
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `wallet-transactions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
