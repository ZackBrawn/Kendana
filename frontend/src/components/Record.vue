<script setup>
import { ref, computed, onMounted } from 'vue';
import { api, showToast } from '../api';
import Keypad from './Keypad.vue';
import Calendar from './Calendar.vue';
import { PhArrowLeft, PhCalendarDots, PhKeyboard, PhTrash, PhFloppyDisk, PhSwap, PhWarning, PhPencil } from "@phosphor-icons/vue";

const props = defineProps({
  editTransaction: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'created']);

const typeId = ref(2); // 2.expense 1.income 3.transfer 4.debt 5.receivable
const mainTab = ref('Expense');
const amountStr = ref('0');
const categoryId = ref(null);
const sourceWalletId = ref(null);
const destWalletId = ref(null);
const notes = ref('');
const isNotesFocused = ref(false);

const getLocalDateStr = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const todayStr = getLocalDateStr(new Date());
const yesterdayStr = getLocalDateStr(new Date(Date.now() - 86400000));

const getNowStr = () => {
  const now = new Date();
  const dStr = getLocalDateStr(now);
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${dStr} ${h}:${m}`;
};

const date = ref(getNowStr());

const showDateModal = ref(false);

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const showKeypad = ref(true);

const categories = ref([]);
const wallets = ref([]);
const loading = ref(false);
const errorMsg = ref('');

const showWalletModal = ref(false);
const walletModalMode = ref('source');

const TYPE_ITEMS = [
  { id: 2, tab: 'Expense', label: 'Pengeluaran', icon: 'PhArrowUpRight', activeBg: 'bg-accent text-white' },
  { id: 1, tab: 'Income', label: 'Pemasukan', icon: 'PhArrowDownLeft', activeBg: 'bg-accent text-white' },
  { id: 3, tab: 'Transfer', label: 'Transfer', icon: 'PhArrowsLeftRight', activeBg: 'bg-accent text-white' },
  { id: 4, tab: 'Debt', label: 'Hutang', icon: 'PhHandshake', activeBg: 'bg-accent text-white' },
  { id: 5, tab: 'Receivable', label: 'Piutang', icon: 'PhCoins', activeBg: 'bg-accent text-white' }
];

const filteredCategories = computed(() => {
  const cats = categories.value.filter(c => c.type_id === typeId.value);
  const storedOrderStr = localStorage.getItem(`cat_order_${typeId.value}`);
  if (storedOrderStr) {
    try {
      const order = JSON.parse(storedOrderStr);
      return [...cats].sort((a, b) => {
        const idxA = order.indexOf(a.id);
        const idxB = order.indexOf(b.id);
        const valA = idxA === -1 ? 999999 : idxA;
        const valB = idxB === -1 ? 999999 : idxB;
        return valA - valB;
      });
    } catch (e) {
      console.error(e);
    }
  }
  return cats;
});

const newCatName = ref('');
const newCatIcon = ref('PhShoppingCart');
const showAddCategorySheet = ref(false);
const categoryTab = ref('list');

import { ICON_GROUPS } from '../utils/iconList';
import { resolveIcon } from '../utils/helpers';

const handleAddCategory = async () => {
  if (!newCatName.value.trim()) {
    showToast('Nama kategori tidak boleh kosong', 'error');
    return;
  }
  try {
    const newCat = await api.createCategory({
      category_name: newCatName.value.trim(),
      type_id: typeId.value,
      icon: newCatIcon.value || 'PhShoppingCart'
    });
    newCatName.value = '';
    newCatIcon.value = 'PhShoppingCart';
    showAddCategorySheet.value = false;

    showToast('Kategori berhasil ditambahkan', 'success');

    const cats = await api.getCategories();
    categories.value = cats;

    if (newCat && newCat.id) {
      categoryId.value = newCat.id;
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const showEditCategorySheet = ref(false);
const editingCategory = ref(null);
const editCatName = ref('');
const editCatIcon = ref('PhShoppingCart');

const openEditCategory = (cat) => {
  editingCategory.value = cat;
  editCatName.value = cat.category_name;
  editCatIcon.value = cat.icon || 'PhShoppingCart';
  showEditCategorySheet.value = true;
};

const handleUpdateCategory = async () => {
  if (!editCatName.value.trim()) {
    showToast('Nama kategori tidak boleh kosong', 'error');
    return;
  }
  try {
    await api.updateCategory(editingCategory.value.id, {
      category_name: editCatName.value.trim(),
      icon: editCatIcon.value,
      type_id: editingCategory.value.type_id
    });
    showToast('Kategori berhasil diperbarui', 'success');
    showEditCategorySheet.value = false;
    editingCategory.value = null;

    const cats = await api.getCategories();
    categories.value = cats;
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const handleDeleteCategory = async () => {
  if (!confirm('Apakah Anda yakin ingin menghapus kategori ini? Semua transaksi terkait kategori ini juga akan terhapus.')) {
    return;
  }
  try {
    await api.deleteCategory(editingCategory.value.id);
    showToast('Kategori berhasil dihapus', 'success');
    showEditCategorySheet.value = false;
    editingCategory.value = null;

    const cats = await api.getCategories();
    categories.value = cats;

    if (categoryId.value === editingCategory.value.id) {
      categoryId.value = null;
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

const draggedIdx = ref(null);

const dragStart = (idx) => {
  draggedIdx.value = idx;
};

const dragOverItem = (targetIdx, event) => {
  if (draggedIdx.value === null || draggedIdx.value === targetIdx) return;

  const rect = event.currentTarget.getBoundingClientRect();
  const relativeY = event.clientY - rect.top;
  const height = rect.bottom - rect.top;

  const isMovingDown = targetIdx > draggedIdx.value;
  if (isMovingDown && relativeY < height / 2) {
    return;
  }
  if (!isMovingDown && relativeY > height / 2) {
    return;
  }

  const list = [...filteredCategories.value];
  const draggedItem = list[draggedIdx.value];
  list.splice(draggedIdx.value, 1);
  list.splice(targetIdx, 0, draggedItem);

  const orderIds = list.map(c => c.id);
  localStorage.setItem(`cat_order_${typeId.value}`, JSON.stringify(orderIds));

  const remaining = categories.value.filter(c => c.type_id !== typeId.value);
  categories.value = [...list, ...remaining];

  draggedIdx.value = targetIdx;
};

const dragEnd = () => {
  draggedIdx.value = null;
};

const liquidWallets = computed(() => {
  return wallets.value.filter(w => w.group_type !== 'System');
});

const selectedSourceWallet = computed(() => wallets.value.find(w => w.id === sourceWalletId.value));
const selectedDestWallet = computed(() => wallets.value.find(w => w.id === destWalletId.value));



const formattedDateLabel = computed(() => {
  const [datePart, timePart] = date.value.split(' ');
  const displayTime = (props.editTransaction && timePart) ? ` ${timePart}` : '';

  if (datePart === todayStr) return `Hari Ini${displayTime}`;
  if (datePart === yesterdayStr) return `Kemarin${displayTime}`;

  const parts = datePart.split('-');
  if (parts.length === 3) {
    const d = parseInt(parts[2]);
    const m = monthNames[parseInt(parts[1]) - 1].slice(0, 3);
    return `${d} ${m}${displayTime}`;
  }
  return date.value;
});

const swapWallets = () => {
  const tmp = sourceWalletId.value;
  sourceWalletId.value = destWalletId.value;
  destWalletId.value = tmp;
};

const populateForEdit = () => {
  const t = props.editTransaction;
  typeId.value = t.type_id;
  const typeItem = TYPE_ITEMS.find(item => item.id === t.type_id);
  mainTab.value = typeItem ? typeItem.tab : 'Expense';
  amountStr.value = Math.round(parseFloat(t.amount)).toString();
  categoryId.value = t.category_id;
  sourceWalletId.value = t.source_wallet_id;
  destWalletId.value = t.destination_wallet_id;
  notes.value = t.notes || '';
  if (t.date) {
    const d = new Date(t.date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    date.value = `${y}-${m}-${day} ${h}:${min}`;
  }
};

const loadOptions = async () => {
  try {
    const [cats, wals] = await Promise.all([api.getCategories(), api.getWallets()]);
    categories.value = cats;
    wallets.value = wals;
    if (props.editTransaction) {
      populateForEdit();
    } else {
      handleTypeChange(2, 'Expense');
    }
  } catch (err) {
    errorMsg.value = err.message;
  }
};

const handleTypeChange = (tId, tabName) => {
  typeId.value = tId;
  mainTab.value = tabName;
  categoryId.value = null;
  categoryTab.value = 'list';

  const liquid = wallets.value.filter(w => w.group_type !== 'System');
  const merchantSys = wallets.value.find(w => w.name.toLowerCase().includes('merchant') || w.name.toLowerCase().includes('external')) || wallets.value[0];
  const debtSys = wallets.value.find(w => w.name.toLowerCase().includes('hutang')) || merchantSys;
  const recSys = wallets.value.find(w => w.name.toLowerCase().includes('piutang')) || merchantSys;

  if (tId === 2) {
    if (liquid.length > 0) sourceWalletId.value = liquid[0].id;
    if (merchantSys) destWalletId.value = merchantSys.id;
  } else if (tId === 1) {
    if (merchantSys) sourceWalletId.value = merchantSys.id;
    if (liquid.length > 0) destWalletId.value = liquid[0].id;
  } else if (tId === 3) {
    if (liquid.length > 0) sourceWalletId.value = liquid[0].id;
    if (liquid.length > 1) destWalletId.value = liquid[1].id;
  } else if (tId === 4) {
    if (debtSys) sourceWalletId.value = debtSys.id;
    if (liquid.length > 0) destWalletId.value = liquid[0].id;
  } else if (tId === 5) {
    if (liquid.length > 0) sourceWalletId.value = liquid[0].id;
    if (recSys) destWalletId.value = recSys.id;
  }

  const matchingCats = categories.value.filter(c => c.type_id === tId);
  if (matchingCats.length > 0) categoryId.value = matchingCats[0].id;
};

const handleKeypad = (val) => {
  if (val === 'backspace') {
    if (amountStr.value.length <= 1) {
      amountStr.value = '0';
    } else {
      amountStr.value = amountStr.value.slice(0, -1);
    }
  } else {
    if (amountStr.value.length >= 12) return;
    if (val === '00' && amountStr.value.length >= 11) return;

    if (amountStr.value === '0') {
      amountStr.value = val;
    } else {
      amountStr.value += val;
    }
  }
};

const openWalletPicker = (mode) => {
  walletModalMode.value = mode;
  showWalletModal.value = true;
};

const selectWallet = (wId) => {
  if (walletModalMode.value === 'source') {
    sourceWalletId.value = wId;
  } else {
    destWalletId.value = wId;
  }
  showWalletModal.value = false;
};

const handleSubmit = async () => {
  const numAmount = parseFloat(amountStr.value || 0);
  if (!numAmount || numAmount <= 0) {
    errorMsg.value = 'Masukkan nominal transaksi yang valid';
    return;
  }
  if (!sourceWalletId.value || !destWalletId.value) {
    errorMsg.value = 'Pilih dompet terlebih dahulu';
    return;
  }

  loading.value = true;
  errorMsg.value = '';
  try {
    const payload = {
      date: date.value,
      type_id: typeId.value,
      category_id: categoryId.value || null,
      source_wallet_id: sourceWalletId.value,
      destination_wallet_id: destWalletId.value,
      amount: numAmount,
      subject: notes.value ? notes.value.slice(0, 30) : '-',
      notes: notes.value
    };

    if (props.editTransaction) {
      await api.updateTransaction(props.editTransaction.id, payload);
      showToast('Transaksi berhasil diperbarui', 'success');
    } else {
      await api.createTransaction(payload);
      showToast('Transaksi berhasil disimpan', 'success');
    }
    emit('created');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    loading.value = false;
  }
};

const showDeleteConfirm = ref(false);

const triggerDelete = () => {
  showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
  showDeleteConfirm.value = false;
  if (!props.editTransaction) return;

  loading.value = true;
  errorMsg.value = '';
  try {
    await api.deleteTransaction(props.editTransaction.id);
    showToast('Transaksi berhasil dihapus', 'success');
    emit('created');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    loading.value = false;
  }
};

onMounted(loadOptions);
</script>

<template>
  <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center animate-in fade-in duration-150">
    <div
      class="w-full max-w-md bg-white border-x border-slate-200 flex flex-col justify-between h-[100dvh] shadow-2xl relative z-10 overflow-hidden">

      <div
        class="sticky top-5 mb-8 pb-2 z-20 bg-white border-b border-slate-200 px-3.5 py-3 flex items-center justify-between shadow-xs shrink-0 gap-2">

        <div class="w-10 h-10 flex items-center justify-center shrink-0">
          <PhPencil v-if="editTransaction" :size="24" class="text-accent" />
        </div>

        <div class="flex items-center flex-1 py-0.5 overflow-x-auto no-scrollbar flex-nowrap min-w-0">
          <div class="flex items-center gap-1 mx-auto">
            <button v-for="item in TYPE_ITEMS" :key="item.id" type="button" @click="handleTypeChange(item.id, item.tab)"
              :class="[
                'rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-0 border shadow-2xs h-10 shrink-0',
                typeId === item.id
                  ? item.activeBg + ' border-transparent px-2'
                  : 'text-slate-600 border-none w-9'
              ]">
              <component :is="resolveIcon(item.icon)" v-if="resolveIcon(item.icon)" :size="24" />
              <span v-if="typeId === item.id" class="truncate transition-all duration-200">{{ item.label }}</span>
            </button>
          </div>
        </div>

        <button type="button" @click="$emit('close')"
          class="shrink-0 w-10 h-10 text-accent flex items-center justify-center transition-colors"
          aria-label="Tutup">
          <component :is="resolveIcon('PhX')" :size="24" weight="bold" />
        </button>

      </div>

      <div
        class="flex-1 pt-3 pb-0 px-0 space-y-3.5 overflow-y-auto no-scrollbar flex flex-col justify-between bg-slate-50">

        <div v-if="errorMsg"
          class="p-2.5 bg-rose-50 border border-rose-200 text-rose-500 rounded-xl text-xs font-semibold shrink-0 mx-4">
          {{ errorMsg }}
        </div>

        <div v-if="typeId === 3" class="p-4 shadow-xs space-y-3 shrink-0 mx-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-extrabold text-accent uppercase tracking-wider">Transfer Pindah Saldo</span>
            <button type="button" @click="swapWallets"
              class="px-2.5 py-1 bg-accent-light hover:opacity-90 border border-accent/20 text-accent rounded-lg text-xs font-bold transition-all flex items-center gap-1">
              <PhSwap :size="32" />
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" @click="openWalletPicker('source')"
              class="flex-1 p-3 flex flex-col items-center transition-colors relative min-h-[145px]">
              <span class="absolute top-2.5 left-3 text-[9px] font-black text-slate-400 uppercase">Dari</span>

              <div class="mt-4 flex-1 flex items-center justify-center">
                <div class="w-24 h-24 flex items-center justify-center text-accent">
                  <component :is="resolveIcon(selectedSourceWallet?.icon)"
                    v-if="resolveIcon(selectedSourceWallet?.icon)" :size="72" />
                  <span v-else class="text-xl">{{ selectedSourceWallet?.icon || '💵' }}</span>
                </div>
              </div>

              <span class="text-xs font-bold text-slate-900 truncate mt-2 max-w-full px-1 text-center">
                {{ selectedSourceWallet?.name || 'Pilih' }}
              </span>
              <p class="text-[10px] text-accent font-semibold mt-0.5 truncate max-w-full px-1 text-center">
                Rp {{ Number(selectedSourceWallet?.balance || 0).toLocaleString('id-ID') }}
              </p>
            </button>

            <div class="flex items-center justify-center shrink-0 w-5 h-5 rounded-full text-slate-900">
              <component :is="resolveIcon('PhArrowRight')" :size="34" weight="bold" />
            </div>
            <button type="button" @click="openWalletPicker('dest')"
              class="flex-1 p-3 flex flex-col items-center transition-colors relative min-h-[145px]">
              <span class="absolute top-2.5 left-3 text-[9px] font-black text-slate-400 uppercase">Ke</span>

              <div class="mt-4 flex-1 flex items-center justify-center">
                <div class="w-24 h-24 flex items-center justify-center text-accent">
                  <component :is="resolveIcon(selectedDestWallet?.icon)" v-if="resolveIcon(selectedDestWallet?.icon)"
                    :size="72" />
                  <span v-else class="text-xl">{{ selectedDestWallet?.icon || '💳' }}</span>
                </div>
              </div>

              <span class="text-xs font-bold text-slate-900 truncate mt-2 max-w-full px-1 text-center">
                {{ selectedDestWallet?.name || 'Pilih' }}
              </span>
              <p class="text-[10px] text-accent font-semibold mt-0.5 truncate max-w-full px-1 text-center">
                Rp {{ Number(selectedDestWallet?.balance || 0).toLocaleString('id-ID') }}
              </p>
            </button>
          </div>
        </div>

        <div v-else class="flex-1 flex flex-col min-h-0 space-y-2">

          <div class="flex justify-center shrink-0">
            <div
              class="flex p-0.5 bg-slate-200 border border-slate-200/50 rounded-xl relative w-56 select-none shadow-2xs">
              <div
                class="absolute top-0.5 bottom-0.5 left-0.5 bg-white rounded-lg shadow-sm transition-transform duration-250 ease-out w-[calc(50%-2px)]"
                :class="categoryTab === 'settings' ? 'translate-x-full' : 'translate-x-0'"></div>
              <button type="button" @click="categoryTab = 'list'"
                class="flex-1 py-1.5 text-center text-[10px] uppercase tracking-wider font-extrabold transition-colors duration-200 z-10"
                :class="categoryTab === 'list' ? 'text-accent' : 'text-slate-400'">
                Kategori
              </button>

              <button type="button" @click="categoryTab = 'settings'"
                class="flex-1 py-1.5 text-center text-[10px] uppercase tracking-wider font-extrabold transition-colors duration-200 z-10"
                :class="categoryTab === 'settings' ? 'text-accent' : 'text-slate-400'">
                Pengaturan
              </button>
            </div>
          </div>

          <Transition name="fade" mode="out-in">
            <!-- LIST VIEW -->
            <div v-if="categoryTab === 'list'" key="list" class="flex-1 flex flex-col min-h-0 space-y-1.5">
              <div v-if="filteredCategories.length === 0"
                class="p-4 bg-white rounded-2xl text-center text-xs text-slate-400 border border-slate-200 mx-4">
                Belum ada kategori.
              </div>

              <div v-else class="grid grid-cols-4 gap-2 overflow-y-auto no-scrollbar flex-1 px-4 py-1 content-start">
                <button v-for="c in filteredCategories" :key="c.id" type="button" @click="categoryId = c.id" :class="[
                  'p-2.5 rounded-2xl text-center flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-2xs min-h-[68px]',
                  categoryId === c.id
                    ? 'bg-accent-light/90 border-accent text-accent ring-2 ring-accent'
                    : 'bg-transparent'
                ]">
                  <span class="text-xl shrink-0 flex items-center justify-center">
                    <component :is="resolveIcon(c.icon)" v-if="resolveIcon(c.icon)" :size="22" />
                    <span v-else>{{ c.icon }}</span>
                  </span>
                  <span class="text-[10px] truncate leading-tight w-full">{{ c.category_name }}</span>
                </button>
              </div>
            </div>

            <div v-else key="settings" class="flex-1 flex flex-col min-h-0 space-y-1.5">
              <div class="px-4 py-1 shrink-0">
                <button type="button" @click="showAddCategorySheet = true"
                  class="w-full py-2.5 bg-accent bg-accent-hover text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-accent/25 flex items-center justify-center gap-1.5">
                  <span>+ Tambah Kategori Baru</span>
                </button>
              </div>

              <TransitionGroup name="list" tag="div" class="flex-1 overflow-y-auto space-y-1.5 px-4 no-scrollbar">
                <div v-for="(c, idx) in filteredCategories" :key="c.id" draggable="true" @dragstart="dragStart(idx)"
                  @dragover.prevent="dragOverItem(idx, $event)" @dragend="dragEnd" @click="openEditCategory(c)" :class="[
                    'flex items-center justify-between p-2.5 bg-white border border-slate-200/60 rounded-xl shadow-2xs cursor-pointer hover:border-accent/40',
                    draggedIdx === idx ? 'opacity-40 scale-[0.98] border-accent/40' : ''
                  ]">
                  <div class="flex items-center gap-2.5 flex-1 min-w-0">
                    <span class="text-base shrink-0 flex items-center justify-center">
                      <component :is="resolveIcon(c.icon)" v-if="resolveIcon(c.icon)" :size="18"
                        class="text-slate-700" />
                      <span v-else>{{ c.icon }}</span>
                    </span>
                    <span class="text-xs font-bold text-slate-800 truncate">{{ c.category_name }}</span>
                  </div>
                  <span @click.stop
                    class="text-slate-400 cursor-grab active:cursor-grabbing font-black text-xs select-none p-1.5 hover:text-slate-600 transition-colors">☰</span>
                </div>
              </TransitionGroup>
            </div>
          </Transition>
        </div>

        <div
          class="bg-white border-t border-slate-200 rounded-t-3xl p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] space-y-2.5 shrink-0 pb-6">

          <div class="flex items-center justify-between border-b border-slate-100 pb-2 px-0.5 gap-2">

            <template v-if="!isNotesFocused && typeId !== 3">
              <button type="button" @click="openWalletPicker(typeId === 1 || typeId === 4 ? 'dest' : 'source')"
                class="h-[38px] px-2.5 bg-accent-light hover:opacity-90 border border-accent/20 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 shadow-2xs max-w-[110px]">
                <span class="text-xs shrink-0 flex items-center justify-center">
                  <component
                    :is="resolveIcon((typeId === 1 || typeId === 4 ? selectedDestWallet : selectedSourceWallet)?.icon)"
                    v-if="resolveIcon((typeId === 1 || typeId === 4 ? selectedDestWallet : selectedSourceWallet)?.icon)"
                    :size="16" />
                  <span v-else>{{ (typeId === 1 || typeId === 4 ? selectedDestWallet : selectedSourceWallet)?.icon ||
                    '💵' }}</span>
                </span>
                <span class="truncate text-[11px]">{{ (typeId === 1 || typeId === 4 ? selectedDestWallet :
                  selectedSourceWallet)?.name || 'Dompet' }}</span>
                <span class="text-[9px] text-accent shrink-0">▾</span>
              </button>
            </template>

            <div :class="[isNotesFocused || typeId === 3 ? 'w-full' : 'flex-1 min-w-0']" class="transition-all">
              <div v-if="isNotesFocused" class="space-y-1.5">
                <textarea v-model="notes" @blur="isNotesFocused = false" rows="3" placeholder="Catatan..."
                  class="w-full bg-slate-50 border border-accent rounded-xl text-xs font-semibold text-slate-800 p-2.5 focus:outline-none focus:bg-white resize-none leading-relaxed shadow-2xs"
                  autoFocus></textarea>
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-slate-400 font-bold">Catatan Transaksi</span>
                  <button @mousedown.prevent="isNotesFocused = false"
                    class="px-2.5 py-1 bg-accent bg-accent-hover text-white rounded-lg text-xs font-extrabold shadow-2xs">
                    Selesai
                  </button>
                </div>
              </div>

              <input v-else v-model="notes" @focus="isNotesFocused = true" type="text" placeholder="Catatan..."
                class="w-full h-[38px] bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 px-3 focus:outline-none focus:border-accent focus:bg-white transition-all truncate" />
            </div>

            <div v-if="!isNotesFocused" class="flex items-baseline gap-1 shrink-0 pl-1">
              <span class="text-xs font-black text-slate-400">Rp</span>
              <span class="text-xl font-black text-slate-900 tracking-tight">{{ Number(amountStr ||
                0).toLocaleString('id-ID')
              }}</span>
            </div>

          </div>

          <div class="flex gap-1.5 items-center">

            <button type="button" @click="showDateModal = true"
              class="flex-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1 min-w-0"
              title="Pilih Tanggal Transaksi">
              <PhCalendarDots :size="16" class="shrink-0" />
              <span class="truncate">{{ formattedDateLabel }}</span>
            </button>

            <button type="button" @click="showKeypad = !showKeypad" :class="[
              'py-2 px-3 border rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0',
              showKeypad
                ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                : 'bg-accent-light text-accent border-accent/20'
            ]" :title="showKeypad ? 'Sembunyikan Papan Ketik' : 'Tampilkan Papan Ketik'">
              <PhKeyboard :size="16" />
              <span>{{ showKeypad ? 'Sembunyi' : 'Keypad' }}</span>
            </button>

            <button v-if="editTransaction" type="button" @click="triggerDelete" :disabled="loading"
              class="py-2 px-3 bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
              title="Hapus Transaksi">
              <PhTrash :size="16" />
            </button>

            <button type="button" @click="handleSubmit" :disabled="loading"
              class="flex-1 py-2 px-3 bg-accent bg-accent-hover active:scale-98 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 min-w-0">
              <PhFloppyDisk :size="16" class="shrink-0" />
              <span class="truncate">{{ loading ? '...' : 'Simpan' }}</span>
            </button>

          </div>

          <div v-show="showKeypad" class="pt-1">
            <Keypad @key="handleKeypad" />
          </div>
        </div>
      </div>
    </div>

    <Calendar v-if="showDateModal" v-model="date" :allow-future="false" :show-time="true"
      @close="showDateModal = false" />

    <Teleport to="body">
      <div v-if="showWalletModal"
        class="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        @click.self="showWalletModal = false">
        <div
          class="w-full max-w-xs bg-white rounded-2xl p-4 shadow-2xl border border-slate-100 space-y-3 relative z-[101]">
          <h3 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Pilih Dompet {{ walletModalMode ===
            'source' ? 'Asal' : 'Tujuan' }}</h3>

          <div class="space-y-1.5 max-h-56 overflow-y-auto">
            <button v-for="w in liquidWallets" :key="w.id" @click="selectWallet(w.id)"
              class="w-full p-2.5 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 text-left">
              <div class="flex items-center gap-2.5">
                <span class="shrink-0 flex items-center justify-center text-slate-500 w-4 h-4">
                  <component :is="resolveIcon(w.icon)" v-if="resolveIcon(w.icon)" :size="16" />
                  <span v-else>{{ w.icon }}</span>
                </span>
                <span class="text-xs font-bold text-slate-900">{{ w.name }}</span>
              </div>
              <span class="text-xs font-bold text-accent">Rp {{ Number(w.balance).toLocaleString('id-ID') }}</span>
            </button>
          </div>

          <button @click="showWalletModal = false"
            class="w-full py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl">Batal</button>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showDeleteConfirm"
        class="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
        <div class="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 text-center">
          <div class=" p-4 rounded-full inline-flex">
            <PhWarning :size="52" color="#ec2727" />
          </div>
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Konfirmasi Hapus</h3>
          <p class="text-xs text-slate-500 font-semibold leading-relaxed">Apakah Anda yakin ingin menghapus transaksi
            ini?
          </p>
          <div class="flex gap-2.5 pt-1">
            <button @click="showDeleteConfirm = false"
              class="flex-1 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border border-slate-200">
              Batal
            </button>
            <button @click="confirmDelete"
              class="flex-1 py-2 bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-500/25">
              Ya, Hapus
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showAddCategorySheet"
        class="fixed inset-0 z-[105] bg-slate-50 flex flex-col w-full max-w-md mx-auto shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250">
        <div
          class="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
          <button @click="showAddCategorySheet = false"
            class="p-1 rounded-full text-accent text-xs font-bold flex items-center gap-1">
            <PhArrowLeft :size="24" weight="bold"/>
          </button>
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Tambah Kategori</h3>
          <div class="w-12"></div>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-20">
          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Nama Kategori</label>
            <input v-model="newCatName" type="text" placeholder="Nama Kategori (cth: Belanja)"
              class="w-full bg-white border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent font-bold text-slate-800" />
          </div>

          <div class="space-y-1.5 flex-1 flex flex-col min-h-0">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Pilih Icon</label>
            <div class="flex-1 overflow-y-auto p-3 bg-white border border-slate-200 rounded-2xl space-y-4 no-scrollbar">
              <div v-for="g in ICON_GROUPS" :key="g.group" class="space-y-1.5">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">{{ g.group
                  }}</span>
                <div class="grid grid-cols-4 gap-2">
                  <button v-for="ico in g.icons" :key="ico.name" type="button" @click="newCatIcon = ico.name"
                    class="aspect-square rounded-2xl flex items-center justify-center transition-all hover:bg-slate-100 border border-slate-100 shrink-0"
                    :class="newCatIcon === ico.name ? 'bg-accent-light border-accent text-accent ring-2 ring-accent' : 'text-slate-600 bg-slate-50/50'"
                    :title="ico.label">
                    <component :is="resolveIcon(ico.name)" :size="28" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 bg-white border-t border-slate-200 shrink-0">
          <button @click="handleAddCategory"
            class="w-full py-3 bg-accent bg-accent-hover text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-accent/25">
            Simpan Kategori
          </button>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showEditCategorySheet"
        class="fixed inset-0 z-[105] bg-slate-50 flex flex-col w-full max-w-md mx-auto shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250">
        <div
          class="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
          <button @click="showEditCategorySheet = false"
            class="p-1 rounded-full text-accent text-xs font-bold flex items-center gap-1">
            <PhArrowLeft :size="24" weight="bold"/>
          </button>
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Ubah Kategori</h3>
          <button @click="handleDeleteCategory"
            class="text-xs font-extrabold text-rose-500 hover:text-rose-700">Hapus</button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-20">
          <div class="space-y-1.5">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Nama Kategori</label>
            <input v-model="editCatName" type="text" placeholder="Nama Kategori (cth: Belanja)"
              class="w-full bg-white border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent font-bold text-slate-800" />
          </div>

          <div class="space-y-1.5 flex-1 flex flex-col min-h-0">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Pilih Icon</label>
            <div class="flex-1 overflow-y-auto p-3 bg-white border border-slate-200 rounded-2xl space-y-4 no-scrollbar">
              <div v-for="g in ICON_GROUPS" :key="g.group" class="space-y-1.5">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">{{ g.group
                  }}</span>
                <div class="grid grid-cols-4 gap-2">
                  <button v-for="ico in g.icons" :key="ico.name" type="button" @click="editCatIcon = ico.name"
                    class="aspect-square rounded-2xl flex items-center justify-center transition-all hover:bg-slate-100 border border-slate-100 shrink-0"
                    :class="editCatIcon === ico.name ? 'bg-accent-light border-accent text-accent ring-2 ring-accent' : 'text-slate-600 bg-slate-50/50'"
                    :title="ico.label">
                    <component :is="resolveIcon(ico.name)" :size="28" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 bg-white border-t border-slate-200 shrink-0">
          <button @click="handleUpdateCategory"
            class="w-full py-3 bg-accent bg-accent-hover text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-accent/25">
            Simpan Perubahan
          </button>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(2px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}

.list-move {
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
}
</style>
