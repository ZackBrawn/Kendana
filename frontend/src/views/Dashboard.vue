<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api, showToast } from '../api';
import { PhWarning, PhEye, PhEyeSlash, PhCaretLeft, PhCaretRight, PhCaretDown, PhCaretUp, PhPiggyBank } from "../utils/icons";
import RoughChart from '../components/RoughChart.vue';
import { useDate } from '../composables/useDate';
import { formatRp, resolveIcon, groupTransactionsByDate, calculateGroupTotals, formatGroupDate } from '../utils/helpers';
import DateFilter from '../components/DateFilter.vue';
import Transaction from '../components/Transaction.vue';
import SketchCard from '../components/SketchCard.vue';
import SketchDivider from '../components/SketchDivider.vue';
import BudgetProgressBar from '../components/BudgetProgressBar.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';
import SketchButton from '../components/SketchButton.vue';
import SketchBox from '../components/SketchBox.vue';

const router = useRouter();

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
  periodLabel
} = useDate();

const dateFilterRef = ref(null);
const visibleTransactionLimit = ref(50);
const transactionPageSize = 50;
let latestRangeRequest = 0;

const requestDashboardRange = async (offset = 0, append = false) => {
  const requestId = ++latestRangeRequest;
  const { start, end } = dateRange.value;
  const rangeOptions = {
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
    offset,
    limit: transactionPageSize
  };

  try {
    const data = await api.getDashboard(rangeOptions);
    if (requestId !== latestRangeRequest) return;

    if (append && data.rangeSummary && dashboard.value?.rangeSummary) {
      dashboard.value = {
        ...dashboard.value,
        recentTransactions: [...dashboard.value.recentTransactions, ...data.recentTransactions],
        rangeSummary: data.rangeSummary
      };
      visibleTransactionLimit.value += data.recentTransactions.length;
    } else {
      dashboard.value = data;
      visibleTransactionLimit.value = transactionPageSize;
    }
  } catch (err) {
    if (requestId === latestRangeRequest) {
      console.error(err);
      showToast(err.message, 'error');
    }
  }
};

watch([filterType, currentDate, customStartDate, customEndDate], () => {
  visibleTransactionLimit.value = transactionPageSize;
  requestDashboardRange();
});

const loadDashboard = async () => {
  loading.value = true;
  try {
    const [, bRes, me] = await Promise.all([
      requestDashboardRange(),
      api.getBudgets(),
      api.getMe()
    ]);
    budgets.value = bRes;

    if (me && me.user) {
      userSettings.value.dashboard_show_budget = me.user.dashboard_show_budget !== false;
      userSettings.value.dashboard_budget_expanded = !!me.user.dashboard_budget_expanded;
      isBudgetsCollapsed.value = !userSettings.value.dashboard_budget_expanded;
    }

  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
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

const filteredData = computed(() => {
  const rangeSummary = dashboard.value?.rangeSummary;
  if (rangeSummary) {
    return {
      transactions: dashboard.value.recentTransactions || [],
      income: rangeSummary.income,
      expense: rangeSummary.expense,
      trend: rangeSummary.trend,
      transactionCount: rangeSummary.transactionCount,
      hasPreviousTransactions: rangeSummary.hasPreviousTransactions,
      hasNextTransactions: rangeSummary.hasNextTransactions
    };
  }

  const recentTransactions = dashboard.value?.recentTransactions || [];
  const { start, end } = dateRange.value;
  const transactions = [];
  const dailyTotals = new Map();
  let income = 0;
  let expense = 0;
  let hasPreviousTransactions = false;
  let hasNextTransactions = false;

  for (const transaction of recentTransactions) {
    if (!transaction.date) continue;
    const date = new Date(transaction.date);
    if (Number.isNaN(date.getTime())) continue;
    if (date < start) {
      hasPreviousTransactions = true;
      continue;
    }
    if (date > end) {
      hasNextTransactions = true;
      continue;
    }

    transactions.push(transaction);
    const amount = parseFloat(transaction.amount || 0);
    if (transaction.type_name === 'Income') {
      income += amount;
      const dateKey = transaction.date.split('T')[0];
      dailyTotals.set(dateKey, (dailyTotals.get(dateKey) || 0) + amount);
    } else if (transaction.type_name === 'Expense') {
      expense += amount;
      const dateKey = transaction.date.split('T')[0];
      dailyTotals.set(dateKey, (dailyTotals.get(dateKey) || 0) - amount);
    }
  }

  const dates = [...dailyTotals.keys()].sort();
  let trend = dates.map(date => dailyTotals.get(date));
  if (trend.length === 0) trend = [0, 0];
  else if (trend.length === 1) trend.unshift(0);

  const maxPoints = 48;
  if (trend.length > maxPoints) {
    trend = Array.from({ length: maxPoints }, (_, index) =>
      trend[Math.round(index * (trend.length - 1) / (maxPoints - 1))]
    );
  }

  return {
    transactions,
    income,
    expense,
    trend,
    transactionCount: transactions.length,
    hasPreviousTransactions,
    hasNextTransactions
  };
});

const filteredTransactions = computed(() => filteredData.value.transactions);
const filteredIncome = computed(() => filteredData.value.income);
const filteredExpense = computed(() => filteredData.value.expense);
const filteredNet = computed(() => {
  return filteredIncome.value - filteredExpense.value;
});
const hasPreviousTransactions = computed(() => filteredData.value.hasPreviousTransactions);
const hasNextTransactions = computed(() => filteredData.value.hasNextTransactions);
const filteredTransactionCount = computed(() => filteredData.value.transactionCount);

// Sparkline rough (RoughChart reaktif terhadap data & warna)
const netChartColor = computed(() => (filteredNet.value >= 0 ? '#34d399' : '#fb7185'));
const netTrendData = computed(() => filteredData.value.trend);

const openFilterModal = () => {
  dateFilterRef.value?.open();
};

const handleApplyPreset = (presetId) => {
  filterType.value = presetId;
};

const handleApplyCustom = ({ start, end }) => {
  filterType.value = 'custom';
  customStartDate.value = start;
  customEndDate.value = end;
};

const handleReload = () => loadDashboard();

const viewTransaction = (transaction) => {
  window.dispatchEvent(new CustomEvent('open-detail-modal', {
    detail: { transaction }
  }));
};

const groupedTransactions = computed(() =>
  groupTransactionsByDate(filteredTransactions.value.slice(0, visibleTransactionLimit.value))
);

const loadMoreTransactions = () => {
  if (dashboard.value?.rangeSummary) {
    requestDashboardRange(dashboard.value.recentTransactions.length, true);
  } else {
    visibleTransactionLimit.value += transactionPageSize;
  }
};

const changeMonth = (offset) => {
  const monthDate = filterType.value === 'month'
    ? new Date(currentDate.value)
    : filterType.value === 'last_month'
      ? new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
      : new Date();
  monthDate.setDate(1);
  monthDate.setMonth(monthDate.getMonth() + offset);
  currentDate.value = monthDate;
  filterType.value = 'month';
};

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
      <SketchBox class="h-32 bg-slate-200"></SketchBox>
      <SketchBox class="h-20 bg-slate-200"></SketchBox>
      <SketchBox class="h-40 bg-slate-200"></SketchBox>
    </div>

    <template v-else-if="dashboard">
      <!-- Total Net Worth Card (Light Gradient) -->
      <SketchCard class="relative overflow-hidden bg-accent p-5 text-white flex items-center justify-between">
        <div class="relative z-10 flex-1 space-y-2">
          <!-- Header: Period Selector on left, Hide/Show eye icon on right -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button @click="changeMonth(-1)" :disabled="!hasPreviousTransactions"
                :class="['p-1 rounded-full transition-all cursor-pointer flex items-center justify-center text-white', !hasPreviousTransactions ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10']"
                aria-label="Previous Month">
                <PhCaretLeft :size="14" />
              </button>
              <span @click="openFilterModal"
                class="text-xs font-black uppercase tracking-wider cursor-pointer hover:underline text-white/95 selection:bg-transparent">
                {{ periodLabel }}
              </span>
              <button @click="changeMonth(1)" :disabled="!hasNextTransactions"
                :class="['p-1 rounded-full transition-all cursor-pointer flex items-center justify-center text-white', !hasNextTransactions ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10']"
                aria-label="Next Month">
                <PhCaretRight :size="14" />
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

        <!-- Line chart rough sebagai aksen background -->
        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-[45%] h-[55%] opacity-35 pointer-events-none pr-3 z-0">
          <RoughChart type="spark" filled :data="netTrendData" :color="netChartColor" />
          <!-- Fade mask on the left edge of the chart to blend with the card background -->
          <div class="absolute inset-y-0 left-0 w-20 pointer-events-none" style="background: linear-gradient(to right, var(--accent) 0%, transparent 100%)"></div>
        </div>
      </SketchCard>

      <!-- Budget Widget -->
      <SketchCard v-if="userSettings.dashboard_show_budget && dashboardBudgets.length > 0" class="bg-white p-4 shadow-md space-y-3">
        <div class="flex items-center justify-between">
          <h4 @click="isBudgetsCollapsed = !isBudgetsCollapsed" class="text-[10px] font-black text-accent uppercase tracking-wider flex items-center gap-1.5 cursor-pointer select-none">
            <PhPiggyBank :size="12" /> Anggaran Aktif
            <component :is="isBudgetsCollapsed ? PhCaretDown : PhCaretUp" :size="16"  class="text-accent" />
          </h4>
          <router-link to="/budgets" class="text-[10px] text-accent font-black uppercase tracking-wider hover:underline">
            Semua
          </router-link>
        </div>

        <SketchDivider />

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
              rough
              :limit-amount="b.limit_amount"
              :spent-amount="b.spent_amount"
              :percentage-used="b.percentage_used"
            />
          </div>
        </div>
      </SketchCard>

      <!-- Recent Transactions -->
      <div class="space-y-2">

        <SketchBox v-if="groupedTransactions.length === 0"
          class="bg-white p-6 text-center text-slate-400 text-xs font-medium">
          Tidak ada transaksi pada rentang waktu ini.
        </SketchBox>

        <div v-else class="space-y-3.5">
          <!-- Daily Group Container -->
          <SketchCard v-for="group in groupedTransactions" :key="group.date" class="mb-3.5 shadow-md">

            <!-- Date Header (Collapsible) -->
            <div @click="toggleGroup(group.date)"
              class="flex items-center justify-between cursor-pointer select-none px-3.5 py-2.5 bg-slate-100 border border-slate-200/50 hover:bg-slate-200/50 transition-all"
              :class="isCollapsed(group.date) ? '' : 'border-b-0'">
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
              <PhCaretDown :size="14" class="text-accent transition-transform duration-700"
                :class="{ '-rotate-180': isCollapsed(group.date) }" />
            </div>

            <SketchDivider />

            <!-- Day Transactions Wrapper (Collapsible) -->
            <div v-show="!isCollapsed(group.date)"
              class="bg-white divide-y divide-slate-100 overflow-hidden">
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
          </SketchCard>
        </div>

        <div v-if="visibleTransactionLimit < filteredTransactionCount" class="space-y-2 text-center">
          <p class="text-[10px] text-slate-400 font-semibold">
            Menampilkan {{ Math.min(visibleTransactionLimit, filteredTransactionCount) }} dari {{ filteredTransactionCount }} transaksi
          </p>
          <SketchButton @click="loadMoreTransactions"
            class="px-4 py-2 text-[10px] font-bold text-slate-700 bg-white rounded-xl">
            Tampilkan 50 transaksi lagi
          </SketchButton>
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
      ref="dateFilterRef"
      :filter-type="filterType"
      :presets-list="presetsList"
      :start-date="customStartDate"
      :end-date="customEndDate"
      @apply-preset="handleApplyPreset"
      @apply-custom="handleApplyCustom"
    />

  </div>
</template>
