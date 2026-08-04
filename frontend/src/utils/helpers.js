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
  // If it has timezone T, split it
  const datePart = dateStr.split('T')[0];
  const d = new Date(datePart + 'T00:00:00');
  
  const getLocalStr = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const db = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${db}`;
  };
  
  const today = getLocalStr(new Date());
  const yesterday = getLocalStr(new Date(Date.now() - 86400000));

  const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });
  const dateFormatted = `${d.getDate()}/${d.getMonth() + 1}`;

  if (datePart === today) return `Hari Ini — ${dateFormatted}`;
  if (datePart === yesterday) return `Kemarin — ${dateFormatted}`;
  return `${dayName}, ${dateFormatted}`;
};
