<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { api, showToast } from '../api';
import { PhWarning, PhEye, PhEyeSlash, PhCaretLeft, PhCaretRight, PhCaretDown, PhCaretUp, PhPiggyBank } from "@phosphor-icons/vue";
import { Chart, registerables } from 'chart.js';
import { useDate } from '../composables/useDate';
import { formatRp, resolveIcon, groupTransactionsByDate, calculateGroupTotals, formatGroupDate } from '../utils/helpers';
import DateFilter from '../components/DateFilter.vue';
import Transaction from '../components/Transaction.vue';
import BudgetProgressBar from '../components/BudgetProgressBar.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';

const router = useRouter();

Chart.register(...registerables);

const dashboard = ref(null);
const budgets = ref([]);
const loading = ref(true);
const userSettings = ref({
  dashboard_show_budget: true,
  dashboard_budget_expanded: false
});

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

const loadDashboard = async () => {
  loading.value = true;
  try {
    const data = await api.getDashboard();
    dashboard.value = data;
    const bRes = await api.getBudgets();
    budgets.value = bRes;
    
    // Get user preferences
    const me = await api.getMe();
    if (me && me.user) {
      userSettings.value.dashboard_show_budget = me.user.dashboard_show_budget !== false;
      userSettings.value.dashboard_budget_expanded = !!me.user.dashboard_budget_expanded;
      isBudgetsCollapsed.value = !userSettings.value.dashboard_budget_expanded;
    }

  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
    scheduleNetChart();
  }
};

const isBudgetsCollapsed = ref(true);
const goToBudgetDetail = (id) => {
  router.push({ path: '/budgets', query: { openDetail: id } });
};
const hideValues = ref(localStorage.getItem('dashboard_hide_values') === 'true');
const toggleHideValues = () => {
  hideValues.value = !hideValues.value;
  localStorage.setItem('dashboard_hide_values', hideValues.value);
};

const filteredTransactions = computed(() => {
  if (!dashboard.value || !dashboard.value.recentTransactions) return [];
  const { start, end } = dateRange.value;
  return dashboard.value.recentTransactions.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d >= start && d <= end;
  });
});

const filteredIncome = computed(() => {
  return filteredTransactions.value
    .filter(t => t.type_name === 'Income')
    .reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
});

const filteredExpense = computed(() => {
  return filteredTransactions.value
    .filter(t => t.type_name === 'Expense')
    .reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
});

const filteredNet = computed(() => {
  return filteredIncome.value - filteredExpense.value;
});

const netLineChartCanvas = ref(null);
let netChartInstance = null;

const netTrendData = computed(() => {
  if (!filteredTransactions.value || filteredTransactions.value.length === 0) {
    return [0, 0];
  }
  
  const txs = [...filteredTransactions.value].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const map = {};
  txs.forEach(t => {
    if (!t.date) return;
    const dateStr = t.date.split('T')[0];
    if (!map[dateStr]) {
      map[dateStr] = 0;
    }
    const amt = parseFloat(t.amount || 0);
    if (t.type_name === 'Income') {
      map[dateStr] += amt;
    } else if (t.type_name === 'Expense') {
      map[dateStr] -= amt;
    }
  });

  const dates = Object.keys(map).sort();
  const trend = dates.map(d => map[d]);
  
  if (trend.length === 0) {
    trend.push(0, 0);
  } else if (trend.length === 1) {
    trend.unshift(0);
  }

  return trend;
});

const updateNetChart = () => {
  const canvas = netLineChartCanvas.value;
  if (!canvas) return;

  if (netChartInstance) {
    netChartInstance.destroy();
    netChartInstance = null;
  }

  const isPositive = filteredNet.value >= 0;
  const lineColor = isPositive ? '#34d399' : '#fb7185';
  const fillColor = isPositive ? 'rgba(52, 211, 153, 0.18)' : 'rgba(251, 113, 133, 0.18)';

  netChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: netTrendData.value.map((_, i) => i),
      datasets: [{
        data: netTrendData.value,
        borderColor: lineColor,
        borderWidth: 1.8,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
        backgroundColor: fillColor
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });
};

const scheduleNetChart = () => {
  nextTick(() => {
    requestAnimationFrame(updateNetChart);
  });
};

watch([netTrendData, filteredNet], () => {
  if (loading.value) return;
  scheduleNetChart();
});

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

const handleReload = () => loadDashboard();

const viewTransaction = (transaction) => {
  window.dispatchEvent(new CustomEvent('open-detail-modal', {
    detail: { transaction }
  }));
};

const groupedTransactions = computed(() => groupTransactionsByDate(filteredTransactions.value));

const getGroupTotals = (transactions) => calculateGroupTotals(transactions);

const collapsedGroups = ref({});
const toggleGroup = (dateStr) => {
  collapsedGroups.value[dateStr] = !collapsedGroups.value[dateStr];
};
const isCollapsed = (dateStr) => !!collapsedGroups.value[dateStr];

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
    showToast('Transaksi berhasil dihapus', 'success');
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    loading.value = false;
    transactionToDelete.value = null;
  }
};

const formatGroupDateLabel = (dateStr) => formatGroupDate(dateStr);

const dashboardBudgets = computed(() => {
  return budgets.value
    .filter(b => b.show_on_dashboard)
    .sort((a, b) => b.percentage_used - a.percentage_used);
});

const getProgressColorClass = (percent) => {
  if (percent >= 100) return 'bg-rose-500';
  if (percent >= 80) return 'bg-amber-500';
  if (netChartInstance) {
    netChartInstance.destroy();
    netChartInstance = null;
  }
  return 'bg-emerald-500';
};

onMounted(() => {
  loadDashboard();
  window.addEventListener('reload-data', handleReload);
});

onUnmounted(() => {
  window.removeEventListener('reload-data', handleReload);
});
</script>

<template>
  <div class="space-y-4">

    <!-- Loading Skeleton -->
    <div v-if="loading" class="animate-pulse space-y-3">
      <div class="h-32 bg-slate-200 rounded-xl"></div>
      <div class="h-20 bg-slate-200 rounded-2xl"></div>
      <div class="h-40 bg-slate-200 rounded-2xl"></div>
    </div>

    <template v-else-if="dashboard">
      <!-- Total Net Worth Card (Light Gradient) -->
      <div class="relative overflow-hidden rounded-xl bg-accent p-5 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-between">
        <div class="relative z-10 flex-1 space-y-2">
          <!-- Header: Period Selector on left, Hide/Show eye icon on right -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button @click="prevMonth(dashboard.recentTransactions)" :disabled="!hasPrevMonth(dashboard.recentTransactions)"
                :class="['p-1 rounded-full transition-all cursor-pointer flex items-center justify-center text-white', !hasPrevMonth(dashboard.recentTransactions) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10']"
                aria-label="Previous Month">
                <PhCaretLeft :size="14" weight="bold" />
              </button>
              <span @click="openFilterModal"
                class="text-xs font-black uppercase tracking-wider cursor-pointer hover:underline text-white/95 selection:bg-transparent">
                {{ periodLabel }}
              </span>
              <button @click="nextMonth(dashboard.recentTransactions)" :disabled="!hasNextMonth(dashboard.recentTransactions)"
                :class="['p-1 rounded-full transition-all cursor-pointer flex items-center justify-center text-white', !hasNextMonth(dashboard.recentTransactions) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10']"
                aria-label="Next Month">
                <PhCaretRight :size="14" weight="bold" />
              </button>
            </div>

            <!-- Hide/Show values toggle -->
            <button @click="toggleHideValues"
              class="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Sembunyikan/Tampilkan Nominal">
              <component :is="hideValues ? PhEyeSlash : PhEye" :size="20" />
            </button>
          </div>

          <!-- Net total, left-aligned -->
          <h2
            :class="['text-2xl font-black tracking-tight mt-1 transition-colors duration-200', filteredNet >= 0 ? 'text-emerald-300' : 'text-rose-300']">
            {{ hideValues ? '***' : (filteredNet >= 0 ? '+' : '') + formatRp(filteredNet) }}
          </h2>

          <!-- Income and Expense, side-by-side on a single line -->
          <div class="pt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/80 font-medium">
            <p class="whitespace-nowrap">
              Pemasukan: <span class="font-bold text-emerald-300 ml-0.5">{{ hideValues ? '***' : '+' +
                formatRp(filteredIncome) }}</span>
            </p>
            <p class="whitespace-nowrap">
              Pengeluaran: <span class="font-bold text-rose-300 ml-0.5">{{ hideValues ? '***' : '-' +
                formatRp(filteredExpense) }}</span>
            </p>
          </div>
        </div>

        <!-- Line chart container on the right side as background accent -->
        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-[45%] h-[55%] opacity-35 pointer-events-none pr-3 z-0">
          <canvas ref="netLineChartCanvas"></canvas>
          <!-- Fade mask on the left edge of the chart to blend with the card background -->
          <div class="absolute inset-y-0 left-0 w-20 pointer-events-none" style="background: linear-gradient(to right, var(--color-primary) 0%, transparent 100%)"></div>
        </div>
      </div>

      <!-- Budget Widget -->
      <div v-if="userSettings.dashboard_show_budget && dashboardBudgets.length > 0" class="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-md space-y-3">
        <div class="flex items-center justify-between">
          <h4 @click="isBudgetsCollapsed = !isBudgetsCollapsed" class="text-[10px] font-black text-accent uppercase tracking-wider flex items-center gap-1.5 cursor-pointer select-none">
            <PhPiggyBank :size="12" /> Anggaran Aktif
            <component :is="isBudgetsCollapsed ? PhCaretDown : PhCaretUp" :size="16" weight="fill"  class="text-accent" />
          </h4>
          <router-link to="/budgets" class="text-[10px] text-accent font-black uppercase tracking-wider hover:underline">
            Semua
          </router-link>
        </div>
        <div v-if="!isBudgetsCollapsed" class="space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div v-for="b in dashboardBudgets.slice(0, 3)" :key="b.id" class="space-y-1.5 py-1">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-sm shrink-0" v-if="!resolveIcon(b.icon)">{{ b.icon }}</span>
                <component :is="resolveIcon(b.icon)" v-if="resolveIcon(b.icon)" :size="16" class="text-accent shrink-0" />
                <span class="font-bold text-slate-700 truncate text-[11px]">{{ b.name }}</span>
              </div>
            </div>
            <BudgetProgressBar
              variant="detailed"
              rounded="full"
              :limit-amount="b.limit_amount"
              :spent-amount="b.spent_amount"
              :percentage-used="b.percentage_used"
            />
          </div>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="space-y-2">

        <div v-if="groupedTransactions.length === 0"
          class="bg-white border border-slate-200/80 rounded-2xl p-6 text-center text-slate-400 text-xs font-medium">
          Tidak ada transaksi pada rentang waktu ini.
        </div>

        <div v-else class="space-y-3.5">
          <!-- Daily Group Container -->
          <div v-for="group in groupedTransactions" :key="group.date" class="mb-3.5 shadow-md rounded-2xl">

            <!-- Date Header (Collapsible) -->
            <div @click="toggleGroup(group.date)"
              class="flex items-center justify-between cursor-pointer select-none px-3.5 py-2.5 bg-slate-100 border border-slate-200/50 hover:bg-slate-200/50 transition-all"
              :class="isCollapsed(group.date) ? 'rounded-xl' : 'rounded-t-xl border-b-0'">
              <span class="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                {{ formatGroupDateLabel(group.date) }}
              </span>
              <div class="flex items-center gap-x-2.5 ml-auto mr-2.5 text-[9px] font-black tracking-wider text-slate-500">
                <span v-if="getGroupTotals(group.transactions).income > 0">
                  + {{ hideValues ? '***' : formatRp(getGroupTotals(group.transactions).income) }}
                </span>
                <span v-if="getGroupTotals(group.transactions).expense > 0">
                  - {{ hideValues ? '***' : formatRp(getGroupTotals(group.transactions).expense) }}
                </span>
              </div>
              <PhCaretDown :size="14" weight="fill" class="text-accent transition-transform duration-700"
                :class="{ '-rotate-180': isCollapsed(group.date) }" />
            </div>

            <!-- Day Transactions Wrapper (Collapsible) -->
            <div v-show="!isCollapsed(group.date)"
              class="bg-white border border-slate-200/80 rounded-b-2xl rounded-t-none divide-y divide-slate-100 shadow-xs overflow-hidden">
              <Transaction
                v-for="t in group.transactions"
                :key="t.id"
                :transaction="t"
                :hide-values="hideValues"
                @click="viewTransaction"
                @edit="handleSwipeEdit"
                @delete="handleSwipeDelete"
              />
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- Delete Confirmation Modal -->
    <ConfirmDeleteModal
      v-model:show="showDeleteConfirm"
      title="Konfirmasi Hapus"
      message="Apakah Anda yakin ingin menghapus transaksi ini?"
      confirm-text="Ya, Hapus"
      cancel-text="Batal"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false; transactionToDelete = null"
    />

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
