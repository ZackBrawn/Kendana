import * as FinLogos from '../finlogos';
import { PhosphorIconMap } from './icons';

export const resolveIcon = (iconName) => {
  if (iconName && FinLogos[iconName]) return FinLogos[iconName];
  return iconName && PhosphorIconMap[iconName] ? PhosphorIconMap[iconName] : null;
};

export const formatRp = (val) => {
  const num = Number(val || 0);
  const formatted = Math.abs(num).toLocaleString('id-ID');
  return (num < 0 ? '-' : '') + 'Rp ' + formatted;
};

export const formatCustomLabel = (dateStr) => {
  if (!dateStr) return 'Pilih';
  const parts = dateStr.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
};

export const formatGroupDate = (dateStr) => {
  if (dateStr === 'Unknown' || !dateStr) return 'Tidak Diketahui';
  
  const d = new Date(dateStr);
  
  const getLocalStr = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const db = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${db}`;
  };
  
  const localDatePart = getLocalStr(d);
  const today = getLocalStr(new Date());
  const yesterday = getLocalStr(new Date(Date.now() - 86400000));

  const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });
  const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

  if (localDatePart === today) return `Hari Ini — ${dateFormatted}`;
  if (localDatePart === yesterday) return `Kemarin — ${dateFormatted}`;
  return `${dayName}, ${dateFormatted}`;
};

/**
 * Groups a list of transactions by their date (YYYY-MM-DD),
 * sorted chronologically descending (newest first).
 * @param {Array} transactions 
 * @returns {Array<{date: string, transactions: Array}>}
 */
export const groupTransactionsByDate = (transactions = []) => {
  if (!transactions || transactions.length === 0) return [];
  const groups = {};
  transactions.forEach(t => {
    if (!t || !t.date) return;
    const datePart = t.date.split('T')[0];
    if (!groups[datePart]) {
      groups[datePart] = [];
    }
    groups[datePart].push(t);
  });
  return Object.keys(groups)
    .sort((a, b) => new Date(b) - new Date(a))
    .map(date => ({
      date,
      transactions: groups[date]
    }));
};

/**
 * Calculates sum of Income and Expense from a transaction list
 * @param {Array} transactions 
 * @returns {{income: number, expense: number}}
 */
export const calculateGroupTotals = (transactions = []) => {
  let income = 0;
  let expense = 0;
  if (!transactions) return { income, expense };
  transactions.forEach(t => {
    const amt = parseFloat(t.amount || 0);
    if (t.type_name === 'Income') {
      income += amt;
    } else if (t.type_name === 'Expense') {
      expense += amt;
    }
  });
  return { income, expense };
};

/**
 * Formats a thousand separated number string with Indonesian dot notation
 * @param {number|string} val 
 * @returns {string}
 */
export const formatThousandNumber = (val) => {
  if (val === undefined || val === null || val === '') return '';
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Parses raw user input string to valid number string or float
 * @param {string} val 
 * @param {number} maxDigits 
 * @returns {number|string}
 */
export const parseNumberInput = (val, maxDigits = 12) => {
  if (!val) return '';
  const clean = val.replace(/\D/g, '').slice(0, maxDigits);
  return clean ? parseFloat(clean) : '';
};
