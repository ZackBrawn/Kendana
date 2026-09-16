<script setup>
import { ref, onMounted, computed, onUnmounted, watch, nextTick } from 'vue';
import { api, showToast } from '../api';
import { PhArrowLeft, PhWarning, PhCaretDown, PhEye, PhEyeSlash, PhPencilSimple } from "@phosphor-icons/vue";
import { WALLET_ICONS } from '../utils/iconList';
import { Chart, registerables } from 'chart.js';
import { formatRp, resolveIcon, groupTransactionsByDate, formatGroupDate } from '../utils/helpers';
import Transaction from '../components/Transaction.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';

Chart.register(...registerables);

const wallets = ref([]);
const showAddModal = ref(false);
const name = ref('');
const balance = ref('');
const icon = ref('PhWallet');

const activeWalletTab = ref('list'); // list / settings
const draggedWalletIdx = ref(null);

const hideValues = ref(localStorage.getItem('dashboard_hide_values') === 'true');
const toggleHideValues = () => {
  hideValues.value = !hideValues.value;
  localStorage.setItem('dashboard_hide_values', hideValues.value);
};

const showEditWalletSheet = ref(false);
const editingWallet = ref(null);
const editWalletName = ref('');
const editWalletBalance = ref('');
const editWalletIcon = ref('PhWallet');

const loadWallets = async () => {
  try {
    const res = await api.getWallets();
    const orderStr = localStorage.getItem('wallet_order');
    if (orderStr) {
      const orderIds = JSON.parse(orderStr);
      const liquid = res.filter(w => w.group_type !== 'System');
      const system = res.filter(w => w.group_type === 'System');

      const orderMap = new Map(orderIds.map((id, idx) => [id, idx]));
      liquid.sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : 9999;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : 9999;
        return idxA - idxB;
      });
      wallets.value = [...liquid, ...system];
    } else {
      wallets.value = res;
    }
  } catch (err) {
    console.error(err);
  }
};

const handleCreate = async () => {
  if (!name.value) return;
  try {
    await api.createWallet({
      name: name.value,
      balance: parseFloat(balance.value || 0),
      group_type: 'Liquid',
      icon: icon.value
    });
    name.value = '';
    balance.value = '';
    icon.value = 'PhWallet';
    showAddModal.value = false;
    showToast('Dompet berhasil dibuat', 'success');
    loadWallets();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const dragStartWallet = (idx) => {
  draggedWalletIdx.value = idx;
};

const dragOverWallet = (targetIdx, event) => {
  if (draggedWalletIdx.value === null || draggedWalletIdx.value === targetIdx) return;

  const rect = event.currentTarget.getBoundingClientRect();
  const relativeY = event.clientY - rect.top;
  const height = rect.bottom - rect.top;

  const isMovingDown = targetIdx > draggedWalletIdx.value;
  if (isMovingDown && relativeY < height / 2) {
    return;
  }
  if (!isMovingDown && relativeY > height / 2) {
    return;
  }

  const list = [...liquidWallets.value];
  const draggedItem = list[draggedWalletIdx.value];
  list.splice(draggedWalletIdx.value, 1);
  list.splice(targetIdx, 0, draggedItem);

  const orderIds = list.map(w => w.id);
  localStorage.setItem('wallet_order', JSON.stringify(orderIds));

  const systemWallets = wallets.value.filter(w => w.group_type === 'System');
  wallets.value = [...list, ...systemWallets];

  draggedWalletIdx.value = targetIdx;
};

const dragEndWallet = () => {
  draggedWalletIdx.value = null;
};

const openEditWallet = (wallet) => {
  editingWallet.value = wallet;
  editWalletName.value = wallet.name;
  editWalletBalance.value = wallet.balance;
  editWalletIcon.value = wallet.icon || 'PhWallet';
  showEditWalletSheet.value = true;
};

const handleUpdateWallet = async () => {
  if (!editWalletName.value.trim()) {
    showToast('Nama dompet tidak boleh kosong', 'error');
    return;
  }
  try {
    await api.updateWallet(editingWallet.value.id, {
      name: editWalletName.value.trim(),
      balance: parseFloat(editWalletBalance.value || 0),
      group_type: editingWallet.value.group_type,
      icon: editWalletIcon.value
    });
    showToast('Dompet berhasil diperbarui', 'success');
    showEditWalletSheet.value = false;

    // update details if currently open
    if (selectedWallet.value && selectedWallet.value.id === editingWallet.value.id) {
      selectedWallet.value.name = editWalletName.value.trim();
      selectedWallet.value.balance = parseFloat(editWalletBalance.value || 0);
      selectedWallet.value.icon = editWalletIcon.value;
    }

    editingWallet.value = null;
    loadWallets();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const handleDeleteWallet = async () => {
  if (!confirm('Apakah Anda yakin ingin menghapus dompet ini? Semua transaksi terkait dompet ini akan terhapus.')) {
    return;
  }
  try {
    await api.deleteWallet(editingWallet.value.id);
    showToast('Dompet berhasil dihapus', 'success');
    showEditWalletSheet.value = false;

    // close details page if current wallet was deleted
    if (selectedWallet.value && selectedWallet.value.id === editingWallet.value.id) {
      showDetailModal.value = false;
      selectedWallet.value = null;
    }

    editingWallet.value = null;
    loadWallets();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// format wallet balance input values
const balanceDisplay = computed({
  get() {
    if (balance.value === undefined || balance.value === null || balance.value === '') return '';
    if (balance.value === '-') return '-';
    const isNegative = balance.value.toString().startsWith('-');
    const cleanNum = balance.value.toString().replace(/-/g, '');
    const formatted = cleanNum.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return isNegative ? '-' + formatted : formatted;
  },
  set(val) {
    const clean = val.replace(/\./g, '').replace(/[^0-9-]/g, '');
    let cleaned = clean;
    if (cleaned.startsWith('-')) {
      cleaned = '-' + cleaned.slice(1).replace(/-/g, '');
    } else {
      cleaned = cleaned.replace(/-/g, '');
    }
    const sign = cleaned.startsWith('-') ? '-' : '';
    const digits = cleaned.replace(/-/g, '').slice(0, 12);
    balance.value = sign + digits;
  }
});

// format edit wallet balance input values
const editWalletBalanceDisplay = computed({
  get() {
    if (editWalletBalance.value === undefined || editWalletBalance.value === null || editWalletBalance.value === '') return '';
    if (editWalletBalance.value === '-') return '-';
    const isNegative = editWalletBalance.value.toString().startsWith('-');
    const cleanNum = editWalletBalance.value.toString().replace(/-/g, '');
    const formatted = cleanNum.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return isNegative ? '-' + formatted : formatted;
  },
  set(val) {
    const clean = val.replace(/\./g, '').replace(/[^0-9-]/g, '');
    let cleaned = clean;
    if (cleaned.startsWith('-')) {
      cleaned = '-' + cleaned.slice(1).replace(/-/g, '');
    } else {
      cleaned = cleaned.replace(/-/g, '');
    }
    const sign = cleaned.startsWith('-') ? '-' : '';
    const digits = cleaned.replace(/-/g, '').slice(0, 12);
    editWalletBalance.value = sign + digits;
  }
});

const liquidWallets = computed(() => {
  return wallets.value.filter(w => w.group_type !== 'System');
});

const totalWealth = computed(() => {
  return wallets.value
    .filter(w => w.group_type !== 'System')
    .reduce((sum, w) => sum + parseFloat(w.balance || 0), 0);
});

const totalDebt = computed(() => {
  const debtWallet = wallets.value.find(w => w.name.toLowerCase().includes('hutang'));
  return debtWallet ? Math.abs(parseFloat(debtWallet.balance || 0)) : 0;
});

const totalReceivable = computed(() => {
  const recWallet = wallets.value.find(w => w.name.toLowerCase().includes('piutang'));
  return recWallet ? parseFloat(recWallet.balance || 0) : 0;
});

const netAssets = computed(() => {
  return totalWealth.value + totalReceivable.value - totalDebt.value;
});

const transactions = ref([]);
const netLineChartCanvas = ref(null);
let netChartInstance = null;

const netTrendData = computed(() => {
  if (!transactions.value || transactions.value.length === 0) {
    return [0, 0];
  }
  
  const txs = [...transactions.value].sort((a, b) => new Date(a.date) - new Date(b.date));
  
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
  if (netLineChartCanvas.value) {
    if (netChartInstance) {
      netChartInstance.destroy();
    }
    
    const isPositive = netAssets.value >= 0;
    const lineColor = isPositive ? '#34d399' : '#fb7185';
    const fillColor = isPositive ? 'rgba(52, 211, 153, 0.08)' : 'rgba(251, 113, 133, 0.08)';

    netChartInstance = new Chart(netLineChartCanvas.value, {
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
  }
};

watch([netTrendData, netAssets], () => {
  nextTick(updateNetChart);
});

const loadTransactions = async () => {
  try {
    transactions.value = await api.getTransactions();
  } catch (err) {
    console.error(err);
  }
};

const selectedWallet = ref(null);
const showDetailModal = ref(false);
const detailTab = ref('summary'); // summary / history
const walletTransactions = ref([]);
const loadingTransactions = ref(false);
const pagination = ref({ page: 1, pages: 1 });

const openWalletDetails = async (wallet, page = 1) => {
  selectedWallet.value = wallet;
  showDetailModal.value = true;
  loadingTransactions.value = true;
  try {
    const res = await api.getWalletDetail(wallet.id, { page });
    if (page === 1) {
      walletTransactions.value = res.transactions;
    } else {
      walletTransactions.value = [...walletTransactions.value, ...res.transactions];
    }
    pagination.value = res.pagination;
  } catch (err) {
    showToast(err.message || 'Gagal memuat detail dompet', 'error');
  } finally {
    loadingTransactions.value = false;
  }
};

const loadMoreTransactions = () => {
  if (pagination.value.page < pagination.value.pages) {
    openWalletDetails(selectedWallet.value, pagination.value.page + 1);
  }
};

const categoryIncomeBreakdown = computed(() => {
  const breakdown = {};
  walletTransactions.value.forEach(t => {
    if (t.type_name === 'Income' && t.category_name && t.destination_wallet_id === selectedWallet.value?.id) {
      const amt = parseFloat(t.amount || 0);
      if (!breakdown[t.category_name]) {
        breakdown[t.category_name] = { name: t.category_name, icon: t.category_icon, amount: 0 };
      }
      breakdown[t.category_name].amount += amt;
    }
  });
  return Object.values(breakdown).sort((a, b) => b.amount - a.amount);
});

const categoryExpenseBreakdown = computed(() => {
  const breakdown = {};
  walletTransactions.value.forEach(t => {
    if (t.type_name === 'Expense' && t.category_name && t.source_wallet_id === selectedWallet.value?.id) {
      const amt = parseFloat(t.amount || 0);
      if (!breakdown[t.category_name]) {
        breakdown[t.category_name] = { name: t.category_name, icon: t.category_icon, amount: 0 };
      }
      breakdown[t.category_name].amount += amt;
    }
  });
  return Object.values(breakdown).sort((a, b) => b.amount - a.amount);
});

const walletGroupedTransactions = computed(() => groupTransactionsByDate(walletTransactions.value));

const formatGroupDateLabel = (dateStr) => formatGroupDate(dateStr);

const collapsedGroups = ref({});
const toggleGroup = (dateStr) => {
  collapsedGroups.value[dateStr] = !collapsedGroups.value[dateStr];
};
const isCollapsed = (dateStr) => !!collapsedGroups.value[dateStr];

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

  try {
    await api.deleteTransaction(transactionToDelete.value.id);
    showToast('Transaksi berhasil dihapus', 'success');
    loadWallets();
    if (selectedWallet.value) {
      openWalletDetails(selectedWallet.value);
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    transactionToDelete.value = null;
  }
};

const handleReload = async () => {
  await loadWallets();
  await loadTransactions();
  if (selectedWallet.value) {
    openWalletDetails(selectedWallet.value);
  }
  nextTick(updateNetChart);
};

onMounted(async () => {
  await loadWallets();
  await loadTransactions();
  window.addEventListener('reload-data', handleReload);
  nextTick(updateNetChart);
});

onUnmounted(() => {
  window.removeEventListener('reload-data', handleReload);
  if (netChartInstance) {
    netChartInstance.destroy();
  }
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Aset & Dompet</h2>
      <button @click="showAddModal = true"
        class="px-3 py-1.5 bg-accent text-white rounded-xl text-xs font-bold shadow-xs">
        + Tambah Dompet
      </button>
    </div>

    <div class="relative overflow-hidden bg-accent text-white rounded-2xl p-4 shadow-lg space-y-3.5">
      <div class="relative z-10">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Aset Bersih</p>
            <h3 class="text-2xl font-black mt-1 tracking-tight">
              {{ hideValues ? 'Rp ***' : formatRp(netAssets) }}
            </h3>
          </div>
          <button @click="toggleHideValues"
            class="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center"
            title="Sembunyikan/Tampilkan Nominal">
            <component :is="hideValues ? PhEyeSlash : PhEye" :size="20" />
          </button>
        </div>
        <div class="pt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/80 font-medium">
          <p class="whitespace-nowrap">
            Kekayaan: <span class="font-bold text-white ml-0.5">{{ hideValues ? 'Rp ***' : formatRp(totalWealth) }}</span>
          </p>
          <p class="whitespace-nowrap">
            Piutang: <span class="font-bold text-emerald-300 ml-0.5">{{ hideValues ? 'Rp ***' : formatRp(totalReceivable) }}</span>
          </p>
          <p class="whitespace-nowrap">
            Hutang: <span class="font-bold text-rose-300 ml-0.5">{{ hideValues ? 'Rp ***' : formatRp(totalDebt) }}</span>
          </p>
        </div>
      </div>

      <!-- Line chart container on the right side as background accent -->
      <div class="absolute right-0 top-[40%] -translate-y-1/2 w-[45%] h-[55%] opacity-35 pointer-events-none pr-3 z-0">
        <canvas ref="netLineChartCanvas"></canvas>
        <div class="absolute inset-y-0 left-0 w-20 pointer-events-none" style="background: linear-gradient(to right, var(--color-primary) 0%, transparent 100%)"></div>
      </div>
    </div>

    <div class="flex justify-center shrink-0 mt-4 mb-2">
      <div class="flex p-0.5 bg-slate-200 border border-slate-200/50 rounded-xl relative w-56 select-none shadow-2xs">
        <div
          class="absolute top-0.5 bottom-0.5 left-0.5 bg-white rounded-lg shadow-sm transition-transform duration-250 ease-out w-[calc(50%-2px)]"
          :class="activeWalletTab === 'settings' ? 'translate-x-full' : 'translate-x-0'"></div>

        <button type="button" @click="activeWalletTab = 'list'"
          class="flex-1 py-1.5 text-center text-[10px] uppercase tracking-wider font-extrabold transition-colors duration-200 z-10 animate-none"
          :class="activeWalletTab === 'list' ? 'text-accent font-black' : 'text-slate-500'">
          Dompet
        </button>

        <button type="button" @click="activeWalletTab = 'settings'"
          class="flex-1 py-1.5 text-center text-[10px] uppercase tracking-wider font-extrabold transition-colors duration-200 z-10 animate-none"
          :class="activeWalletTab === 'settings' ? 'text-accent font-black' : 'text-slate-500'">
          Pengaturan
        </button>
      </div>
    </div>

    <div class="flex-1 min-h-0">
      <div v-if="activeWalletTab === 'list'" class="space-y-2">
        <div v-for="w in liquidWallets" :key="w.id" @click="openWalletDetails(w)"
          class="bg-white rounded-2xl p-2 flex items-center justify-between shadow-sm cursor-pointer hover:bg-slate-50/50 transition-colors animate-in fade-in duration-150">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <div
              class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0 text-accent">
              <component :is="resolveIcon(w.icon)" v-if="resolveIcon(w.icon)" :size="24" />
              <span v-else>{{ w.icon }}</span>
            </div>
            <div class="min-w-0">
              <h3 class="text-[11px] font-bold text-slate-900 truncate">{{ w.name }}</h3>
              <span class="text-[8px] font-bold text-accent bg-accent-light px-1.5 py-0.5 rounded-md">{{ w.group_type }}</span>
            </div>
          </div>
          <p class="text-xs font-black text-slate-900 shrink-0 pl-2">
            {{ hideValues ? 'Rp ***' : formatRp(w.balance) }}
          </p>
        </div>
      </div>

      <TransitionGroup name="list" tag="div" v-else class="space-y-2">
        <div v-for="(w, idx) in liquidWallets" :key="w.id" draggable="true" @dragstart="dragStartWallet(idx)"
          @dragover.prevent="dragOverWallet(idx, $event)" @dragend="dragEndWallet" @click="openEditWallet(w)"
          class="bg-white rounded-2xl p-2 flex items-center justify-between shadow-sm cursor-pointer hover:bg-slate-50/50 transition-colors"
          :class="draggedWalletIdx === idx ? 'opacity-40 scale-[0.98] border-accent/40 bg-accent-light' : 'border-transparent hover:border-accent/40'">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <div
              class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0 text-accent">
              <component :is="resolveIcon(w.icon)" v-if="resolveIcon(w.icon)" :size="24" />
              <span v-else>{{ w.icon }}</span>
            </div>
            <div class="min-w-0">
              <h3 class="text-[11px] font-bold text-slate-900 truncate">{{ w.name }}</h3>
              <span class="text-[8px] font-bold text-accent bg-accent-light px-1.5 py-0.5 rounded-md">{{ w.group_type
              }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span @click.stop
              class="text-slate-400 cursor-grab active:cursor-grabbing font-black text-xs select-none p-1.5 hover:text-slate-600 transition-colors">☰</span>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Modals -->
    <Teleport to="body">
      <div v-if="showAddModal"
        class="fixed inset-0 z-[45] bg-slate-50 flex flex-col w-full max-w-md mx-auto shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250">
        <div
          class="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
          <button @click="showAddModal = false"
            class="p-1 rounded-full text-accent text-xs font-bold flex items-center gap-1 cursor-pointer">
            <PhArrowLeft :size="24" weight="bold"/>
          </button>
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Tambah Dompet</h3>
          <div class="w-12"></div>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-20">
          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Nama Dompet</label>
            <input v-model="name" type="text" placeholder="Nama Dompet (cth: Bank BCA)"
              class="w-full bg-white border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent font-bold text-slate-800" />
          </div>

          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Saldo Awal</label>
            <input v-model="balanceDisplay" type="text" placeholder="0"
              class="w-full bg-white border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent font-bold text-slate-800" />
          </div>

          <div class="space-y-1.5 flex-1 flex flex-col min-h-0">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Pilih Icon Dompet</label>
            <div class="flex-1 overflow-y-auto p-3 bg-white border border-slate-200 rounded-2xl space-y-4 no-scrollbar">
              <div class="grid grid-cols-4 gap-2">
                <button v-for="ico in WALLET_ICONS" :key="ico.name" type="button" @click="icon = ico.name"
                  class="aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all hover:bg-slate-100 border border-slate-100 shrink-0 cursor-pointer"
                  :class="icon === ico.name ? 'bg-accent-light border-accent text-accent ring-2 ring-accent' : 'text-slate-600 bg-slate-50/50'"
                  :title="ico.label">
                  <component :is="resolveIcon(ico.name)" :size="52" />
                  <span class="text-[8px] font-bold text-slate-500 truncate max-w-full px-1">{{ ico.label }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 bg-white border-t border-slate-200 shrink-0">
          <button @click="handleCreate"
            class="w-full py-3 bg-accent text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-accent/25 cursor-pointer">
            Simpan Dompet
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Wallet Details Sheet -->
    <Teleport to="body">
      <div v-if="showDetailModal && selectedWallet"
        class="fixed inset-0 z-[45] bg-slate-50 flex flex-col w-full max-w-md mx-auto shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250">
        <div
          class="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
          <button @click="showDetailModal = false; selectedWallet = null"
            class="p-1 rounded-full text-accent text-xs font-bold flex items-center gap-1 cursor-pointer">
            <PhArrowLeft :size="24" weight="bold"/>
          </button>
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Detail Dompet</h3>
          <button @click="openEditWallet(selectedWallet)"
            class="p-1 rounded-full text-accent text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="Edit Dompet">
            <PhPencilSimple :size="24" weight="bold"/>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-20">

          <div class="relative overflow-hidden rounded-2xl bg-accent p-3 text-white shadow-lg">
            <div class="relative z-10 flex items-center justify-between">
              <div>
                <p class="text-[10px] text-white/80 font-extrabold uppercase tracking-wider">Saldo Terkini</p>
                <h4 class="text-2xl font-black mt-0.5 tracking-tight">
                  {{ hideValues ? 'Rp ***' : formatRp(selectedWallet.balance) }}
                </h4>
              </div>
              <div class="w-20 h-20 bg-white/30 rounded-xl flex items-center justify-center text-2xl text-white">
                <component :is="resolveIcon(selectedWallet.icon)" v-if="resolveIcon(selectedWallet.icon)" :size="64" />
                <span v-else>{{ selectedWallet.icon }}</span>
              </div>
            </div>
            <div class="relative z-10 mt-4">
              <span
                class="text-[10px] font-black uppercase tracking-wider bg-white/25 text-white px-2.5 py-1 rounded-lg">
                {{ selectedWallet.name }}
              </span>
            </div>
          </div>

          <div class="flex justify-center shrink-0 pt-2">
            <div
              class="flex p-0.5 bg-slate-200 border border-slate-200/50 rounded-xl relative w-56 select-none shadow-2xs">
              <div
                class="absolute top-0.5 bottom-0.5 left-0.5 bg-white rounded-lg shadow-sm transition-transform duration-250 ease-out w-[calc(50%-2px)]"
                :class="detailTab === 'history' ? 'translate-x-full' : 'translate-x-0'"></div>
              <button @click="detailTab = 'summary'"
                class="flex-1 py-1.5 text-center text-[10px] uppercase tracking-wider font-extrabold transition-colors duration-200 z-10 cursor-pointer"
                :class="detailTab === 'summary' ? 'text-accent' : 'text-slate-400'">
                Rangkuman
              </button>
              <button @click="detailTab = 'history'"
                class="flex-1 py-1.5 text-center text-[10px] uppercase tracking-wider font-extrabold transition-colors duration-200 z-10 cursor-pointer"
                :class="detailTab === 'history' ? 'text-accent' : 'text-slate-400'">
                Riwayat
              </button>
            </div>
          </div>

          <div v-if="loadingTransactions" class="animate-pulse space-y-3 py-6">
            <div class="h-10 bg-slate-200 rounded-xl"></div>
            <div class="h-20 bg-slate-200 rounded-xl"></div>
          </div>

          <template v-else>
            <div v-if="detailTab === 'summary'" class="space-y-4 animate-in fade-in duration-200">
              <div class="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
                <h5 class="text-[10px] font-black text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                  Pengeluaran per Kategori
                </h5>
                <div v-if="categoryExpenseBreakdown.length === 0" class="text-slate-400 text-xs text-center py-2">
                  Belum ada pengeluaran dicatat
                </div>
                <div v-else class="space-y-2">
                  <div v-for="item in categoryExpenseBreakdown" :key="item.name"
                    class="flex items-center justify-between border-b border-slate-50 last:border-0 pb-1.5 last:pb-0">
                    <div class="flex items-center gap-2">
                      <span class="text-base flex items-center justify-center">
                        <component :is="resolveIcon(item.icon)" v-if="resolveIcon(item.icon)" :size="16"
                          class="text-slate-700" />
                        <span v-else>{{ item.icon }}</span>
                      </span>
                      <span class="text-xs font-bold text-slate-800">{{ item.name }}</span>
                    </div>
                    <span class="text-xs font-extrabold text-rose-500">-{{ formatRp(item.amount) }}</span>
                  </div>
                </div>
              </div>

              <div class="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
                <h5 class="text-[10px] font-black text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                  Pemasukan per Kategori
                </h5>
                <div v-if="categoryIncomeBreakdown.length === 0" class="text-slate-400 text-xs text-center py-2">
                  Belum ada pemasukan dicatat
                </div>
                <div v-else class="space-y-2">
                  <div v-for="item in categoryIncomeBreakdown" :key="item.name"
                    class="flex items-center justify-between border-b border-slate-50 last:border-0 pb-1.5 last:pb-0">
                    <div class="flex items-center gap-2">
                      <span class="text-base flex items-center justify-center">
                        <component :is="resolveIcon(item.icon)" v-if="resolveIcon(item.icon)" :size="16"
                          class="text-slate-700" />
                        <span v-else>{{ item.icon }}</span>
                      </span>
                      <span class="text-xs font-bold text-slate-800">{{ item.name }}</span>
                    </div>
                    <span class="text-xs font-extrabold text-emerald-600">+{{ formatRp(item.amount) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="space-y-3 animate-in fade-in duration-200">
              <div v-if="walletGroupedTransactions.length === 0"
                class="bg-white border border-slate-200/80 rounded-2xl p-6 text-center text-slate-400 text-xs font-medium">
                Belum ada riwayat transaksi.
              </div>

              <div v-else v-for="group in walletGroupedTransactions" :key="group.date" class="mb-3 last:mb-0">
                <div @click="toggleGroup(group.date)"
                  class="flex items-center justify-between cursor-pointer select-none px-3.5 py-2 bg-slate-100 border border-slate-200/50 hover:bg-slate-200/50 transition-all"
                  :class="isCollapsed(group.date) ? 'rounded-xl' : 'rounded-t-xl border-b-0'">
                  <span class="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    {{ formatGroupDateLabel(group.date) }}
                  </span>
                  <PhCaretDown :size="14" weight="bold" class="text-slate-400 transition-transform duration-200"
                    :class="{ '-rotate-90': isCollapsed(group.date) }" />
                </div>

                <div v-show="!isCollapsed(group.date)"
                  class="bg-white border border-slate-200/80 rounded-b-2xl rounded-t-none divide-y divide-slate-100 shadow-xs overflow-hidden">
                  <Transaction
                    v-for="t in group.transactions"
                    :key="t.id"
                    :transaction="t"
                    :hide-values="hideValues"
                    @click="handleTransactionClick"
                    @edit="handleSwipeEdit"
                    @delete="handleSwipeDelete"
                  />
                </div>
              </div>
              
              <div v-if="pagination.page < pagination.pages" class="pt-2 flex justify-center">
                <button @click="loadMoreTransactions" 
                  class="px-4 py-2 text-center text-[10px] font-black uppercase bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl cursor-pointer">
                  Muat Lebih Banyak
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirm Modal -->
    <ConfirmDeleteModal
      v-model:show="showDeleteConfirm"
      title="Konfirmasi Hapus"
      message="Apakah Anda yakin ingin menghapus transaksi ini?"
      confirm-text="Ya, Hapus"
      cancel-text="Batal"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false; transactionToDelete = null"
    />

    <!-- Edit Wallet Modal Sheet -->
    <Teleport to="body">
      <div v-if="showEditWalletSheet"
        class="fixed inset-0 z-[45] bg-slate-50 flex flex-col w-full max-w-md mx-auto shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250">
        <div
          class="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
          <button @click="showEditWalletSheet = false"
            class="p-1 rounded-full text-accent text-xs font-bold flex items-center gap-1 cursor-pointer">
            <PhArrowLeft :size="24" weight="bold"/>
          </button>
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Ubah Dompet</h3>
          <button @click="handleDeleteWallet"
            class="text-xs font-extrabold text-rose-500 hover:text-rose-700 cursor-pointer">Hapus</button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-20">
          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Nama Dompet</label>
            <input v-model="editWalletName" type="text" placeholder="Nama Dompet (cth: Bank BCA)"
              class="w-full bg-white border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent font-bold text-slate-800" />
          </div>

          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Saldo</label>
            <input v-model="editWalletBalanceDisplay" type="text" placeholder="0"
              class="w-full bg-white border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent font-bold text-slate-800" />
          </div>


          <div class="space-y-1.5 flex-1 flex flex-col min-h-0">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Pilih Icon Dompet</label>
            <div class="flex-1 overflow-y-auto p-3 bg-white border border-slate-200 rounded-2xl space-y-4 no-scrollbar">
              <div class="grid grid-cols-4 gap-2">
                <button v-for="ico in WALLET_ICONS" :key="ico.name" type="button" @click="editWalletIcon = ico.name"
                  class="aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all hover:bg-slate-100 border border-slate-100 shrink-0 cursor-pointer"
                  :class="editWalletIcon === ico.name ? 'bg-accent-light border-accent text-accent ring-2 ring-accent' : 'text-slate-600 bg-slate-50/50'"
                  :title="ico.label">
                  <component :is="resolveIcon(ico.name)" :size="52" />
                  <span class="text-[8px] font-bold text-slate-500 truncate max-w-full px-1">{{ ico.label }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 bg-white border-t border-slate-200 shrink-0">
          <button @click="handleUpdateWallet"
            class="w-full py-3 bg-accent text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-accent/25 cursor-pointer">
            Simpan Perubahan
          </button>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.list-move {
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
}
</style>
