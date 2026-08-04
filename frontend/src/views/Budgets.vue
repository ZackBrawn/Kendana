<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { api, showToast } from '../api';
import { 
  PhArrowLeft, PhPlus, PhPencil, PhTrash, PhCalendar, PhCheck, PhX, 
  PhWarning, PhFolder, PhTag, PhPiggyBank, PhInfo, PhCaretDown, PhCaretUp,
  PhMagnifyingGlass, PhWallet
} from "@phosphor-icons/vue";
import { formatRp, resolveIcon } from '../utils/helpers';
import { AVAILABLE_ICONS } from '../utils/iconList';
import Calendar from '../components/Calendar.vue';
import Transaction from '../components/Transaction.vue';

const route = useRoute();
const showPeriodPage = ref(false);
const showStartDateModal = ref(false);
const showEndDateModal = ref(false);

const periodOptions = [
  { value: 'daily', label: 'Harian (Daily)' },
  { value: 'weekly', label: 'Mingguan (Weekly)' },
  { value: 'monthly', label: 'Bulanan (Monthly)' },
  { value: 'yearly', label: 'Tahunan (Yearly)' },
  { value: 'custom', label: 'Kustom (Sekali Pakai)' }
];

// Page States
const budgets = ref([]);
const wallets = ref([]);
const categories = ref([]);
const loading = ref(true);

// Selection States for Forms
const showFormModal = ref(false);
const isEditing = ref(false);
const editingBudgetId = ref(null);

// Form Fields
const name = ref('');
const limitAmount = ref('');
const iconName = ref('PhFolder');
const walletScope = ref('all'); // all | single
const walletId = ref('');
const categoryScope = ref('all'); // all | specific
const selectedCategoryIds = ref([]); // array of ids
const periodType = ref('monthly'); // daily | weekly | monthly | yearly | custom
const periodMultiplier = ref(1);
const startDate = ref(new Date().toISOString().split('T')[0]);
const isPermanent = ref(true);
const endDate = ref('');
const showOnDashboard = ref(true);
const notifyOnThreshold = ref(false);
const notifyThresholdPercent = ref(80);
const notes = ref('');
const limitAmountDisplay = computed({
  get() {
    if (limitAmount.value === undefined || limitAmount.value === null || limitAmount.value === '') return '';
    return limitAmount.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  },
  set(val) {
    const clean = val.replace(/\D/g, '').slice(0, 12);
    limitAmount.value = clean ? parseFloat(clean) : '';
  }
});

// UI Page Overlays
const showIconPage = ref(false);
const showWalletPage = ref(false);
const showCategoryPage = ref(false);

const searchIconQuery = ref('');
const searchCategoryQuery = ref('');

// Load all required data
const loadData = async () => {
  loading.value = true;
  try {
    const [bRes, wRes, cRes] = await Promise.all([
      api.getBudgets(),
      api.getWallets(),
      api.getCategories()
    ]);
    budgets.value = bRes;
    wallets.value = wRes;
    categories.value = cRes;
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    loading.value = false;
  }
};

// Computed lists
const expenseCategories = computed(() => {
  return categories.value.filter(c => c.type_id === 2 || c.type_name === 'Expense');
});

const liquidWallets = computed(() => {
  return wallets.value.filter(w => w.group_type !== 'System');
});

const selectedWalletObj = computed(() => {
  return liquidWallets.value.find(w => w.id === parseInt(walletId.value));
});

// Filters for full page selectors
const filteredIcons = computed(() => {
  if (!searchIconQuery.value.trim()) return AVAILABLE_ICONS;
  return AVAILABLE_ICONS.filter(icon => 
    icon.label.toLowerCase().includes(searchIconQuery.value.toLowerCase()) ||
    icon.name.toLowerCase().includes(searchIconQuery.value.toLowerCase())
  );
});

const filteredExpenseCategories = computed(() => {
  const list = expenseCategories.value;
  if (!searchCategoryQuery.value.trim()) return list;
  return list.filter(c => 
    c.category_name.toLowerCase().includes(searchCategoryQuery.value.toLowerCase())
  );
});

// Selectors helper
const selectIcon = (icon) => {
  iconName.value = icon;
  showIconPage.value = false;
};

// Reset form
const resetForm = () => {
  name.value = '';
  limitAmount.value = '';
  iconName.value = 'PhFolder';
  walletScope.value = 'all';
  walletId.value = '';
  categoryScope.value = 'all';
  selectedCategoryIds.value = [];
  periodType.value = 'monthly';
  periodMultiplier.value = 1;
  startDate.value = new Date().toISOString().split('T')[0];
  isPermanent.value = true;
  endDate.value = '';
  showOnDashboard.value = true;
  notifyOnThreshold.value = false;
  notifyThresholdPercent.value = 80;
  notes.value = '';
  isEditing.value = false;
  editingBudgetId.value = null;
  
  showIconPage.value = false;
  showWalletPage.value = false;
  showCategoryPage.value = false;
  showPeriodPage.value = false;
  showStartDateModal.value = false;
  showEndDateModal.value = false;
  searchIconQuery.value = '';
  searchCategoryQuery.value = '';
};

// Open create form
const openCreateModal = () => {
  resetForm();
  isEditing.value = false;
  showFormModal.value = true;
};

// Open edit form
const openEditModal = (budget) => {
  resetForm();
  isEditing.value = true;
  editingBudgetId.value = budget.id;
  name.value = budget.name;
  limitAmount.value = budget.limit_amount;
  iconName.value = budget.icon || 'PhFolder';
  walletScope.value = budget.wallet_scope;
  walletId.value = budget.wallet_id || '';
  categoryScope.value = budget.category_scope;
  selectedCategoryIds.value = budget.categories ? budget.categories.map(c => c.id) : [];
  periodType.value = budget.period_type;
  periodMultiplier.value = budget.period_multiplier;
  startDate.value = budget.start_date.split('T')[0];
  isPermanent.value = budget.is_permanent;
  endDate.value = budget.end_date ? budget.end_date.split('T')[0] : '';
  showOnDashboard.value = budget.show_on_dashboard;
  notifyOnThreshold.value = budget.notify_on_threshold;
  notifyThresholdPercent.value = budget.notify_threshold_percent || 80;
  notes.value = budget.notes || '';
  showFormModal.value = true;
};

// Toggle categories selection
const toggleCategorySelection = (catId) => {
  const idx = selectedCategoryIds.value.indexOf(catId);
  if (idx > -1) {
    selectedCategoryIds.value.splice(idx, 1);
  } else {
    selectedCategoryIds.value.push(catId);
  }
};

// Save (create or update) budget
const handleSaveBudget = async () => {
  if (!name.value.trim()) {
    showToast('Nama budget wajib diisi', 'error');
    return;
  }
  if (!limitAmount.value || parseFloat(limitAmount.value) <= 0) {
    showToast('Limit nominal harus lebih besar dari 0', 'error');
    return;
  }
  if (walletScope.value === 'single' && !walletId.value) {
    showToast('Silakan pilih dompet terlebih dahulu', 'error');
    return;
  }
  if (categoryScope.value === 'specific' && selectedCategoryIds.value.length === 0) {
    showToast('Pilih minimal satu kategori', 'error');
    return;
  }
  if (!startDate.value) {
    showToast('Tanggal mulai wajib diisi', 'error');
    return;
  }
  if (periodType.value === 'custom' && !endDate.value) {
    showToast('Tanggal berakhir wajib diisi untuk periode kustom', 'error');
    return;
  }
  if (!isPermanent.value && endDate.value && new Date(endDate.value) <= new Date(startDate.value)) {
    showToast('Tanggal berakhir harus setelah tanggal mulai', 'error');
    return;
  }

  const payload = {
    name: name.value,
    limit_amount: parseFloat(limitAmount.value),
    icon: iconName.value,
    wallet_scope: walletScope.value,
    wallet_id: walletScope.value === 'single' ? parseInt(walletId.value) : null,
    category_scope: categoryScope.value,
    category_ids: categoryScope.value === 'specific' ? selectedCategoryIds.value : [],
    period_type: periodType.value,
    period_multiplier: periodType.value === 'custom' ? 1 : parseInt(periodMultiplier.value),
    start_date: new Date(startDate.value).toISOString(),
    is_permanent: periodType.value === 'custom' ? false : isPermanent.value,
    end_date: (!isPermanent.value || periodType.value === 'custom') && endDate.value ? new Date(endDate.value).toISOString() : null,
    show_on_dashboard: showOnDashboard.value,
    notify_on_threshold: notifyOnThreshold.value,
    notify_threshold_percent: notifyOnThreshold.value ? parseInt(notifyThresholdPercent.value) : null,
    notes: notes.value
  };

  try {
    if (isEditing.value) {
      await api.updateBudget(editingBudgetId.value, payload);
      showToast('Anggaran berhasil diperbarui', 'success');
    } else {
      await api.createBudget(payload);
      showToast('Anggaran baru berhasil dibuat', 'success');
    }
    showFormModal.value = false;
    loadData();
    if (showDetailModal.value && selectedBudget.value && selectedBudget.value.id === editingBudgetId.value) {
      openBudgetDetails(editingBudgetId.value);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Open detail modal
const openBudgetDetails = async (budgetId) => {
  showDetailModal.value = true;
  loadingDetails.value = true;
  try {
    const detail = await api.getBudgetDetail(budgetId);
    selectedBudget.value = detail;
    transactions.value = detail.transactions || [];
  } catch (err) {
    showToast(err.message, 'error');
    showDetailModal.value = false;
  } finally {
    loadingDetails.value = false;
  }
};

// Delete budget
const handleDeleteBudget = async (id) => {
  if (!confirm('Apakah Anda yakin ingin menghapus anggaran ini?')) return;
  try {
    await api.deleteBudget(id);
    showToast('Anggaran berhasil dihapus', 'success');
    showDetailModal.value = false;
    selectedBudget.value = null;
    loadData();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const showDeleteConfirm = ref(false);
const transactionToDelete = ref(null);

const viewTransaction = (transaction) => {
  window.dispatchEvent(new CustomEvent('open-detail-modal', {
    detail: { transaction }
  }));
};

const handleSwipeEdit = (transaction) => {
  window.dispatchEvent(new CustomEvent('open-edit-modal', {
    detail: { transaction }
  }));
};

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
    await loadData();
    if (selectedBudget.value) {
      await openBudgetDetails(selectedBudget.value.id);
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    loading.value = false;
  }
};

// Format date local
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const collapsedGroups = ref({});
const toggleGroup = (date) => {
  collapsedGroups.value[date] = !collapsedGroups.value[date];
};
const isCollapsed = (date) => !!collapsedGroups.value[date];

const getGroupTotals = (txs) => {
  let expense = 0;
  txs.forEach(t => {
    const amt = parseFloat(t.amount || 0);
    if (t.type_name === 'Expense') {
      expense += amt;
    }
  });
  return { expense };
};

const formatGroupDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Hari Ini';
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'Kemarin';
  }

  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return d.toLocaleDateString('id-ID', options);
};

const groupedTransactions = computed(() => {
  if (transactions.value.length === 0) return [];

  const groups = {};
  transactions.value.forEach(t => {
    if (!t.date) return;
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
});

// Helpers for remaining time
const getRemainingLabel = (b) => {
  if (!b.current_cycle || !b.current_cycle.active) {
    return 'Tidak Aktif';
  }
  if (b.period_type === 'custom') {
    return `${b.remaining_days} hari tersisa`;
  }
  if (b.remaining_days !== null) {
    return `${b.remaining_days} hari lagi di siklus ini`;
  }
  return 'Aktif';
};

// Helper for status bar color
const getProgressColorClass = (percent) => {
  if (percent >= 100) return 'bg-rose-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const getProgressBarBgClass = (percent) => {
  if (percent >= 100) return 'bg-rose-100';
  if (percent >= 80) return 'bg-amber-100';
  return 'bg-emerald-100';
};

const getProgressTextClass = (percent) => {
  if (percent >= 100) return 'text-rose-600 font-extrabold';
  if (percent >= 80) return 'text-amber-600 font-extrabold';
  return 'text-emerald-600 font-extrabold';
};

const getProgressBorderClass = (percent) => {
  if (percent >= 100) return 'border-rose-100 bg-rose-50/40';
  if (percent >= 80) return 'border-amber-100 bg-amber-50/40';
  return 'border-emerald-100 bg-emerald-50/40';
};

// Helper for category names formatting
const getCategoriesLabel = (b) => {
  if (b.category_scope === 'all') return 'Semua Kategori';
  if (!b.categories || b.categories.length === 0) return 'Tidak ada kategori';
  return b.categories.map(c => c.name).join(', ');
};

// Format cycle labels
const getPeriodLabel = (b) => {
  const dict = {
    daily: 'Harian',
    weekly: 'Mingguan',
    monthly: 'Bulanan',
    yearly: 'Tahunan',
    custom: 'Kustom (Sekali Pakai)'
  };
  const typeStr = dict[b.period_type] || b.period_type;
  if (b.period_type === 'custom') return typeStr;
  return `${typeStr} (Setiap ${b.period_multiplier} ${b.period_type === 'daily' ? 'Hari' : b.period_type === 'weekly' ? 'Minggu' : b.period_type === 'monthly' ? 'Bulan' : 'Tahun'})`;
};

const selectedBudgetDetails = ref(null);
const selectedTransaction = ref(null);
const selectedBudget = ref(null);
const showDetailModal = ref(false);
const transactions = ref([]);
const loadingDetails = ref(false);

onMounted(async () => {
  await loadData();
  if (route.query.openDetail) {
    const id = parseInt(route.query.openDetail);
    if (!isNaN(id)) {
      openBudgetDetails(id);
    }
  }
});
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <router-link to="/other" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <PhArrowLeft :size="20" weight="bold" />
        </router-link>
        <h2 class="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Anggaran & Budget</h2>
      </div>
      <button @click="openCreateModal"
        class="px-3 py-1.5 bg-accent bg-accent-hover text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer">
        + Buat Anggaran
      </button>
    </div>

    <!-- Loading Screen -->
    <div v-if="loading" class="animate-pulse space-y-3">
      <div class="h-28 bg-white border border-slate-200 rounded-2xl"></div>
      <div class="h-28 bg-white border border-slate-200 rounded-2xl"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="budgets.length === 0" class="bg-white border border-slate-200/60 rounded-2xl p-8 text-center shadow-md space-y-3">
      <div class="w-16 h-16 bg-indigo-50 text-accent rounded-2xl flex items-center justify-center mx-auto shadow-3xs">
        <PhPiggyBank :size="36" weight="bold" />
      </div>
      <div class="space-y-1">
        <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider">Belum Ada Anggaran</h4>
        <p class="text-[11px] text-slate-500">Buat budget limit pengeluaran bulanan atau kustom untuk mengontrol keuangan Anda secara efisien.</p>
      </div>
    </div>

    <!-- Budget List Grid -->
    <div v-else class="space-y-3">
      <div v-for="b in budgets" :key="b.id" @click="openBudgetDetails(b.id)"
        class="bg-white border border-slate-200/60 rounded-2xl p-3.5 shadow-md hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col gap-3 relative overflow-hidden animate-in fade-in duration-200">
        
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-accent-light text-accent flex items-center justify-center text-lg shrink-0">
              <component :is="resolveIcon(b.icon)" v-if="resolveIcon(b.icon)" :size="24" />
              <span v-else>{{ b.icon }}</span>
            </div>
            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-800 tracking-tight truncate">{{ b.name }}</h4>
              <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5">
                {{ getPeriodLabel(b) }} • {{ b.wallet_scope === 'all' ? 'Semua Dompet' : (b.wallet_name || 'Satu Dompet') }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[10px] font-black text-slate-800 tracking-tight">{{ formatRp(b.spent_amount) }}</span>
            <span class="text-[9px] text-slate-400 block mt-0.5">dari {{ formatRp(b.limit_amount) }}</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="space-y-1">
          <div class="w-full h-10 rounded-full overflow-hidden bg-slate-100 relative shadow-inner">
            <!-- Background text (visible when not covered by progress) -->
            <div class="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-bold text-slate-500 select-none pointer-events-none">
              <span>Limit: {{ formatRp(b.limit_amount) }}</span>
              <span>{{ Math.round(b.percentage_used) }}%</span>
              <span>Sisa: {{ formatRp(Math.max(0, b.limit_amount - b.spent_amount)) }}</span>
            </div>

            <!-- Progress Fill (Using bg-accent) -->
            <div class="h-full rounded-full transition-all duration-500 bg-accent relative overflow-hidden"
              :style="{ width: Math.min(100, b.percentage_used) + '%' }">
              <!-- Foreground text (visible inside the filled progress bar, clipped) -->
              <div class="absolute top-0 bottom-0 left-0 flex items-center justify-between px-3 text-[10px] font-bold text-white select-none pointer-events-none"
                :style="{ width: (100 / Math.max(1, Math.min(100, b.percentage_used))) * 100 + '%' }">
                <span>Limit: {{ formatRp(b.limit_amount) }}</span>
                <span>{{ Math.round(b.percentage_used) }}%</span>
                <span>Sisa: {{ formatRp(Math.max(0, b.limit_amount - b.spent_amount)) }}</span>
              </div>
            </div>
          </div>
          <!-- Remaining Cycle Date Info beneath it -->
          <div class="flex items-center justify-end text-[9px] text-slate-400 font-semibold gap-1 pt-0.5">
            <PhCalendar :size="10" />
            {{ getRemainingLabel(b) }}
          </div>
        </div>

        <!-- Short Description Notes if exists -->
        <p v-if="b.notes" class="text-[10px] text-slate-500 leading-normal italic line-clamp-1 border-t border-slate-100 pt-2">
          "{{ b.notes }}"
        </p>

      </div>
    </div>

    <!-- DETAIL BUDGET MODAL -->
    <Teleport to="body">
      <div v-if="showDetailModal" class="fixed inset-0 z-50 bg-transparent flex justify-center">
      <div class="w-full max-w-md bg-slate-50 flex flex-col h-full overflow-hidden animate-in slide-in-from-bottom duration-250 ease-out">
        
        <header class="p-4 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-20">
          <button @click="showDetailModal = false" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center">
            <PhArrowLeft :size="20" weight="bold" />
          </button>
          <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Detail Anggaran</h3>
          <div class="flex items-center gap-1.5">
            <button @click="openEditModal(selectedBudget)" class="p-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer">
              <PhPencil :size="14" weight="bold" />
            </button>
            <button @click="handleDeleteBudget(selectedBudget.id)" class="p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 flex items-center justify-center cursor-pointer">
              <PhTrash :size="14" weight="bold" />
            </button>
          </div>
        </header>

        <div v-if="loadingDetails" class="p-6 flex flex-col items-center justify-center gap-2">
          <div class="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-accent animate-spin"></div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Memuat data...</span>
        </div>

        <div v-else-if="selectedBudget" class="flex-1 overflow-y-auto p-4 space-y-4">
          <!-- Overview Card -->
          <div class="border rounded-2xl p-4 flex flex-col gap-3.5" :class="getProgressBorderClass(selectedBudget.percentage_used)">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center text-xl shrink-0">
                <component :is="resolveIcon(selectedBudget.icon)" v-if="resolveIcon(selectedBudget.icon)" :size="26" />
                <span v-else>{{ selectedBudget.icon }}</span>
              </div>
              <div class="min-w-0">
                <h4 class="text-sm font-black text-slate-800 tracking-tight truncate">{{ selectedBudget.name }}</h4>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{{ getPeriodLabel(selectedBudget) }}</p>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="selectedBudget.notes" class="bg-white/50 border border-slate-100 rounded-xl p-2.5 text-[10px] text-slate-600 leading-normal">
              <div class="font-bold text-slate-700 uppercase tracking-wider text-[8px] mb-0.5 flex items-center gap-1">
                <PhInfo :size="10" /> Catatan:
              </div>
              "{{ selectedBudget.notes }}"
            </div>

            <!-- Progress Info -->
            <div class="space-y-1.5">
              <div class="w-full h-8 rounded-xl overflow-hidden bg-slate-100 relative shadow-inner">
                <!-- Background text -->
                <div class="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-bold text-slate-500 select-none pointer-events-none">
                  <span>Limit: {{ formatRp(selectedBudget.limit_amount) }}</span>
                  <span>{{ Math.round(selectedBudget.percentage_used) }}%</span>
                  <span>Sisa: {{ formatRp(Math.max(0, selectedBudget.limit_amount - selectedBudget.spent_amount)) }}</span>
                </div>

                <!-- Progress Fill -->
                <div class="h-full rounded-xl transition-all duration-500 bg-accent relative overflow-hidden"
                  :style="{ width: Math.min(100, selectedBudget.percentage_used) + '%' }">
                  <!-- Foreground text -->
                  <div class="absolute top-0 bottom-0 left-0 flex items-center justify-between px-3 text-[10px] font-bold text-white select-none pointer-events-none"
                    :style="{ width: (100 / Math.max(1, Math.min(100, selectedBudget.percentage_used))) * 100 + '%' }">
                    <span>Limit: {{ formatRp(selectedBudget.limit_amount) }}</span>
                    <span>{{ Math.round(selectedBudget.percentage_used) }}%</span>
                    <span>Sisa: {{ formatRp(Math.max(0, selectedBudget.limit_amount - selectedBudget.spent_amount)) }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between text-[9px] font-bold">
                <span :class="getProgressTextClass(selectedBudget.percentage_used)">{{ selectedBudget.percentage_used.toFixed(1) }}% Terpakai</span>
                <span class="text-slate-500">{{ getRemainingLabel(selectedBudget) }}</span>
              </div>
            </div>
          </div>

          <!-- Configuration Scope Info -->
          <div class="bg-slate-50 border border-slate-200/50 rounded-2xl p-3 text-[10px] text-slate-600 space-y-2">
            <div class="flex justify-between items-center py-1 border-b border-slate-100">
              <span class="font-bold text-slate-400 uppercase tracking-wider">Cakupan Dompet:</span>
              <span class="font-extrabold text-slate-800">
                {{ selectedBudget.wallet_scope === 'all' ? 'Semua Dompet' : (selectedBudget.wallet_name || 'Dompet Spesifik') }}
              </span>
            </div>
            <div class="flex justify-between items-start py-1 border-b border-slate-100 gap-4">
              <span class="font-bold text-slate-400 uppercase tracking-wider shrink-0">Kategori Anggaran:</span>
              <span class="font-extrabold text-slate-800 text-right leading-snug">
                {{ getCategoriesLabel(selectedBudget) }}
              </span>
            </div>
            <div class="flex justify-between items-center py-1">
              <span class="font-bold text-slate-400 uppercase tracking-wider">Siklus Aktif:</span>
              <span class="font-extrabold text-slate-800">
                {{ formatDate(selectedBudget.current_cycle?.start) }} – {{ formatDate(selectedBudget.current_cycle?.end) }}
              </span>
            </div>
          </div>

          <!-- Transaction List In current Period -->
          <div class="space-y-2">

            <div v-if="transactions.length === 0" class="bg-slate-50 border border-slate-200/40 rounded-2xl p-6 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Tidak ada pengeluaran terdeteksi dalam siklus budget ini.
            </div>

            <div v-else class="space-y-3.5">
              <!-- Daily Group Container -->
              <div v-for="group in groupedTransactions" :key="group.date" class="mb-3.5 shadow-xs rounded-2xl overflow-hidden border border-slate-200/50">

                <!-- Date Header (Collapsible) -->
                <div @click="toggleGroup(group.date)"
                  class="flex items-center justify-between cursor-pointer select-none px-3 py-2 bg-slate-100/80 hover:bg-slate-200/40 transition-all"
                  :class="isCollapsed(group.date) ? 'rounded-2xl' : 'rounded-t-2xl border-b border-slate-200/50'">
                  <span class="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                    {{ formatGroupDateLabel(group.date) }}
                  </span>
                  <div class="flex items-center gap-x-2.5 ml-auto mr-2.5 text-[9px] font-black tracking-wider text-slate-500">
                    <span v-if="getGroupTotals(group.transactions).income > 0" class="text-income">
                      + {{ formatRp(getGroupTotals(group.transactions).income) }}
                    </span>
                    <span v-if="getGroupTotals(group.transactions).expense > 0" class="text-expense">
                      - {{ formatRp(getGroupTotals(group.transactions).expense) }}
                    </span>
                  </div>
                  <component :is="isCollapsed(group.date) ? PhCaretDown : PhCaretUp" :size="12" class="text-slate-400" />
                </div>

                <!-- Day Transactions Wrapper (Collapsible) -->
                <div v-show="!isCollapsed(group.date)"
                  class="bg-white rounded-b-2xl rounded-t-none divide-y divide-slate-100 overflow-hidden">
                  <Transaction
                    v-for="t in group.transactions"
                    :key="t.id"
                    :transaction="t"
                    :hide-values="false"
                    @click="viewTransaction"
                    @edit="handleSwipeEdit"
                    @delete="handleSwipeDelete"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>



      </div>
      </div>
    </Teleport>

    <!-- FORM CREATE / EDIT (FULL PAGE SELECTOR & FORMS) -->
    <Teleport to="body">
      <div v-if="showFormModal" class="fixed inset-0 z-50 bg-slate-50 flex flex-col w-full max-w-md mx-auto animate-in slide-in-from-bottom duration-250 ease-out">
      
      <header class="p-4 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-20">
        <button @click="showFormModal = false" class="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50">
          <PhX :size="20" weight="bold" />
        </button>
        <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">
          {{ isEditing ? 'Edit Anggaran' : 'Buat Anggaran Baru' }}
        </h3>
        <button @click="handleSaveBudget" class="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
          Simpan
        </button>
      </header>

      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- Main Form Fields -->
        <div class="space-y-1 bg-white border border-slate-200/60 rounded-2xl px-4 divide-y divide-slate-100">
          
          <!-- Nama Budget -->
          <div class="flex items-center justify-between gap-3 py-3">
            <label class="text-xs font-normal text-slate-600 shrink-0">Nama Budget *</label>
            <input v-model="name" type="text" placeholder="Misal: Belanja Bulanan"
              class="py-1 border-none focus:ring-0 text-xs focus:outline-none bg-transparent w-48 text-right px-0" />
          </div>

          <!-- Ikon Anggaran -->
          <div class="flex items-center justify-between gap-3 py-3">
            <label class="text-xs font-normal text-slate-600 shrink-0">Ikon Anggaran</label>
            <button type="button" @click="showIconPage = true" 
              class="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center bg-transparent hover:bg-slate-100 cursor-pointer shrink-0">
              <component :is="resolveIcon(iconName)" v-if="resolveIcon(iconName)" :size="20" class="text-accent" />
            </button>
          </div>

          <!-- Budget Limit -->
          <div class="flex items-center justify-between gap-3 py-3">
            <label class="text-xs font-normal text-slate-600 shrink-0">Batas Limit (Rp) *</label>
            <input v-model="limitAmountDisplay" type="text" placeholder="0"
              class="py-1 border-none focus:ring-0 text-sm font-bold text-rose-500 focus:outline-none bg-transparent text-right w-44 px-0" />
          </div>

          <!-- Wallet Scope Selection -->
          <div class="flex items-center justify-between gap-3 py-3">
            <label class="text-xs font-normal text-slate-600 shrink-0">Cakupan Dompet</label>
            <div class="flex gap-1.5 shrink-0">
              <button type="button" @click="walletScope = 'all'"
                class="px-2.5 py-1.5 border rounded-lg text-xs font-normal transition-all"
                :class="walletScope === 'all' ? 'border-accent text-accent bg-accent/5' : 'border-slate-200 text-slate-600 bg-transparent'">
                Semua
              </button>
              <button type="button" @click="walletScope = 'single'"
                class="px-2.5 py-1.5 border rounded-lg text-xs font-normal transition-all"
                :class="walletScope === 'single' ? 'border-accent text-accent bg-accent/5' : 'border-slate-200 text-slate-600 bg-transparent'">
                Dompet Spesifik
              </button>
            </div>
          </div>

          <!-- Custom Single Wallet Picker Card -->
          <div v-if="walletScope === 'single'" class="flex items-center justify-between gap-3 py-3 animate-in slide-in-from-top-2 duration-150">
            <label class="text-xs font-normal text-slate-600 shrink-0">Dompet Terpilih *</label>
            <div @click="showWalletPage = true" 
              class="flex items-center justify-end gap-1.5 cursor-pointer max-w-[60%] select-none">
              <div class="flex items-center gap-1.5 min-w-0" v-if="selectedWalletObj">
                <component :is="resolveIcon(selectedWalletObj.icon)" v-if="resolveIcon(selectedWalletObj.icon)" :size="14" class="text-slate-500 shrink-0" />
                <span class="text-xs text-slate-800 truncate">{{ selectedWalletObj.name }}</span>
              </div>
              <span class="text-xs text-slate-400" v-else>Pilih Dompet...</span>
              <PhCaretDown :size="14" class="text-slate-400 shrink-0" />
            </div>
          </div>

          <!-- Category Scope Selection -->
          <div class="flex items-center justify-between gap-3 py-3">
            <label class="text-xs font-normal text-slate-600 shrink-0">Cakupan Kategori</label>
            <div class="flex gap-1.5 shrink-0">
              <button type="button" @click="categoryScope = 'all'"
                class="px-2.5 py-1.5 border rounded-lg text-xs font-normal transition-all"
                :class="categoryScope === 'all' ? 'border-accent text-accent bg-accent/5' : 'border-slate-200 text-slate-600 bg-transparent'">
                Semua
              </button>
              <button type="button" @click="categoryScope = 'specific'"
                class="px-2.5 py-1.5 border rounded-lg text-xs font-normal transition-all"
                :class="categoryScope === 'specific' ? 'border-accent text-accent bg-accent/5' : 'border-slate-200 text-slate-600 bg-transparent'">
                Kategori Spesifik
              </button>
            </div>
          </div>

          <!-- Custom Category Picker Card -->
          <div v-if="categoryScope === 'specific'" class="flex items-center justify-between gap-3 py-3 animate-in slide-in-from-top-2 duration-150">
            <label class="text-xs font-normal text-slate-600 shrink-0">Kategori Terpilih *</label>
            <div @click="showCategoryPage = true" 
              class="flex items-center justify-end gap-1.5 cursor-pointer max-w-[60%] select-none">
              <div class="flex items-center gap-1.5 min-w-0" v-if="selectedCategoryIds.length > 0">
                <template v-if="selectedCategoryIds.length === 1">
                  <component :is="resolveIcon(categories.find(c => c.id === selectedCategoryIds[0])?.icon)" v-if="resolveIcon(categories.find(c => c.id === selectedCategoryIds[0])?.icon)" :size="14" class="text-slate-500 shrink-0" />
                  <span class="text-xs text-slate-800 truncate">{{ categories.find(c => c.id === selectedCategoryIds[0])?.category_name }}</span>
                </template>
                <template v-else>
                  <span class="text-xs text-slate-800 truncate">{{ selectedCategoryIds.length }} Kategori</span>
                </template>
              </div>
              <span class="text-xs text-slate-400" v-else>Pilih Kategori...</span>
              <PhCaretDown :size="14" class="text-slate-400 shrink-0" />
            </div>
          </div>

          <!-- Period Selection -->
          <div class="flex items-center justify-between gap-3 py-3">
            <label class="text-xs font-normal text-slate-600 shrink-0">Tipe Periode *</label>
            <div class="relative">
              <select v-model="periodType" 
                class="pl-3 pr-7 py-1.5 border border-slate-200/80 focus:border-accent rounded-xl text-xs focus:outline-none bg-slate-50/50 text-right appearance-none cursor-pointer">
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
                <option value="yearly">Tahunan</option>
                <option value="custom">Kustom</option>
              </select>
              <PhCaretDown :size="10" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <!-- Multiplier Control -->
          <div v-if="periodType !== 'custom'" class="flex items-center justify-between gap-3 py-3 animate-in slide-in-from-top-2 duration-150">
            <label class="text-xs font-normal text-slate-600 shrink-0">Ulangi Setiap (Siklus)</label>
            <div class="flex items-center gap-2">
              <button type="button" @click="periodMultiplier > 1 ? periodMultiplier-- : null"
                class="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all text-slate-700 text-xs font-black cursor-pointer select-none">
                -
              </button>
              <span class="text-xs font-normal text-slate-800 min-w-[70px] text-center">
                {{ periodMultiplier }} {{ periodType === 'daily' ? 'Hari' : periodType === 'weekly' ? 'Minggu' : periodType === 'monthly' ? 'Bulan' : 'Tahun' }}
              </span>
              <button type="button" @click="periodMultiplier++"
                class="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all text-slate-700 text-xs font-black cursor-pointer select-none">
                +
              </button>
            </div>
          </div>

          <!-- Start Date -->
          <div class="flex items-center justify-between gap-3 py-3">
            <label class="text-xs font-normal text-slate-600 shrink-0">Tanggal Mulai *</label>
            <div @click="showStartDateModal = true" 
              class="flex items-center justify-end gap-1.5 cursor-pointer max-w-[60%] select-none">
              <span class="text-xs text-slate-800">{{ startDate || 'Pilih Tanggal...' }}</span>
              <PhCalendar :size="14" class="text-slate-400 shrink-0" />
            </div>
          </div>

          <!-- Permanent Budget -->
          <div v-if="periodType !== 'custom'" class="flex items-center justify-between gap-3 py-3">
            <label class="text-xs font-normal text-slate-600 shrink-0">Budget Permanen Berulang</label>
            <label class="relative inline-flex items-center cursor-pointer select-none shrink-0">
              <input type="checkbox" v-model="isPermanent" class="sr-only peer" />
              <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          <!-- End Date -->
          <div v-if="!isPermanent || periodType === 'custom'" class="flex items-center justify-between gap-3 py-3 animate-in slide-in-from-top-2 duration-150">
            <label class="text-xs font-normal text-slate-600 shrink-0">Tanggal Berakhir *</label>
            <div @click="showEndDateModal = true" 
              class="flex items-center justify-end gap-1.5 cursor-pointer max-w-[60%] select-none">
              <span class="text-xs text-slate-800">{{ endDate || 'Pilih Tanggal...' }}</span>
              <PhCalendar :size="14" class="text-slate-400 shrink-0" />
            </div>
          </div>

          <!-- Dashboard Widget Switcher -->
          <div class="flex items-center justify-between gap-3 py-3">
            <label class="text-xs font-normal text-slate-600 shrink-0">Tampilkan di Dashboard</label>
            <label class="relative inline-flex items-center cursor-pointer select-none shrink-0">
              <input type="checkbox" v-model="showOnDashboard" class="sr-only peer" />
              <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          <!-- Notification threshold switcher -->
          <div class="flex items-center justify-between gap-3 py-3">
            <label class="text-xs font-normal text-slate-600 shrink-0">Notifikasi Dekat Limit</label>
            <label class="relative inline-flex items-center cursor-pointer select-none shrink-0">
              <input type="checkbox" v-model="notifyOnThreshold" class="sr-only peer" />
              <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          <!-- Input notification percentage -->
          <div v-if="notifyOnThreshold" class="flex items-center justify-between gap-3 py-3 animate-in slide-in-from-top-2 duration-150">
            <label class="text-xs font-normal text-slate-600 shrink-0">Batas Threshold (%)</label>
            <input v-model="notifyThresholdPercent" type="number" min="1" max="100"
              class="px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-transparent text-right w-20" />
          </div>

          <!-- Catatan input (Placed at the very bottom) -->
          <div class="flex items-center justify-between gap-3 py-3">
            <label class="text-xs font-normal text-slate-600 shrink-0">Catatan</label>
            <input v-model="notes" type="text" placeholder="Keterangan singkat (opsional)"
              class="py-1 border-none focus:ring-0 text-xs focus:outline-none bg-transparent text-right w-56 truncate px-0" />
          </div>

        </div>
      </div>

      <footer class="p-3 border-t border-slate-100 bg-slate-50 flex gap-2">
        <button type="button" @click="showFormModal = false" class="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold shadow-xs cursor-pointer text-center">
          Batal
        </button>
        <button type="button" @click="handleSaveBudget" class="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer text-center">
          Simpan
        </button>
      </footer>

      <!-- FULL PAGE ICON SELECTOR -->
      <div v-if="showIconPage" class="fixed inset-0 z-[60] bg-slate-50 flex flex-col w-full max-w-md mx-auto animate-in slide-in-from-right duration-200">
        <header class="p-4 border-b border-slate-100 bg-white flex items-center gap-3 sticky top-0 z-10">
          <button type="button" @click="showIconPage = false" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600">
            <PhArrowLeft :size="20" weight="bold" />
          </button>
          <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Pilih Ikon Budget</h3>
        </header>
        <div class="p-4 bg-white border-b border-slate-100">
          <div class="relative">
            <input v-model="searchIconQuery" type="text" placeholder="Cari ikon..."
              class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:outline-none focus:border-accent" />
            <PhMagnifyingGlass class="absolute left-3 top-2.5 text-slate-400" :size="14" />
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-4">
          <div class="grid grid-cols-4 gap-3">
            <button v-for="ic in filteredIcons" :key="ic.name" type="button" @click="selectIcon(ic.name)"
              class="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-accent-light hover:text-accent hover:border-accent/15 transition-all aspect-square active:scale-95">
              <component :is="resolveIcon(ic.name)" :size="26" />
              <span class="text-[8px] font-bold text-slate-400 truncate w-full text-center">{{ ic.label }}</span>
            </button>
          </div>
        </div>
      </div>



      <!-- FULL PAGE WALLET SELECTOR -->
      <div v-if="showWalletPage" class="fixed inset-0 z-[60] bg-slate-50 flex flex-col w-full max-w-md mx-auto animate-in slide-in-from-right duration-200">
        <header class="p-4 border-b border-slate-100 bg-white flex items-center gap-3 sticky top-0 z-10">
          <button type="button" @click="showWalletPage = false" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600">
            <PhArrowLeft :size="20" weight="bold" />
          </button>
          <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Pilih Dompet</h3>
        </header>
        <div class="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div v-for="w in liquidWallets" :key="w.id" @click="walletId = w.id; showWalletPage = false"
            class="bg-white border rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-all active:scale-[0.99]"
            :class="parseInt(walletId) === w.id ? 'border-accent bg-accent/5 shadow-3xs' : 'border-slate-200/60 bg-white'">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-11 h-11 rounded-xl bg-accent-light text-accent flex items-center justify-center text-lg shrink-0">
                <component :is="resolveIcon(w.icon)" v-if="resolveIcon(w.icon)" :size="24" />
                <span v-else>{{ w.icon }}</span>
              </div>
              <div class="min-w-0 text-left">
                <span class="block text-xs font-extrabold text-slate-800 truncate">{{ w.name }}</span>
                <span class="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Saldo: {{ formatRp(w.balance) }}</span>
              </div>
            </div>
            <div class="w-5 h-5 rounded-full border flex items-center justify-center shrink-0"
              :class="parseInt(walletId) === w.id ? 'bg-accent border-accent text-white' : 'border-slate-300 bg-white'">
              <PhCheck v-if="parseInt(walletId) === w.id" :size="12" weight="bold" />
            </div>
          </div>
        </div>
      </div>

      <!-- FULL PAGE CATEGORY SELECTOR -->
      <div v-if="showCategoryPage" class="fixed inset-0 z-[60] bg-slate-50 flex flex-col w-full max-w-md mx-auto animate-in slide-in-from-right duration-200">
        <header class="p-4 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-10">
          <div class="flex items-center gap-3">
            <button type="button" @click="showCategoryPage = false" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600">
              <PhArrowLeft :size="20" weight="bold" />
            </button>
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Pilih Kategori</h3>
          </div>
          <button type="button" @click="showCategoryPage = false"
            class="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
            Selesai
          </button>
        </header>
        <div class="p-4 bg-white border-b border-slate-100">
          <div class="relative">
            <input v-model="searchCategoryQuery" type="text" placeholder="Cari kategori..."
              class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:outline-none focus:border-accent" />
            <PhMagnifyingGlass class="absolute left-3 top-2.5 text-slate-400" :size="14" />
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-4">
          <div class="grid grid-cols-4 gap-2">
            <button v-for="c in filteredExpenseCategories" :key="c.id" type="button" @click="toggleCategorySelection(c.id)"
              class="bg-white border rounded-xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 transition-all active:scale-[0.98] relative w-full aspect-square gap-1 select-none"
              :class="selectedCategoryIds.includes(c.id) ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-slate-200/60 bg-white'">
              <span class="text-xl shrink-0 flex items-center justify-center text-slate-600">
                <component :is="resolveIcon(c.icon)" v-if="resolveIcon(c.icon)" :size="22" />
                <span v-else>{{ c.icon || '📁' }}</span>
              </span>
              <span class="text-[10px] truncate leading-tight w-full text-slate-800">{{ c.category_name }}</span>
              <div v-if="selectedCategoryIds.includes(c.id)" class="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center">
                <PhCheck :size="10" weight="bold" />
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Custom Calendar Pickers -->
      <Calendar v-if="showStartDateModal" v-model="startDate" :allow-future="true" :show-time="false" @close="showStartDateModal = false" />
      <Calendar v-if="showEndDateModal" v-model="endDate" :allow-future="true" :show-time="false" @close="showEndDateModal = false" />
      </div>
    </Teleport>

    <!-- DELETE TRANSACTION CONFIRMATION MODAL -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-150">
          <div class="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-3xs">
            <PhWarning :size="24" weight="bold" />
          </div>
          <div class="space-y-1.5 p-0.5 text-left">
            <h3 class="text-xs font-bold text-slate-800 tracking-tight">Hapus Transaksi</h3>
            <p class="text-[10px] text-slate-500 leading-relaxed">Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <div class="flex gap-2.5 pt-2">
            <button @click="showDeleteConfirm = false" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center">Batal</button>
            <button @click="confirmDelete" class="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center">Hapus</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
