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

export const exportPDF = async (transactions, getCategoryInfo, formatAmount, currency) => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const dateStr = new Date().toISOString().split('T')[0];

  doc.setFontSize(18);
  doc.text('Transaction Report', 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  
  const headers = [
    ['Date', 'Type', 'Category', 'Amount', 'Note', 'Wallet']
  ];

  const data = transactions.map((t) => {
    const cat = getCategoryInfo(t.category);
    return [
      t.date,
      t.type.charAt(0).toUpperCase() + t.type.slice(1),
      cat.name,
      formatAmount(t.amount, currency),
      t.note || '',
      t.accountId || 'Vault'
    ];
  });

  autoTable(doc, {
    head: headers,
    body: data,
    startY: 35,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255 }, // matches --color-accent
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });

  doc.save(`wallet-transactions-${dateStr}.pdf`);
};
