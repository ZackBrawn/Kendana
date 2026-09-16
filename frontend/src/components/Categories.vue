<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';
import { api } from '../api';
import { PhCaretDown, PhCaretLeft, PhCaretRight, PhX, PhArrowLeft, PhPlus } from "@phosphor-icons/vue";
import { resolveIcon, formatRp, groupTransactionsByDate, calculateGroupTotals } from '../utils/helpers';
import { ICON_GROUPS } from '../utils/iconList';
import Transaction from './Transaction.vue';
import { useDate } from '../composables/useDate';

Chart.register(...registerables);

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['close']);

const categories = ref([]);
const activeTab = ref(2); // 2.expense 1.income

const loadCategories = async () => {
  try {
    categories.value = await api.getCategories();
  } catch (err) {
    console.error(err);
  }
};

// Add category state
const showAddCategory = ref(false);
const newCategoryName = ref('');
const newCategoryIcon = ref('PhShoppingCart');
const savingCategory = ref(false);

const openAddCategory = () => {
  newCategoryName.value = '';
  newCategoryIcon.value = 'PhShoppingCart';
  showAddCategory.value = true;
};

const handleCreateCategory = async () => {
  if (!newCategoryName.value.trim()) return;
  savingCategory.value = true;
  try {
    await api.createCategory({
      category_name: newCategoryName.value.trim(),
      type_id: activeTab.value,
      icon: newCategoryIcon.value || 'PhShoppingCart'
    });
    showAddCategory.value = false;
    await loadCategories();
  } catch (err) {
    console.error(err);
  } finally {
    savingCategory.value = false;
  }
};

// History view state (open inside this modal)
const showHistory = ref(false);
const selectedCategory = ref(null);
const historyTransactions = ref([]);

// Bar chart state (reused from Analytics)
const barChartCanvas = ref(null);
let barChartInstance = null;
const barChartInterval = ref('day'); // 'day' | 'week' | 'month'
const CHART_INTERVALS = [
  { id: 'day', label: 'Harian' },
  { id: 'week', label: 'Mingguan' },
  { id: 'month', label: 'Bulanan' }
];

const openCategory = async (c) => {
  // open history inline inside this Categories modal instead of navigating away
  selectedCategory.value = c;
  showHistory.value = true;

  try {
    const tx = await api.getTransactions();
    // filter by category id and by type (optional)
    historyTransactions.value = tx.filter(t => Number(t.category_id) === Number(c.id));

    // set currentDate to the most recent transaction date so monthly filter centers around data
    if (historyTransactions.value.length > 0) {
      const maxDate = historyTransactions.value.reduce((max, t) => {
        const d = t.date ? new Date(t.date) : new Date(0);
        return d > max ? d : max;
      }, new Date(0));
      currentDate.value = maxDate;
    } else {
      currentDate.value = new Date();
    }

    // switch to month filter so only selected month shows
    filterType.value = 'month';

    // ensure chart renders after DOM update and after transactions are set
    await nextTick();
    // ensure DOM paint so canvas is available inside Teleport — wait an extra animation frame
    await new Promise((resolve) => requestAnimationFrame(resolve));
    updateBarChart();
  } catch (err) {
    console.error(err);
    historyTransactions.value = [];
  }
};

const closeHistory = () => {
  showHistory.value = false;
  selectedCategory.value = null;
  historyTransactions.value = [];
  barChartInterval.value = 'day';
  if (barChartInstance) {
    barChartInstance.destroy();
    barChartInstance = null;
  }
};

const { filterType, currentDate, customStartDate, customEndDate, dateRange, periodLabel, hasPrevMonth, hasNextMonth, prevMonth, nextMonth } = useDate();

const filteredHistoryTransactions = computed(() => {
  if (!historyTransactions.value) return [];
  const { start, end } = dateRange.value;
  return historyTransactions.value.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d >= start && d <= end;
  });
});

const groupedTransactions = computed(() => groupTransactionsByDate(filteredHistoryTransactions.value));

const getGroupTotals = (transactions) => calculateGroupTotals(transactions);

const collapsedGroups = ref({});
const isGroupCollapsed = (dateStr) => !!collapsedGroups.value[dateStr];
const toggleGroup = (dateStr) => {
  collapsedGroups.value[dateStr] = !collapsedGroups.value[dateStr];
};

// simple handlers to reuse app's global modals (same events used by Analytics)
const handleTransactionClick = (transaction) => {
  window.dispatchEvent(new CustomEvent('open-detail-modal', { detail: { transaction } }));
};
const handleSwipeEdit = (transaction) => {
  window.dispatchEvent(new CustomEvent('open-edit-modal', { detail: { transaction } }));
};
const handleSwipeDelete = (transaction) => {
  window.dispatchEvent(new CustomEvent('open-delete-confirm', { detail: { transaction } }));
};

const getWeekNumber = (d) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return date.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0');
};

const getMonthKey = (d) => {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};

const processBarChartData = (transactions, interval) => {
  const groups = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

  // Monthly interval: show months from January up to the selected month (same year as currentDate)
  if (interval === 'month') {
    const sel = currentDate && currentDate.value ? new Date(currentDate.value) : new Date();
    const year = sel.getFullYear();
    const selMonth = sel.getMonth(); // 0-based

    // initialize months from Jan .. selected month
    for (let m = 0; m <= selMonth; m++) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      groups[key] = { label: `${monthNames[m]} ${year}`, total: 0, key };
    }

    transactions.forEach(t => {
      if (!t.date) return;
      const d = new Date(t.date);
      if (d.getFullYear() !== year) return; // only consider the selected year
      const m = d.getMonth();
      if (m > selMonth) return; // ignore months after selected month
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = { label: `${monthNames[m]} ${year}`, total: 0, key };
      groups[key].total += parseFloat(t.amount);
    });

    const sortedKeys = Object.keys(groups).sort();
    // Show only months that have transactions, but always include the selected month
    const selKey = `${year}-${String(selMonth + 1).padStart(2, '0')}`;
    const filteredKeys = sortedKeys.filter(k => (groups[k].total && groups[k].total > 0) || k === selKey);

    return {
      labels: filteredKeys.map(k => groups[k].label),
      totals: filteredKeys.map(k => groups[k].total)
    };
  }

  // Weekly interval: bucket weeks that belong to the selected month only
  if (interval === 'week') {
    const sel = currentDate && currentDate.value ? new Date(currentDate.value) : new Date();
    const year = sel.getFullYear();
    const month = sel.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    // offset so weeks start on Monday (0=Sun -> 6)
    const firstWeekday = firstDayOfMonth.getDay();
    const offset = (firstWeekday + 6) % 7;

    const daysInMonth = lastDayOfMonth.getDate();
    const weeksCount = Math.ceil((daysInMonth + offset) / 7);

    // initialize week buckets
    for (let w = 1; w <= weeksCount; w++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-W${w}`;
      groups[key] = { label: 'Minggu ' + w, total: 0, key };
    }

    transactions.forEach(t => {
      if (!t.date) return;
      const d = new Date(t.date);
      if (d.getFullYear() !== year || d.getMonth() !== month) return; // only this month
      const weekOfMonth = Math.ceil((d.getDate() + offset) / 7);
      const key = `${year}-${String(month + 1).padStart(2, '0')}-W${weekOfMonth}`;
      if (!groups[key]) groups[key] = { label: 'Minggu ' + weekOfMonth, total: 0, key };
      groups[key].total += parseFloat(t.amount);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const wa = parseInt(a.split('-W')[1], 10);
      const wb = parseInt(b.split('-W')[1], 10);
      return wa - wb;
    });

    // Only show weeks that have transactions
    const filteredKeys = sortedKeys.filter(k => groups[k].total && groups[k].total > 0);

    return {
      labels: filteredKeys.map(k => groups[k].label),
      totals: filteredKeys.map(k => groups[k].total)
    };
  }

  // Default (day) behavior: group by exact day
  transactions.forEach(t => {
    if (!t.date) return;
    const d = new Date(t.date);
    let key = '';
    let label = '';

    if (interval === 'day') {
      key = t.date.split('T')[0];
      label = d.getDate() + ' ' + monthNames[d.getMonth()];
    } else {
      // Fallback to month grouping if unknown interval
      key = getMonthKey(d);
      label = monthNames[d.getMonth()] + ' ' + d.getFullYear();
    }

    if (!groups[key]) {
      groups[key] = { label, total: 0, key };
    }
    groups[key].total += parseFloat(t.amount);
  });

  const sortedKeys = Object.keys(groups).sort();
  return {
    labels: sortedKeys.map(k => groups[k].label),
    totals: sortedKeys.map(k => groups[k].total)
  };
};

const updateBarChart = () => {
  if (!barChartCanvas.value) {
    setTimeout(() => {
      if (barChartCanvas.value) updateBarChart();
    }, 100);
    return;
  }

  if (!showHistory.value || filteredHistoryTransactions.value.length === 0) {
    if (barChartInstance) {
      barChartInstance.destroy();
      barChartInstance = null;
    }
    return;
  }

  // For monthly interval we need totals across months of the year (Jan..selected month)
  // so use the full historyTransactions (not the dateRange-filtered subset). For day/week use the filtered set.
  const txForChart = barChartInterval.value === 'month' ? historyTransactions.value : filteredHistoryTransactions.value;
  const { labels, totals } = processBarChartData(txForChart, barChartInterval.value);

  if (barChartInstance) {
    barChartInstance.destroy();
  }

  if (labels.length === 0) return;

  const isIncome = (selectedCategory.value && selectedCategory.value.type_id === 1) || false;
  const barColor = isIncome ? '#10b981' : '#f43f5e';

  barChartInstance = new Chart(barChartCanvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Total',
        data: totals,
        backgroundColor: barColor,
        borderRadius: 4,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: (context) => {
            let tooltipEl = document.getElementById('chartjs-tooltip');

            if (!tooltipEl) {
              tooltipEl = document.createElement('div');
              tooltipEl.id = 'chartjs-tooltip';
              tooltipEl.style.background = '#ffffff';
              tooltipEl.style.borderRadius = '12px';
              tooltipEl.style.color = '#334155';
              tooltipEl.style.opacity = 0;
              tooltipEl.style.pointerEvents = 'none';
              tooltipEl.style.position = 'absolute';
              tooltipEl.style.transition = 'all 0.1s ease';
              tooltipEl.style.zIndex = '100';
              tooltipEl.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)';
              tooltipEl.style.border = '1px solid rgba(15, 23, 42, 0.08)';
              tooltipEl.style.padding = '10px 12px';
              document.body.appendChild(tooltipEl);
            }

            const tooltipModel = context.tooltip;
            if (tooltipModel.opacity === 0) {
              tooltipEl.style.opacity = 0;
              return;
            }

            if (tooltipModel.body) {
              const titleLines = tooltipModel.title || [];
              const bodyLines = tooltipModel.body.map(item => item.lines);

              let innerHtml = '';

              // Avoid duplicate title if body already contains the same label (e.g., "Minggu 1" appears in body)
              const firstTitle = titleLines.length ? String(titleLines[0]) : '';
              const firstBodyStr = bodyLines.length ? (Array.isArray(bodyLines[0]) ? bodyLines[0].join(' ') : String(bodyLines[0])) : '';
              const showTitle = !(firstTitle && firstBodyStr && firstBodyStr.includes(firstTitle));

              if (showTitle) {
                titleLines.forEach(title => {
                  innerHtml += `<div style="font-family: Inter, sans-serif; font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${title}</div>`;
                });
              }

              bodyLines.forEach((body, i) => {
                const colors = tooltipModel.labelColors[i];
                let style = `background: ${colors.backgroundColor};`;
                style += ` border-color: ${colors.borderColor};`;
                style += ' border-width: 1px;';
                style += ' display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px;';
                const span = `<span style="${style}"></span>`;
                innerHtml += `<div style="font-family: Inter, sans-serif; font-size: 11px; font-weight: 600; color: #475569; display: flex; align-items: center;">${span}${Array.isArray(body) ? body.join(' ') : body}</div>`;
              });

              tooltipEl.innerHTML = innerHtml;
            }

            const position = context.chart.canvas.getBoundingClientRect();
            tooltipEl.style.opacity = 1;
            tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX - (tooltipEl.offsetWidth / 2) + 'px';
            tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY - tooltipEl.offsetHeight - 12 + 'px';
          },
          callbacks: {
            label: (context) => ` ${context.label}: ${formatRp(context.raw)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => {
              if (value >= 1000000) return (value / 1000000) + 'M';
              if (value >= 1000) return (value / 1000) + 'k';
              return value;
            },
            font: { size: 10 }
          },
          grid: { color: '#f1f5f9' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 } }
        }
      }
    }
  });
};

watch(barChartInterval, () => {
  nextTick(updateBarChart);
});

watch(showHistory, (newVal) => {
  if (newVal) {
    nextTick(updateBarChart);
  } else {
    barChartInterval.value = 'day';
    if (barChartInstance) {
      barChartInstance.destroy();
      barChartInstance = null;
    }
  }
});

// Ensure chart updates when the selected date range changes (e.g., prev/next month)
watch(dateRange, () => {
  if (showHistory.value) {
    nextTick(updateBarChart);
  }
}, { deep: true });

onMounted(loadCategories);
</script>

<template>
  <Teleport to="body">
    <div v-if="show"
      class="fixed inset-0 z-[45] bg-slate-50 flex flex-col w-full max-w-md mx-auto shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250">
      <!-- Header -->
      <div
        class="sticky top-0 z-50 bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between shadow-xs shrink-0">
        <button @click="$emit('close')" class="w-10 h-10 flex items-center justify-center text-accent transition-colors cursor-pointer">
          <PhArrowLeft :size="24" weight="bold" />
        </button>
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Kategori</h3>
        <button @click="openAddCategory" class="w-10 h-10 flex items-center justify-center text-accent transition-colors cursor-pointer">
          <PhPlus :size="22" weight="bold" />
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 flex flex-col p-4 space-y-4 no-scrollbar pb-20">
        <!-- Categories list -->
        <div v-if="!showHistory" class="flex-1 overflow-y-auto no-scrollbar">
          <div class="grid grid-cols-2 gap-2 mb-2 bg-slate-200/60 p-1 rounded-xl shrink-0">
            <button @click="activeTab = 2"
              :class="activeTab === 2 ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-500'"
              class="py-2 text-xs rounded-lg transition-all cursor-pointer">Pengeluaran</button>
            <button @click="activeTab = 1"
              :class="activeTab === 1 ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-500'"
              class="py-2 text-xs rounded-lg transition-all cursor-pointer">Pemasukan</button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div v-for="c in categories.filter(c => c.type_id === activeTab)" :key="c.id"
              @click="openCategory(c)"
              class="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3 shadow-xs cursor-pointer">
              <div
                class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/50 flex items-center justify-center shrink-0">
                <component :is="resolveIcon(c.icon)" v-if="resolveIcon(c.icon)" :size="24" class="text-slate-700" />
                <component :is="resolveIcon('PhTag')" v-else :size="24" class="text-slate-700" />
              </div>
              <p class="text-xs font-bold text-slate-800 truncate">{{ c.category_name }}</p>
            </div>
          </div>
        </div>

        <!-- History Dialog overlay (match Analytics) -->
        <Teleport to="body">
          <div v-if="showHistory" class="fixed inset-0 z-[45] flex justify-center animate-in fade-in duration-200" @click.self="closeHistory">
            <div class="w-full max-w-md bg-slate-50 flex flex-col h-[100dvh] shadow-2xl relative animate-in slide-in-from-bottom duration-250 overflow-hidden">

              <div class="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
                <div class="flex items-center gap-2.5">
                  <span class="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-2xs">
                    <component :is="resolveIcon(selectedCategory.icon)" v-if="resolveIcon(selectedCategory.icon)" :size="18" class="text-slate-700" />
                    <span v-else>{{ selectedCategory.icon }}</span>
                  </span>
                  <div>
                    <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider truncate max-w-[180px]">{{ selectedCategory.category_name }}</h4>
                    <p class="text-[10px] text-slate-455 font-bold mt-0.5">Riwayat Lengkap</p>
                  </div>
                </div>

                <button @click="closeHistory" class="w-10 h-10 flex items-center justify-center text-accent transition-colors cursor-pointer">
                  <PhX :size="18" weight="bold" />
                </button>
              </div>

              <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-200/60 flex justify-between items-center shrink-0">
                <span class="text-[10px] font-black text-slate-455 uppercase tracking-wider">Total</span>
                <span class="text-xs font-black" :class="(selectedCategory && selectedCategory.type_id === 1) ? 'text-emerald-600' : 'text-rose-500'">
                  {{ (selectedCategory && selectedCategory.type_id === 1) ? '+' : '-' }}{{ formatRp(filteredHistoryTransactions.reduce((s, t) => s + parseFloat(t.amount || 0), 0)) }}
                </span>
              </div>

              <div class="flex-1 overflow-y-auto no-scrollbar bg-slate-50">

                <div class="px-4 pt-4 pb-2">
                  <div class="flex items-center justify-end gap-2">
                    <div class="flex-1 min-w-0"></div>

                    <div class="flex shrink-0 items-center gap-1 bg-slate-200/60 rounded-lg px-2 py-1.5 text-slate-700 select-none shadow-3xs">
                      <button type="button" @click="prevMonth(historyTransactions)" :disabled="!hasPrevMonth(historyTransactions)"
                        :class="['p-0.5 rounded-full transition-all cursor-pointer text-accent', !hasPrevMonth(historyTransactions) ? 'opacity-35 cursor-not-allowed' : '']"
                        aria-label="Previous Month">
                        <PhCaretLeft :size="16" weight="bold" />
                      </button>
                      <span @click="null" class="text-[10px] font-black uppercase tracking-wider cursor-pointer hover:text-accent selection:bg-transparent transition-colors px-1">{{ periodLabel }}</span>
                      <button type="button" @click="nextMonth(historyTransactions)" :disabled="!hasNextMonth(historyTransactions)"
                        :class="['p-0.5 rounded-full transition-all cursor-pointer text-accent', !hasNextMonth(historyTransactions) ? 'opacity-35 cursor-not-allowed' : '']"
                        aria-label="Next Month">
                        <PhCaretRight :size="16" weight="bold" />
                      </button>
                    </div>
                  </div>

                  <div class="mt-2">
                    <div class="flex bg-slate-200/60 p-1 rounded-xl mb-0 w-full">
                      <button
                        v-for="interval in CHART_INTERVALS" :key="interval.id" @click="barChartInterval = interval.id"
                        class="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all"
                        :class="barChartInterval === interval.id ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-700'">
                        {{ interval.label }}
                      </button>
                    </div>
                  </div>

                </div>

                <div class="px-4">
                  <div class="h-40 w-full relative mb-3">
                    <canvas ref="barChartCanvas"></canvas>
                  </div>

                  <!-- Transaction List -->
                  <div class="p-4 space-y-3.5 border-t border-slate-200/50 mt-2">
                    <div v-for="group in groupedTransactions" :key="group.date" class="mb-3.5 last:mb-0 shadow-md rounded-2xl">
                      <div @click="toggleGroup(group.date)"
                        class="flex items-center justify-between cursor-pointer select-none px-3.5 py-2.5 bg-slate-100 border border-slate-200/50 transition-all"
                        :class="isGroupCollapsed(group.date) ? 'rounded-xl' : 'rounded-t-xl border-b-0'">
                        <span class="text-[9px] font-black text-slate-500 uppercase tracking-wider">{{ new Date(group.date).toLocaleDateString() }}</span>
                        <div class="flex items-center gap-x-2.5 ml-auto mr-2.5 text-[9px] font-black tracking-wider text-slate-500">
                          <span v-if="getGroupTotals(group.transactions).income > 0">+ {{ formatRp(getGroupTotals(group.transactions).income) }}</span>
                          <span v-if="getGroupTotals(group.transactions).expense > 0">- {{ formatRp(getGroupTotals(group.transactions).expense) }}</span>
                        </div>
                        <PhCaretDown :size="14" weight="fill" class="text-accent transition-transform duration-700"
                          :class="{ '-rotate-180': isGroupCollapsed(group.date) }" />
                      </div>

                      <div v-show="!isGroupCollapsed(group.date)" class="bg-white border border-slate-200/80 rounded-b-2xl rounded-t-none divide-y divide-slate-100 overflow-hidden">
                        <Transaction v-for="t in group.transactions" :key="t.id" :transaction="t" :hide-values="false"
                          @click="handleTransactionClick" @edit="handleSwipeEdit" @delete="handleSwipeDelete" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </Teleport>
      </div>

      <!-- ADD CATEGORY MODAL -->
      <Teleport to="body">
        <div v-if="showAddCategory"
          class="fixed inset-0 z-[105] bg-slate-50 flex flex-col w-full max-w-md mx-auto shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250">
          <div
            class="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <button @click="showAddCategory = false"
              class="p-1 rounded-full text-accent text-xs font-bold flex items-center gap-1 cursor-pointer">
              <PhArrowLeft :size="24" weight="bold" />
            </button>
            <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Tambah Kategori</h3>
            <div class="w-12"></div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-20">
            <div class="space-y-1.5">
              <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Nama Kategori</label>
              <input v-model="newCategoryName" type="text" placeholder="Nama Kategori (cth: Belanja)"
                class="w-full bg-white border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent font-bold text-slate-800" />
            </div>

            <div class="space-y-1.5 flex-1 flex flex-col min-h-0">
              <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Pilih Icon</label>
              <div class="flex-1 overflow-y-auto p-3 bg-white border border-slate-200 rounded-2xl space-y-4 no-scrollbar">
                <div v-for="g in ICON_GROUPS" :key="g.group" class="space-y-1.5">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">{{ g.group
                    }}</span>
                  <div class="grid grid-cols-4 gap-2">
                    <button v-for="ico in g.icons" :key="ico.name" type="button" @click="newCategoryIcon = ico.name"
                      class="aspect-square rounded-2xl flex items-center justify-center transition-all hover:bg-slate-100 border border-slate-100 shrink-0 cursor-pointer"
                      :class="newCategoryIcon === ico.name ? 'bg-accent-light border-accent text-accent ring-2 ring-accent' : 'text-slate-600 bg-slate-50/50'"
                      :title="ico.label">
                      <component :is="resolveIcon(ico.name)" :size="28" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="p-4 bg-white border-t border-slate-200 shrink-0">
            <button @click="handleCreateCategory" :disabled="savingCategory || !newCategoryName.trim()"
              class="w-full py-3 bg-accent text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-accent/25 disabled:opacity-40 disabled:pointer-events-none cursor-pointer">
              Simpan Kategori
            </button>
          </div>
        </div>
      </Teleport>
    </div>
  </Teleport>
</template>
