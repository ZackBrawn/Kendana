<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { api } from '../api';
import { PhArrowUpRight, PhArrowDownLeft, PhHandshake, PhCoins, PhX, PhPencil, PhTrash, PhCaretLeft, PhCaretRight, PhCaretDown } from "@phosphor-icons/vue";
import { Chart, registerables } from 'chart.js';
import { useDate } from '../composables/useDate';
import { formatRp, resolveIcon } from '../utils/helpers';
import DateFilter from '../components/DateFilter.vue';
import Transaction from '../components/Transaction.vue';

Chart.register(...registerables);

const activeTypeId = ref(2); 
const breakdownType = ref('category');
const transactions = ref([]);

const showTinjauDropdown = ref(false);
const selectTinjauOption = (option) => {
  breakdownType.value = option;
  showTinjauDropdown.value = false;
};
const loading = ref(true);

const {
  filterType,
  currentDate,
  customStartDate,
  customEndDate,
  presetsList,
  dateRange,
  periodLabel,
  hasPrevMonth,
  hasNextMonth,
  prevMonth,
  nextMonth
} = useDate();

const showFilterModal = ref(false);

const loadData = async () => {
  loading.value = true;
  try {
    transactions.value = await api.getTransactions();
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const getGroupTotals = (transactions) => {
  let income = 0;
  let expense = 0;
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

const getWalletName = (tx) => {
  if (tx.type_id === 2 || tx.type_id === 5) {
    return tx.source_wallet_name || 'Dompet Utama';
  } else {
    return tx.dest_wallet_name || 'Dompet Utama';
  }
};

const getWalletIcon = (tx) => {
  if (tx.type_id === 2 || tx.type_id === 5) {
    return tx.source_wallet?.icon || 'PhWallet';
  } else {
    return tx.destination_wallet?.icon || 'PhWallet';
  }
};

const filteredTransactions = computed(() => {
  return transactions.value.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d >= dateRange.value.start && d <= dateRange.value.end;
  });
});

const breakdownData = computed(() => {
  const filtered = filteredTransactions.value.filter(t => t.type_id === activeTypeId.value);
  const groups = {};
  let totalSum = 0;

  filtered.forEach(t => {
    const key = breakdownType.value === 'category'
      ? (t.category_name || 'Lainnya')
      : getWalletName(t);

    const icon = breakdownType.value === 'category'
      ? (t.category_icon || 'PhFolder')
      : getWalletIcon(t);

    if (!groups[key]) {
      groups[key] = {
        name: key,
        icon: icon,
        total: 0,
        transactions: []
      };
    }
    groups[key].total += parseFloat(t.amount);
    groups[key].transactions.push(t);
    totalSum += parseFloat(t.amount);
  });

  return Object.values(groups)
    .map(g => ({
      ...g,
      percentage: totalSum > 0 ? Math.round((g.total / totalSum) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total);
});

const totalBreakdownSum = computed(() => {
  return breakdownData.value.reduce((sum, item) => sum + item.total, 0);
});

const CHART_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#06b6d4'  // Cyan
];

const chartCanvas = ref(null);
let chartInstance = null;
const highlightedIndex = ref(null);
const hoveredIndex = ref(null);

const setHoveredItem = (index) => {
  hoveredIndex.value = index;
};

const selectedItemHistory = ref(null);
const collapsedGroups = ref({});

const TYPE_ITEMS = [
  { id: 2, tab: 'Expense', label: 'Pengeluaran', icon: PhArrowUpRight, activeBg: 'bg-accent text-white', color: '#e11d48' },
  { id: 1, tab: 'Income', label: 'Pemasukan', icon: PhArrowDownLeft, activeBg: 'bg-accent text-white', color: '#059669' },
  { id: 4, tab: 'Debt', label: 'Hutang', icon: PhHandshake, activeBg: 'bg-accent text-white', color: '#d97706' },
  { id: 5, tab: 'Receivable', label: 'Piutang', icon: PhCoins, activeBg: 'bg-accent text-white', color: '#0d9488' }
];

const updateChart = () => {
  if (!chartCanvas.value) return;

  const data = breakdownData.value;
  const labels = data.map(d => d.name);
  const totals = data.map(d => d.total);
  const colors = data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  if (chartInstance) {
    chartInstance.destroy();
  }

  if (data.length === 0) return;

  chartInstance = new Chart(chartCanvas.value, {
    type: 'doughnut',
    plugins: [
      {
        id: 'customRadius',
        beforeDraw: (chart) => {
          const meta = chart.getDatasetMeta(0);
          if (meta && meta.data) {
            meta.data.forEach((element, i) => {
              if (element.$originalOuterRadius === undefined) {
                element.$originalOuterRadius = element.outerRadius;
              }
              if (highlightedIndex.value === i) {
                element.outerRadius = element.$originalOuterRadius + 14;
              } else {
                element.outerRadius = element.$originalOuterRadius;
              }
            });
          }
        }
      },
      {
        id: 'slicePercentages',
        afterDatasetsDraw: (chart) => {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);
          if (meta && meta.data) {
            meta.data.forEach((element, i) => {
              const dataVal = breakdownData.value[i];
              if (!dataVal) return;
              
              const pct = Math.round(dataVal.percentage);
              if (pct < 2) return; 
              
              const startAngle = element.startAngle;
              const endAngle = element.endAngle;
              const midAngle = startAngle + (endAngle - startAngle) / 2;
              
              const innerRadius = element.innerRadius;
              const outerRadius = element.outerRadius;
              const radius = innerRadius + (outerRadius - innerRadius) / 2;
              
              const textX = element.x + Math.cos(midAngle) * radius;
              const textY = element.y + Math.sin(midAngle) * radius;
              
              ctx.save();
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 8px Inter, sans-serif';
              ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
              ctx.shadowBlur = 2;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(pct + '%', textX, textY);
              ctx.restore();
            });
          }
        }
      }
    ],
    data: {
      labels,
      datasets: [{
        data: totals,
        backgroundColor: colors,
        hoverBackgroundColor: colors,
        borderWidth: 0,
        borderColor: 'transparent',
        hoverOffset: 0,
        hoverBorderWidth: 0,
        hoverBorderColor: 'transparent'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: 20
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          if (highlightedIndex.value === index) {
            highlightedIndex.value = null;
          } else {
            highlightedIndex.value = index;
          }
        } else {
          highlightedIndex.value = null;
        }
      },
      onHover: (event, elements) => {
        if (event.native && event.native.target) {
          event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        }
        if (elements.length > 0) {
          hoveredIndex.value = elements[0].index;
        } else {
          hoveredIndex.value = null;
        }
      },
      plugins: {
        legend: {
          display: false
        },
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

              titleLines.forEach(title => {
                innerHtml += `<div style="font-family: Inter, sans-serif; font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${title}</div>`;
              });

              bodyLines.forEach((body, i) => {
                const colors = tooltipModel.labelColors[i];
                let style = `background: ${colors.backgroundColor};`;
                style += ` border-color: ${colors.borderColor};`;
                style += ' border-width: 1px;';
                style += ' display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px;';
                const span = `<span style="${style}"></span>`;
                innerHtml += `<div style="font-family: Inter, sans-serif; font-size: 11px; font-weight: 600; color: #475569; display: flex; align-items: center;">${span}${body}</div>`;
              });

              tooltipEl.innerHTML = innerHtml;
            }

            const position = context.chart.canvas.getBoundingClientRect();
            tooltipEl.style.opacity = 1;
            tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX - (tooltipEl.offsetWidth / 2) + 'px';
            tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY - tooltipEl.offsetHeight - 12 + 'px';
          },
          callbacks: {
            label: (context) => {
              return ` ${context.label}: ${formatRp(context.raw)}`;
            }
          }
        }
      },
      cutout: '58%'
    }
  });
};

const updateChartHighlight = () => {
  if (!chartInstance) return;
  if (highlightedIndex.value !== null) {
    chartInstance.setActiveElements([{ datasetIndex: 0, index: highlightedIndex.value }]);
  } else if (hoveredIndex.value !== null) {
    chartInstance.setActiveElements([{ datasetIndex: 0, index: hoveredIndex.value }]);
  } else {
    chartInstance.setActiveElements([]);
  }
  chartInstance.update();
};

watch([highlightedIndex, hoveredIndex], () => {
  updateChartHighlight();
});

watch([breakdownData], () => {
  highlightedIndex.value = null;
  hoveredIndex.value = null;
  nextTick(updateChart);
});

const openHistory = (item) => {
  selectedItemHistory.value = item;
  collapsedGroups.value = {};
};

const isGroupCollapsed = (dateStr) => !!collapsedGroups.value[dateStr];
const toggleGroup = (dateStr) => {
  collapsedGroups.value[dateStr] = !collapsedGroups.value[dateStr];
};

const itemGroupedTransactions = computed(() => {
  if (!selectedItemHistory.value) return [];
  const groups = {};
  selectedItemHistory.value.transactions.forEach(t => {
    const dateStr = t.date ? t.date.split('T')[0] : 'Unknown';
    if (!groups[dateStr]) {
      groups[dateStr] = {
        date: dateStr,
        transactions: []
      };
    }
    groups[dateStr].transactions.push(t);
  });
  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
});

const formatGroupDateLabel = (dateStr) => {
  if (!dateStr) return '';
  const dateObj = new Date(dateStr);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = days[dateObj.getDay()];

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const mName = months[dateObj.getMonth()];

  return `${dayName}, ${dateObj.getDate()} ${mName} ${dateObj.getFullYear()}`;
};

const openFilterModal = () => {
  showFilterModal.value = true;
};

const handleApplyPreset = (presetId) => {
  filterType.value = presetId;
  showFilterModal.value = false;
};

const handleApplyCustom = ({ start, end }) => {
  filterType.value = 'custom';
  customStartDate.value = start;
  customEndDate.value = end;
  showFilterModal.value = false;
};

const handleTransactionClick = (transaction) => {
  window.dispatchEvent(new CustomEvent('open-detail-modal', {
    detail: { transaction }
  }));
};

const handleSwipeEdit = (transaction) => {
  window.dispatchEvent(new CustomEvent('open-edit-modal', {
    detail: { transaction }
  }));
};

const showDeleteConfirm = ref(false);
const transactionToDelete = ref(null);

const handleSwipeDelete = (transaction) => {
  transactionToDelete.value = transaction;
  showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
  showDeleteConfirm.value = false;
  if (!transactionToDelete.value) return;

  loading.value = true;
  try {
    await api.deleteTransaction(transactionToDelete.value.id);
    
    if (selectedItemHistory.value) {
      selectedItemHistory.value.transactions = selectedItemHistory.value.transactions.filter(
        t => t.id !== transactionToDelete.value.id
      );
      if (selectedItemHistory.value.transactions.length === 0) {
        selectedItemHistory.value = null;
      }
    }
    await loadData();
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
    transactionToDelete.value = null;
  }
};

const handleGlobalClick = (event) => {
  if (
    chartCanvas.value &&
    !chartCanvas.value.contains(event.target) &&
    !event.target.closest('[id^="breakdown-item-"]')
  ) {
    highlightedIndex.value = null;
  }
};

onMounted(async () => {
  window.addEventListener('click', handleGlobalClick);
  await loadData();
  nextTick(updateChart);
});

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick);
  const tooltipEl = document.getElementById('chartjs-tooltip');
  if (tooltipEl) {
    tooltipEl.remove();
  }
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-1.5 w-full py-1 shrink-0">
      <button v-for="item in TYPE_ITEMS" :key="item.id" type="button" @click="activeTypeId = item.id" :class="[
        'rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center border shadow-2xs h-8 cursor-pointer transition-all duration-300',
        activeTypeId === item.id
          ? item.activeBg + ' border-transparent px-3.5 gap-1.5 flex-1'
          : 'text-slate-600 border-none w-8 flex-none'
      ]">
        <component :is="item.icon" :size="24" />
        <span v-if="activeTypeId === item.id">{{ item.label }}</span>
      </button>
    </div>

    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1 relative z-30">
        <div class="relative inline-block select-none z-40 w-24">
          <button type="button" @click="breakdownType = (breakdownType === 'category' ? 'wallet' : 'category')"
            class="w-full pr-5 py-1.5 text-xs font-bold text-slate-700 bg-accent-light rounded-lg cursor-pointer hover:border-accent hover:shadow-2xs transition-all flex items-center justify-center relative">
            <span>{{ breakdownType === 'category' ? 'Kategori' : 'Dompet' }}</span>
            <div class="pointer-events-none absolute top-0 bottom-0 right-0 px-1.5 flex items-center text-accent">
              <PhCaretRight :size="16" weight="fill" />
            </div>
          </button>
        </div>
      </div>

      <div class="flex items-center gap-1 bg-accent-light rounded-lg px-2 py-1.5 text-slate-700 select-none shadow-3xs">
        <button type="button" @click="prevMonth(transactions)" :disabled="!hasPrevMonth(transactions)"
          :class="['p-0.5 rounded-full transition-all cursor-pointer text-accent', !hasPrevMonth(transactions) ? 'opacity-35 cursor-not-allowed' : '']"
          aria-label="Previous Month">
          <PhCaretLeft :size="16" weight="bold" />
        </button>
        <span @click="openFilterModal"
          class="text-[10px] font-black uppercase tracking-wider cursor-pointer hover:text-accent selection:bg-transparent transition-colors px-1">
          {{ periodLabel }}
        </span>
        <button type="button" @click="nextMonth(transactions)" :disabled="!hasNextMonth(transactions)"
          :class="['p-0.5 rounded-full transition-all cursor-pointer text-accent', !hasNextMonth(transactions) ? 'opacity-35 cursor-not-allowed' : '']"
          aria-label="Next Month">
          <PhCaretRight :size="16" weight="bold" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="animate-pulse space-y-4">
      <div class="h-48 bg-slate-200 rounded-2xl"></div>
      <div class="h-20 bg-slate-200 rounded-2xl"></div>
    </div>

    <div v-else-if="breakdownData.length === 0"
      class="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-slate-400 text-xs font-medium">
      Belum ada riwayat transaksi
    </div>

    <div v-else class="space-y-4">
      <div class="mb-6">
        <div class="relative w-80 h-80 mx-auto flex items-center justify-center">
          <canvas ref="chartCanvas"></canvas>
          <div class="absolute flex flex-col items-center justify-center text-center pointer-events-none px-6 w-full">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total</span>
            <span class="text-sm font-black tracking-tight mt-1"
              :class="activeTypeId === 1 || activeTypeId === 5 ? 'text-emerald-600' : 'text-rose-500'">
              {{ activeTypeId === 1 || activeTypeId === 5 ? '+' : '-' }}{{ formatRp(totalBreakdownSum) }}
            </span>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <div v-for="(item, index) in breakdownData" :key="item.name"
          :id="'breakdown-item-' + index"
          @click="openHistory(item)"
          @mouseenter="setHoveredItem(index)"
          @mouseleave="setHoveredItem(null)"
          class="flex items-center justify-between p-2 rounded-2xl border transition-all duration-200 active:scale-[0.99] select-none relative cursor-pointer"
          :class="[
            highlightedIndex === index
              ? 'bg-accent-light border-accent/30 shadow-xs scale-[1.01]'
              : (hoveredIndex === index ? 'bg-slate-50 border-slate-200/80 shadow-3xs' : 'bg-white border-slate-100 hover:border-slate-200/50 hover:bg-slate-50/30')
          ]">

          <div class="flex items-center gap-2.5 flex-1 min-w-0">
            <span
              class="w-10 h-10 rounded-lg bg-slate-100 border border-slate-100 flex items-center justify-center shadow-3xs shrink-0">
              <component :is="resolveIcon(item.icon)" v-if="resolveIcon(item.icon)" :size="32" class="text-slate-700" />
              <span v-else class="text-xs">{{ item.icon || '📁' }}</span>
            </span>
            <span class="text-xs font-black text-slate-800 truncate flex-1 min-w-0">{{ item.name }}</span>
          </div>

          <div class="flex items-center justify-center gap-1.5 shrink-0 px-2 w-16">
            <span class="w-1.5 h-1.5 rounded-full shrink-0"
              :style="{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }"></span>
            <span class="text-[10px] text-slate-450 font-bold shrink-0 whitespace-nowrap">{{
              item.percentage }}%</span>
          </div>

          <div class="text-right shrink-0 min-w-[90px] pl-2">
            <span class="text-xs font-black"
              :class="activeTypeId === 1 || activeTypeId === 5 ? 'text-emerald-600' : 'text-rose-500'">
              {{ activeTypeId === 1 || activeTypeId === 5 ? '+' : '-' }}{{ formatRp(item.total) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- History Dialog overlay -->
    <Teleport to="body">
      <div v-if="selectedItemHistory" class="fixed inset-0 z-[45] flex justify-center animate-in fade-in duration-200"
        @click.self="selectedItemHistory = null">
        <div
          class="w-full max-w-md bg-slate-50 flex flex-col h-[100dvh] shadow-2xl relative animate-in slide-in-from-bottom duration-250 overflow-hidden">

          <div
            class="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
            <div class="flex items-center gap-2.5">
              <span
                class="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-2xs">
                <component :is="resolveIcon(selectedItemHistory.icon)" v-if="resolveIcon(selectedItemHistory.icon)"
                  :size="18" class="text-slate-700" />
                <span v-else>{{ selectedItemHistory.icon }}</span>
              </span>
              <div>
                <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider truncate max-w-[180px]">{{
                  selectedItemHistory.name }}</h4>
                <p class="text-[10px] text-slate-455 font-bold mt-0.5">Riwayat Lengkap</p>
              </div>
            </div>

            <button @click="selectedItemHistory = null"
              class="w-10 h-10 flex items-center justify-center text-accent transition-colors cursor-pointer">
              <PhX :size="18" weight="bold" />
            </button>
          </div>

          <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-200/60 flex justify-between items-center shrink-0">
            <span class="text-[10px] font-black text-slate-455 uppercase tracking-wider">Total</span>
            <span class="text-xs font-black"
              :class="activeTypeId === 1 || activeTypeId === 5 ? 'text-emerald-600' : 'text-rose-500'">
              {{ activeTypeId === 1 || activeTypeId === 5 ? '+' : '-' }}{{ formatRp(selectedItemHistory.total) }}
            </span>
          </div>

          <div class="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3.5 bg-slate-50">
            <div v-for="group in itemGroupedTransactions" :key="group.date" class="mb-3.5 last:mb-0 shadow-md rounded-2xl">
              <div @click="toggleGroup(group.date)"
                class="flex items-center justify-between cursor-pointer select-none px-3.5 py-2.5 bg-slate-100 border border-slate-200/50 hover:bg-slate-200/50 transition-all"
                :class="isGroupCollapsed(group.date) ? 'rounded-xl' : 'rounded-t-xl border-b-0'">
                <span class="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                  {{ formatGroupDateLabel(group.date) }}
                </span>
                <div class="flex items-center gap-x-2.5 ml-auto mr-2.5 text-[9px] font-black tracking-wider text-slate-500">
                  <span v-if="(activeTypeId === 1 || activeTypeId === 5) && getGroupTotals(group.transactions).income > 0">
                    + {{ formatRp(getGroupTotals(group.transactions).income) }}
                  </span>
                  <span v-if="(activeTypeId === 2 || activeTypeId === 4) && getGroupTotals(group.transactions).expense > 0">
                    - {{ formatRp(getGroupTotals(group.transactions).expense) }}
                  </span>
                </div>
                <PhCaretDown :size="14" weight="fill" class="text-accent transition-transform duration-700"
                  :class="{ '-rotate-180': isGroupCollapsed(group.date) }" />
              </div>

              <div v-show="!isGroupCollapsed(group.date)"
                class="bg-white border border-slate-200/80 rounded-b-2xl rounded-t-none divide-y divide-slate-100 shadow-xs overflow-hidden">
                <Transaction
                  v-for="t in group.transactions"
                  :key="t.id"
                  :transaction="t"
                  :hide-values="false"
                  @click="handleTransactionClick"
                  @edit="handleSwipeEdit"
                  @delete="handleSwipeDelete"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm"
        class="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-slate-100 text-center space-y-4">
          <div
            class="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-500">
            <PhTrash :size="24" />
          </div>
          <div class="space-y-1">
            <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider">Hapus Transaksi?</h4>
            <p class="text-[10px] text-slate-455 font-bold leading-normal">Tindakan ini tidak bisa dibatalkan.</p>
          </div>
          <div class="flex gap-2">
            <button @click="showDeleteConfirm = false"
              class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer">
              Batal
            </button>
            <button @click="confirmDelete"
              class="flex-1 py-2 bg-rose-500 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-xs cursor-pointer">
              Hapus
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modular Date Filter Modal -->
    <DateFilter
      v-if="showFilterModal"
      :filter-type="filterType"
      :presets-list="presetsList"
      :start-date="customStartDate"
      :end-date="customEndDate"
      @close="showFilterModal = false"
      @apply-preset="handleApplyPreset"
      @apply-custom="handleApplyCustom"
    />

  </div>
</template>
