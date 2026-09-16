import { ref, computed } from 'vue';

export function useDate() {
  const filterType = ref('this_month');
  const currentDate = ref(new Date());
  const customStartDate = ref('');
  const customEndDate = ref('');

  const monthNamesList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const presetsList = [
    { id: 'all', label: 'Semua' },
    { id: 'today', label: 'Hari Ini' },
    { id: 'yesterday', label: 'Kemarin' },
    { id: 'this_week', label: 'Minggu Ini' },
    { id: 'last_week', label: 'Minggu Kemarin' },
    { id: 'this_month', label: 'Bulan Ini' },
    { id: 'last_month', label: 'Bulan Kemarin' },
    { id: 'this_year', label: 'Tahun Ini' },
    { id: 'last_year', label: 'Tahun Kemarin' },
    { id: 'last_7_days', label: '7 Hari Terakhir' },
    { id: 'last_30_days', label: '30 Hari Terakhir' },
    { id: 'last_90_days', label: '90 Hari Terakhir' }
  ];

  const dateRange = computed(() => {
    const now = new Date();

    const startOfDay = (d) => {
      const res = new Date(d);
      res.setHours(0, 0, 0, 0);
      return res;
    };
    const endOfDay = (d) => {
      const res = new Date(d);
      res.setHours(23, 59, 59, 999);
      return res;
    };

    switch (filterType.value) {
      case 'all':
        return { start: new Date(0), end: new Date(32503680000000) };

      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };

      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      }

      case 'this_week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        return { start: startOfDay(monday), end: endOfDay(sunday) };
      }

      case 'last_week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        monday.setDate(monday.getDate() - 7);
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        return { start: startOfDay(monday), end: endOfDay(sunday) };
      }

      case 'this_month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
      }

      case 'last_month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { start, end };
      }

      case 'this_year': {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start, end };
      }

      case 'last_year': {
        const start = new Date(now.getFullYear() - 1, 0, 1);
        const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        return { start, end };
      }

      case 'last_7_days': {
        const start = new Date(now);
        start.setDate(start.getDate() - 6);
        return { start: startOfDay(start), end: endOfDay(now) };
      }

      case 'last_30_days': {
        const start = new Date(now);
        start.setDate(start.getDate() - 29);
        return { start: startOfDay(start), end: endOfDay(now) };
      }

      case 'last_90_days': {
        const start = new Date(now);
        start.setDate(start.getDate() - 89);
        return { start: startOfDay(start), end: endOfDay(now) };
      }

      case 'month': {
        const y = currentDate.value.getFullYear();
        const m = currentDate.value.getMonth();
        const start = new Date(y, m, 1, 0, 0, 0, 0);
        const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
        return { start, end };
      }

      case 'custom': {
        const start = customStartDate.value ? new Date(customStartDate.value + 'T00:00:00') : new Date(0);
        const end = customEndDate.value ? new Date(customEndDate.value + 'T23:59:59.999') : new Date();
        return { start, end };
      }

      default:
        return { start: new Date(0), end: new Date() };
    }
  });

  const periodLabel = computed(() => {
    const formatCustomDate = (dateStr) => {
      if (!dateStr) return '...';
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    switch (filterType.value) {
      case 'all':
        return 'Semua Transaksi';
      case 'today':
        return 'Hari Ini';
      case 'yesterday':
        return 'Kemarin';
      case 'this_week':
        return 'Minggu Ini';
      case 'last_week':
        return 'Minggu Kemarin';
      case 'this_month':
        return `${monthNamesList[new Date().getMonth()]} ${new Date().getFullYear()}`;
      case 'last_month': {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return `${monthNamesList[d.getMonth()]} ${d.getFullYear()}`;
      }
      case 'this_year':
        return `Tahun ${new Date().getFullYear()}`;
      case 'last_year':
        return `Tahun ${new Date().getFullYear() - 1}`;
      case 'last_7_days':
        return '7 Hari Terakhir';
      case 'last_30_days':
        return '30 Hari Terakhir';
      case 'last_90_days':
        return '90 Hari Terakhir';
      case 'month':
        return `${monthNamesList[currentDate.value.getMonth()]} ${currentDate.value.getFullYear()}`;
      case 'custom':
        return `${formatCustomDate(customStartDate.value)} - ${formatCustomDate(customEndDate.value)}`;
      default:
        return 'Filter';
    }
  });

  const hasPrevMonth = (transactionsList) => {
    if (!transactionsList || transactionsList.length === 0) return false;
    const { start } = dateRange.value;
    return transactionsList.some(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d < start;
    });
  };

  const hasNextMonth = (transactionsList) => {
    if (!transactionsList || transactionsList.length === 0) return false;
    const { end } = dateRange.value;
    return transactionsList.some(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d > end;
    });
  };

  const prevMonth = (transactionsList) => {
    if (!hasPrevMonth(transactionsList)) return;
    if (filterType.value === 'this_month') {
      currentDate.value = new Date();
    } else if (filterType.value === 'last_month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      currentDate.value = d;
    } else if (filterType.value !== 'month') {
      currentDate.value = new Date();
    }
    filterType.value = 'month';
    const d = new Date(currentDate.value);
    d.setMonth(d.getMonth() - 1);
    currentDate.value = d;
  };

  const nextMonth = (transactionsList) => {
    if (!hasNextMonth(transactionsList)) return;
    if (filterType.value === 'this_month') {
      currentDate.value = new Date();
    } else if (filterType.value === 'last_month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      currentDate.value = d;
    } else if (filterType.value !== 'month') {
      currentDate.value = new Date();
    }
    filterType.value = 'month';
    const d = new Date(currentDate.value);
    d.setMonth(d.getMonth() + 1);
    currentDate.value = d;
  };

  return {
    filterType,
    currentDate,
    customStartDate,
    customEndDate,
    monthNamesList,
    presetsList,
    dateRange,
    periodLabel,
    hasPrevMonth,
    hasNextMonth,
    prevMonth,
    nextMonth
  };
}

