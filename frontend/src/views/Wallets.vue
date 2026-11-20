<script setup>
import { ref, onMounted, computed, onUnmounted, watch, nextTick } from 'vue';
import { api, showToast } from '../api';
import { PhArrowLeft, PhWarning, PhCaretDown, PhEye, PhEyeSlash, PhPencilSimple } from "../utils/icons";
import { WALLET_ICONS } from '../utils/iconList';
import RoughChart from '../components/RoughChart.vue';
import { formatRp, resolveIcon, groupTransactionsByDate, formatGroupDate } from '../utils/helpers';
import Transaction from '../components/Transaction.vue';
import SketchCard from '../components/SketchCard.vue';
import SketchDivider from '../components/SketchDivider.vue';
import SketchTabs from '../components/SketchTabs.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';
import SketchButton from '../components/SketchButton.vue';
import SketchInput from '../components/SketchInput.vue';
import SketchBox from '../components/SketchBox.vue';

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

const showWalletDeleteConfirm = ref(false);

const handleDeleteWallet = () => {
  showWalletDeleteConfirm.value = true;
};

const confirmWalletDelete = async () => {
  showWalletDeleteConfirm.value = false;
  if (!editingWallet.value) return;
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
// Sparkline rough (RoughChart reaktif terhadap data & warna)
const netChartColor = computed(() => (netAssets.value >= 0 ? '#34d399' : '#fb7185'));

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
};

onMounted(async () => {
  await loadWallets();
  await loadTransactions();
  window.addEventListener('reload-data', handleReload);
});

onUnmounted(() => {
  window.removeEventListener('reload-data', handleReload);
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Aset & Dompet</h2>
      <SketchButton @click="showAddModal = true"
        class="px-3 py-1.5 bg-accent text-white rounded-xl text-xs font-bold shadow-xs">
        + Tambah Dompet
      </SketchButton>
    </div>

    <SketchCard class="relative overflow-hidden bg-accent text-white p-4 space-y-3.5">
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

      <!-- Line chart rough sebagai aksen background -->
      <div class="absolute right-0 top-[40%] -translate-y-1/2 w-[45%] h-[55%] opacity-35 pointer-events-none pr-3 z-0">
        <RoughChart type="spark" filled :data="netTrendData" :color="netChartColor" />
        <div class="absolute inset-y-0 left-0 w-20 pointer-events-none" style="background: linear-gradient(to right, var(--accent) 0%, transparent 100%)"></div>
      </div>
    </SketchCard>

    <div class="flex justify-center shrink-0 mt-4 mb-2">
      <SketchTabs v-model="activeWalletTab" class="w-56" :tabs="[
        { value: 'list', label: 'Dompet' },
        { value: 'settings', label: 'Pengaturan' }
      ]" />
    </div>

    <div class="flex-1 min-h-0">
      <div v-if="activeWalletTab === 'list'" class="space-y-2">
        <SketchBox v-for="w in liquidWallets" :key="w.id" @click="openWalletDetails(w)"
          class="bg-white p-2 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors animate-in fade-in duration-150">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <div
              class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0 text-accent">
              <component :is="resolveIcon(w.icon)" v-if="resolveIcon(w.icon)" :size="24" />
              <span v-else aria-hidden="true"></span>
            </div>
            <div class="min-w-0">
              <h3 class="text-[11px] font-bold text-slate-900 truncate">{{ w.name }}</h3>
              <span class="text-[8px] font-bold text-accent bg-accent-light px-1.5 py-0.5 rounded-md">{{ w.group_type }}</span>
            </div>
          </div>
          <p class="text-xs font-black text-slate-900 shrink-0 pl-2">
            {{ hideValues ? 'Rp ***' : formatRp(w.balance) }}
          </p>
        </SketchBox>
      </div>

      <TransitionGroup name="list" tag="div" v-else class="space-y-2">
        <SketchBox v-for="(w, idx) in liquidWallets" :key="w.id" draggable="true" @dragstart="dragStartWallet(idx)"
          @dragover.prevent="dragOverWallet(idx, $event)" @dragend="dragEndWallet" @click="openEditWallet(w)"
          class="bg-white p-2 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
          :class="draggedWalletIdx === idx ? 'opacity-40 scale-[0.98] bg-accent-light' : ''">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <div
              class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0 text-accent">
              <component :is="resolveIcon(w.icon)" v-if="resolveIcon(w.icon)" :size="24" />
              <span v-else aria-hidden="true"></span>
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
        </SketchBox>
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
            <PhArrowLeft :size="24"/>
          </button>
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Tambah Dompet</h3>
          <div class="w-12"></div>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-20">
          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Nama Dompet</label>
            <SketchInput v-model="name" type="text" placeholder="Nama Dompet (cth: Bank BCA)"
              class="w-full text-xs px-3.5 py-2.5 font-bold text-slate-800" />
          </div>

          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Saldo Awal</label>
            <SketchInput v-model="balanceDisplay" type="text" placeholder="0"
              class="w-full text-xs px-3.5 py-2.5 font-bold text-slate-800" />
          </div>

          <div class="space-y-1.5 flex-1 flex flex-col min-h-0">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Pilih Icon Dompet</label>
            <SketchBox class="flex-1 overflow-y-auto p-3 bg-white space-y-4 no-scrollbar">
              <div class="grid grid-cols-4 gap-2">
                <SketchBox v-for="ico in WALLET_ICONS" :key="ico.name" @click="icon = ico.name"
                  class="aspect-square flex flex-col items-center justify-center gap-1.5 transition-all hover:bg-slate-100 shrink-0 cursor-pointer"
                  :class="icon === ico.name ? 'bg-accent-light text-accent ring-2 ring-accent' : 'text-slate-600 bg-slate-50/50'"
                  :title="ico.label">
                  <component :is="resolveIcon(ico.name)" :size="52" />
                  <span class="text-[8px] font-bold text-slate-500 truncate max-w-full px-1">{{ ico.label }}</span>
                </SketchBox>
              </div>
            </SketchBox>
          </div>
        </div>

        <div class="p-4 bg-white border-t border-slate-200 shrink-0">
          <SketchButton @click="handleCreate"
            class="w-full py-3 bg-accent text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-accent/25 cursor-pointer">
            Simpan Dompet
          </SketchButton>
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
            <PhArrowLeft :size="24"/>
          </button>
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Detail Dompet</h3>
          <button @click="openEditWallet(selectedWallet)"
            class="p-1 rounded-full text-accent text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="Edit Dompet">
            <PhPencilSimple :size="24"/>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-20">

          <SketchBox class="relative overflow-hidden bg-accent p-3 text-white">
            <div class="relative z-10 flex items-center justify-between">
              <div>
                <p class="text-[10px] text-white/80 font-extrabold uppercase tracking-wider">Saldo Terkini</p>
                <h4 class="text-2xl font-black mt-0.5 tracking-tight">
                  {{ hideValues ? 'Rp ***' : formatRp(selectedWallet.balance) }}
                </h4>
              </div>
              <div class="w-20 h-20 bg-white/30 rounded-xl flex items-center justify-center text-2xl text-white">
                <component :is="resolveIcon(selectedWallet.icon)" v-if="resolveIcon(selectedWallet.icon)" :size="64" />
                <span v-else aria-hidden="true"></span>
              </div>
            </div>
            <div class="relative z-10 mt-4">
              <span
                class="text-[10px] font-black uppercase tracking-wider bg-white/25 text-white px-2.5 py-1 rounded-lg">
                {{ selectedWallet.name }}
              </span>
            </div>
          </SketchBox>

          <div class="flex justify-center shrink-0 pt-2">
            <SketchTabs v-model="detailTab" class="w-56" :tabs="[
              { value: 'summary', label: 'Rangkuman' },
              { value: 'history', label: 'Riwayat' }
            ]" />
          </div>

          <div v-if="loadingTransactions" class="animate-pulse space-y-3 py-6">
            <SketchBox class="h-10 bg-slate-200"></SketchBox>
            <SketchBox class="h-20 bg-slate-200"></SketchBox>
          </div>

          <template v-else>
            <div v-if="detailTab === 'summary'" class="space-y-4 animate-in fade-in duration-200">
              <SketchBox class="bg-white p-4 space-y-3">
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
                        <span v-else aria-hidden="true"></span>
                      </span>
                      <span class="text-xs font-bold text-slate-800">{{ item.name }}</span>
                    </div>
                    <span class="text-xs font-extrabold text-rose-500">-{{ formatRp(item.amount) }}</span>
                  </div>
                </div>
              </SketchBox>

              <SketchBox class="bg-white p-4 space-y-3">
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
                        <span v-else aria-hidden="true"></span>
                      </span>
                      <span class="text-xs font-bold text-slate-800">{{ item.name }}</span>
                    </div>
                    <span class="text-xs font-extrabold text-emerald-600">+{{ formatRp(item.amount) }}</span>
                  </div>
                </div>
              </SketchBox>
            </div>

            <div v-else class="space-y-3 animate-in fade-in duration-200">
              <SketchBox v-if="walletGroupedTransactions.length === 0"
                class="bg-white p-6 text-center text-slate-400 text-xs font-medium">
                Belum ada riwayat transaksi.
              </SketchBox>

              <SketchCard v-else v-for="group in walletGroupedTransactions" :key="group.date" class="mb-3 last:mb-0">
                <div @click="toggleGroup(group.date)"
                  class="flex items-center justify-between cursor-pointer select-none px-3.5 py-2 bg-slate-100 border border-slate-200/50 hover:bg-slate-200/50 transition-all"
                  :class="isCollapsed(group.date) ? '' : 'border-b-0'">
                  <span class="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    {{ formatGroupDateLabel(group.date) }}
                  </span>
                  <PhCaretDown :size="14" class="text-slate-400 transition-transform duration-200"
                    :class="{ '-rotate-90': isCollapsed(group.date) }" />
                </div>

                <SketchDivider />

                <div v-show="!isCollapsed(group.date)"
                  class="bg-white divide-y divide-slate-100 overflow-hidden">
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
              </SketchCard>
              
              <div v-if="pagination.page < pagination.pages" class="pt-2 flex justify-center">
                <SketchButton @click="loadMoreTransactions"
                  class="px-4 py-2 text-center text-[10px] font-black uppercase bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl cursor-pointer">
                  Muat Lebih Banyak
                </SketchButton>
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

    <!-- Wallet Delete Confirm Modal -->
    <ConfirmDeleteModal
      v-model:show="showWalletDeleteConfirm"
      title="Konfirmasi Hapus"
      message="Apakah Anda yakin ingin menghapus dompet ini? Semua transaksi terkait dompet ini akan terhapus."
      confirm-text="Ya, Hapus"
      cancel-text="Batal"
      @confirm="confirmWalletDelete"
      @cancel="showWalletDeleteConfirm = false"
    />

    <!-- Edit Wallet Modal Sheet -->
    <Teleport to="body">
      <div v-if="showEditWalletSheet"
        class="fixed inset-0 z-[45] bg-slate-50 flex flex-col w-full max-w-md mx-auto shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250">
        <div
          class="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
          <button @click="showEditWalletSheet = false"
            class="p-1 rounded-full text-accent text-xs font-bold flex items-center gap-1 cursor-pointer">
            <PhArrowLeft :size="24"/>
          </button>
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Ubah Dompet</h3>
          <button @click="handleDeleteWallet"
            class="text-xs font-extrabold text-rose-500 hover:text-rose-700 cursor-pointer">Hapus</button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-20">
          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Nama Dompet</label>
            <SketchInput v-model="editWalletName" type="text" placeholder="Nama Dompet (cth: Bank BCA)"
              class="w-full text-xs px-3.5 py-2.5 font-bold text-slate-800" />
          </div>

          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Saldo</label>
            <SketchInput v-model="editWalletBalanceDisplay" type="text" placeholder="0"
              class="w-full text-xs px-3.5 py-2.5 font-bold text-slate-800" />
          </div>


          <div class="space-y-1.5 flex-1 flex flex-col min-h-0">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Pilih Icon Dompet</label>
            <SketchBox class="flex-1 overflow-y-auto p-3 bg-white space-y-4 no-scrollbar">
              <div class="grid grid-cols-4 gap-2">
                <SketchBox v-for="ico in WALLET_ICONS" :key="ico.name" @click="editWalletIcon = ico.name"
                  class="aspect-square flex flex-col items-center justify-center gap-1.5 transition-all hover:bg-slate-100 shrink-0 cursor-pointer"
                  :class="editWalletIcon === ico.name ? 'bg-accent-light text-accent ring-2 ring-accent' : 'text-slate-600 bg-slate-50/50'"
                  :title="ico.label">
                  <component :is="resolveIcon(ico.name)" :size="52" />
                  <span class="text-[8px] font-bold text-slate-500 truncate max-w-full px-1">{{ ico.label }}</span>
                </SketchBox>
              </div>
            </SketchBox>
          </div>
        </div>

        <div class="p-4 bg-white border-t border-slate-200 shrink-0">
          <SketchButton @click="handleUpdateWallet"
            class="w-full py-3 bg-accent text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-accent/25 cursor-pointer">
            Simpan Perubahan
          </SketchButton>
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
