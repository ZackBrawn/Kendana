<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api, getAuthToken, setAuthToken } from './api';
import { applyAccentColor } from './utils/theme';
import { resolveIcon } from './utils/helpers';
import Record from './components/Record.vue';
import Detail from './components/Detail.vue';
import Transaction from './components/Transaction.vue';
import { startSyncListener } from './utils/syncService';
import { PhPlus, PhHouse, PhCardholder, PhChartPieSlice, PhFaders, PhSignOut, PhCheck, PhX, PhWarning, PhMagnifyingGlass, PhArrowLeft, PhCaretRight, PhCaretDown, PhWifiSlash, PhArrowsClockwise } from "@phosphor-icons/vue";


const hideChromeRoutes = ['Auth', 'Chat', 'Budgets', 'Notifications'];
const showChrome = computed(() => !hideChromeRoutes.includes(route.name));

const router = useRouter();
const route = useRoute();
const user = ref(null);
const showRecordModal = ref(false);
const editTransactionData = ref(null);
const showDetailModal = ref(false);
const selectedTransaction = ref(null);
const isOffline = ref(typeof navigator !== 'undefined' && !navigator.onLine);
const isSyncing = ref(false);

const checkUser = async () => {
  if (getAuthToken()) {
    try {
      const res = await api.getMe();
      user.value = res.user;
      if (res.user && res.user.accent_color) {
        applyAccentColor(res.user.accent_color);
      }
    } catch {
      setAuthToken(null);
      router.push('/login');
    }
  }
};

// watch route path to refresh user data if token exists and user is not loaded
// and also close search modal when navigating via browser back button
watch(() => route.fullPath, (newPath) => {
  if (route.name !== 'Auth' && !user.value) {
    checkUser();
  }
  if (showSearchModal.value && !newPath.includes('#search')) {
    showSearchModal.value = false;
    searchQuery.value = '';
    searchResults.value = [];
  }
});

const openSearchModal = () => {
  showSearchModal.value = true;
  router.push({ hash: '#search' });
};

const closeSearchModal = () => {
  if (route.hash === '#search') {
    router.back();
  } else {
    showSearchModal.value = false;
  }
};

const handleLogout = () => {
  setAuthToken(null);
  user.value = null;
  router.push('/login');
};

const handleRecordCreated = () => {
  showRecordModal.value = false;
  window.dispatchEvent(new CustomEvent('reload-data'));
};

const handleOpenEditModal = (event) => {
  editTransactionData.value = event.detail?.transaction || null;
  showRecordModal.value = true;
};

const handleOpenDetailModal = (event) => {
  selectedTransaction.value = event.detail?.transaction || null;
  showDetailModal.value = true;
};

const handleOpenEditFromDetail = () => {
  editTransactionData.value = selectedTransaction.value;
  showDetailModal.value = false;
  showRecordModal.value = true;
};

const handleDeletedFromDetail = () => {
  showDetailModal.value = false;
  handleRecordCreated();
};

const toasts = ref([]);

const addToast = (message, type = 'success') => {
  const id = Date.now() + Math.random();
  toasts.value.push({ id, message, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, 3000);
};

const handleShowToast = (event) => {
  addToast(event.detail?.message, event.detail?.type || 'success');
};

const handleOpenCreateModal = () => {
  editTransactionData.value = null;
  showRecordModal.value = true;
};

const showSearchModal = ref(false);
const searchQuery = ref('');
const searchResults = ref([]);
const searchLoading = ref(false);
let searchDebounceTimeout = null;

const handleSearchInput = () => {
  if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
  
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }

  searchLoading.value = true;
  searchDebounceTimeout = setTimeout(async () => {
    try {
      const res = await api.globalSearch(searchQuery.value);
      searchResults.value = res.results || [];
    } catch (err) {
      console.error(err);
    } finally {
      searchLoading.value = false;
    }
  }, 350);
};

const handleSearchResultClick = (result) => {
  if (result.type === 'Transaksi') {
    // Buka detail tanpa menutup search overlay
    window.dispatchEvent(new CustomEvent('open-detail-modal', { detail: { transaction: result } }));
  } else {
    closeSearchModal();
    router.push(result.route);
  }
};

const mapSearchTransaction = (res) => {
  return {
    ...res,
    id: res.transaction_id,
    subject: res.label !== 'Transaksi' ? res.label : '-',
    type_name: res.transaction_type?.name,
    category_name: res.category?.category_name,
    category_icon: res.category?.icon,
    source_wallet_name: res.source_wallet?.name,
    dest_wallet_name: res.destination_wallet?.name,
  };
};

const handleSwipeEdit = (tx) => {
  closeSearchModal();
  editTransactionData.value = tx;
  showRecordModal.value = true;
};

const handleSwipeDelete = (tx) => {
  closeSearchModal();
  window.dispatchEvent(new CustomEvent('open-detail-modal', { detail: { transaction: tx } }));
};

const searchNonTransactions = computed(() => {
  return searchResults.value.filter(r => r.type !== 'Transaksi');
});

const searchGroupedTransactions = computed(() => {
  const txs = searchResults.value.filter(r => r.type === 'Transaksi');
  if (txs.length === 0) return [];

  const groups = {};
  txs.forEach(t => {
    let dateStr = 'Unknown';
    if (t.date) {
      const d = new Date(t.date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dateStr = `${y}-${m}-${day}`;
    }
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

const collapsedSearchGroups = ref({});
const toggleSearchGroup = (dateStr) => {
  collapsedSearchGroups.value[dateStr] = !collapsedSearchGroups.value[dateStr];
};
const isSearchGroupCollapsed = (dateStr) => !!collapsedSearchGroups.value[dateStr];

const formatSearchGroupDate = (dateStr) => {
  if (dateStr === 'Unknown') return 'Tidak Diketahui';
  const d = new Date(dateStr + 'T00:00:00'); // parse as local
  const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  
  const getLocalStr = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const db = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${db}`;
  };
  const today = getLocalStr(new Date());
  const yesterday = getLocalStr(new Date(Date.now() - 86400000));

  const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });

  if (dateStr === today) return `Hari Ini — ${dateFormatted}`;
  if (dateStr === yesterday) return `Kemarin — ${dateFormatted}`;
  return `${dayName}, ${dateFormatted}`;
};

let presenceInterval = null;

const reportUserPresence = async (state) => {
  if (getAuthToken()) {
    try {
      await api.reportPresence(state);
    } catch (e) {
      // Ignore
    }
  }
};

const startPresenceReporting = () => {
  if (presenceInterval) return;
  reportUserPresence('active');
  presenceInterval = setInterval(() => {
    reportUserPresence('active');
  }, 20000);
};

const stopPresenceReporting = () => {
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }
  reportUserPresence('away');
};

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    startPresenceReporting();
  } else {
    stopPresenceReporting();
  }
};

onMounted(() => {
  checkUser();
  window.addEventListener('open-edit-modal', handleOpenEditModal);
  window.addEventListener('open-detail-modal', handleOpenDetailModal);
  window.addEventListener('show-toast', handleShowToast);
  
  startPresenceReporting();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', startPresenceReporting);
  window.addEventListener('blur', stopPresenceReporting);

  startSyncListener();
  window.addEventListener('online', () => { isOffline.value = false; isSyncing.value = true; });
  window.addEventListener('offline', () => { isOffline.value = true; });
  window.addEventListener('sync-completed', () => { isSyncing.value = false; addToast('Data berhasil disinkronisasi', 'success'); });
});

onUnmounted(() => {
  window.removeEventListener('open-edit-modal', handleOpenEditModal);
  window.removeEventListener('open-detail-modal', handleOpenDetailModal);
  window.removeEventListener('show-toast', handleShowToast);
  
  stopPresenceReporting();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('focus', startPresenceReporting);
  window.removeEventListener('blur', stopPresenceReporting);

  window.removeEventListener('online', () => { isOffline.value = false; isSyncing.value = true; });
  window.removeEventListener('offline', () => { isOffline.value = true; });
  window.removeEventListener('sync-completed', () => { isSyncing.value = false; });
});
</script>

<template>
  <div class="min-h-screen bg-slate-200 flex justify-center selection:bg-accent selection:text-white">
    <div
      class="w-full max-w-md bg-slate-50 min-h-screen border-x border-slate-200 shadow-xl flex flex-col relative"
      :class="showChrome ? 'pb-24' : ''">

      <header v-if="showChrome"
        class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div class="flex items-center gap-2.5">
          <div
            class="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-white font-extrabold text-base shadow-sm">
            F
          </div>
          <div>
            <h1 class="text-sm font-extrabold text-slate-900 tracking-tight leading-tight">Kendana</h1>
            <p class="text-[10px] text-accent font-bold uppercase tracking-wider">Kendalikan Dana Anda</p>
          </div>
        </div>

        <div v-if="user" class="flex items-center gap-2">
          <button @click="openSearchModal" title="Cari Global"
            class="p-1.5 rounded-lg text-slate-400 hover:text-accent hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer animate-pulse">
            <PhMagnifyingGlass :size="16" weight="bold" />
          </button>
          <span class="text-xs font-semibold text-slate-700 max-w-[80px] truncate">{{ user.name }}</span>
          <button @click="handleLogout" title="Logout"
            class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer">
            <PhSignOut :size="16" weight="bold" />
          </button>
        </div>
      </header>
      
      <div v-if="isOffline" class="bg-amber-100 text-amber-800 text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 shadow-xs z-20">
        <PhWifiSlash :size="16" weight="bold" />
        Anda sedang offline. Data akan disinkronisasi saat online.
      </div>
      <div v-if="isSyncing" class="bg-blue-100 text-blue-800 text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 shadow-xs z-20">
        <PhArrowsClockwise :size="16" weight="bold" class="animate-spin" />
        Menyinkronkan data...
      </div>

      <main class="flex-1 overflow-x-hidden" :class="['Chat', 'Budgets'].includes(route.name) ? '' : 'p-4'">
        <router-view />
      </main>

      <nav v-if="showChrome"
        class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-xl border-t border-slate-200/80 p-2 flex items-center justify-around shadow-lg z-40 h-[64px]">

        <router-link to="/"
          class="nav-link flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-accent transition-all duration-200 py-1 px-3"
          active-class="text-accent font-bold">
          <PhHouse :size="24" />
          <span class="text-[9px] transition-all">Home</span>
        </router-link>

        <router-link to="/wallets"
          class="nav-link flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-accent transition-all duration-200 py-1 px-3"
          active-class="text-accent font-bold">
          <PhCardholder :size="24" />
          <span class="text-[9px] transition-all">Aset</span>
        </router-link>

        <button @click="handleOpenCreateModal"
          class="flex flex-col items-center justify-center text-white hover:opacity-90 transition-all py-1.5 px-3.5 bg-accent rounded-full shadow-md shrink-0">
          <PhPlus :size="24" />
        </button>

        <router-link to="/analytics"
          class="nav-link flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-accent transition-all duration-200 py-1 px-3"
          active-class="text-accent font-bold">
          <PhChartPieSlice :size="24" />
          <span class="text-[9px] transition-all">Grafik</span>
        </router-link>

        <router-link to="/other"
          class="nav-link flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-accent transition-all duration-200 py-1 px-3"
          active-class="text-accent font-bold">
          <PhFaders :size="24" />
          <span class="text-[9px] transition-all">Lainnya</span>
        </router-link>
      </nav>

      <!-- GLOBAL SEARCH (FULL PAGE) -->
      <Teleport to="body">
        <div v-if="showSearchModal"
          class="fixed inset-0 z-40 bg-slate-50 flex flex-col w-full max-w-md mx-auto shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250">

          <!-- header -->
          <div class="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-xs shrink-0">
            <button @click="closeSearchModal"
              class="p-1 rounded-full text-accent text-xs font-bold flex items-center gap-1 cursor-pointer">
              <PhArrowLeft :size="24" weight="bold" />
            </button>

            <div class="relative flex-1">
              <PhMagnifyingGlass class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" :size="18" />
              <input v-model="searchQuery" @input="handleSearchInput" type="text" placeholder="Cari transaksi, dompet, kategori..."
                class="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-accent focus:bg-white transition-all"
                autofocus />
            </div>
          </div>

          <!-- hasil pencarian -->
          <div class="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            <div v-if="searchLoading" class="text-center py-16 text-xs text-slate-400 font-bold flex flex-col items-center gap-2">
              <span class="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></span>
              Sedang mencari...
            </div>

            <div v-else-if="!searchQuery.trim()" class="text-center py-16 text-xs text-slate-400 font-bold">
              Ketik kata kunci untuk mulai mencari
            </div>

            <div v-else-if="searchQuery.trim() && searchResults.length === 0" class="text-center py-16 text-xs text-slate-400 font-bold">
              Tidak ada hasil untuk "{{ searchQuery }}"
            </div>

            <div v-else class="space-y-4">
              <!-- Non-Transactions (Wallets & Categories) -->
              <div v-if="searchNonTransactions.length > 0" class="space-y-2">
                <button v-for="res in searchNonTransactions" :key="res.id" @click="handleSearchResultClick(res)"
                  class="w-full p-3 bg-white border border-slate-200/60 rounded-2xl flex items-center justify-between hover:bg-slate-100 hover:border-slate-300 active:scale-[0.98] transition-all text-left shadow-xs">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shadow-3xs shrink-0">
                      <component :is="resolveIcon(res.icon)" v-if="resolveIcon(res.icon)" :size="20" />
                      <span v-else class="text-base">{{ res.icon }}</span>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-1.5">
                        <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md tracking-wider shadow-4xs"
                          :class="[
                            res.type === 'Wallet' ? 'bg-blue-50 text-blue-700 border border-blue-200/55' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-200/55'
                          ]">
                          {{ res.type }}
                        </span>
                        <span class="text-xs font-black text-slate-800 truncate leading-tight">{{ res.label }}</span>
                      </div>
                      <p class="text-[10px] text-slate-400 font-bold mt-1 truncate leading-none">{{ res.description }}</p>
                    </div>
                  </div>
                  <PhCaretRight :size="14" weight="bold" class="text-slate-400 shrink-0" />
                </button>
              </div>

              <!-- Transactions Grouped by Date -->
              <div v-if="searchGroupedTransactions.length > 0" class="space-y-3.5">
                <div v-for="group in searchGroupedTransactions" :key="group.date" class="shadow-md rounded-2xl">
                  
                  <!-- Date Header -->
                  <div @click="toggleSearchGroup(group.date)"
                    class="flex items-center justify-between cursor-pointer select-none px-3.5 py-2.5 bg-slate-100 border border-slate-200/50 hover:bg-slate-200/50 transition-all"
                    :class="isSearchGroupCollapsed(group.date) ? 'rounded-xl' : 'rounded-t-xl border-b-0'">
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      {{ formatSearchGroupDate(group.date) }}
                    </span>
                    <PhCaretDown :size="14" weight="fill" class="text-accent transition-transform duration-700"
                      :class="{ '-rotate-180': isSearchGroupCollapsed(group.date) }" />
                  </div>

                  <!-- Transactions List -->
                  <div v-show="!isSearchGroupCollapsed(group.date)"
                    class="bg-white border border-slate-200/80 rounded-b-2xl rounded-t-none divide-y divide-slate-100 shadow-xs overflow-hidden">
                    <Transaction
                      v-for="t in group.transactions"
                      :key="t.id"
                      :transaction="mapSearchTransaction(t)"
                      @click="() => handleSearchResultClick(t)"
                      @edit="handleSwipeEdit"
                      @delete="handleSwipeDelete"
                    />
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      </Teleport>

      <Record v-if="showRecordModal" :editTransaction="editTransactionData" @close="showRecordModal = false"
        @created="handleRecordCreated" />

      <Detail v-if="showDetailModal" :transaction="selectedTransaction" @close="showDetailModal = false"
        @edit="handleOpenEditFromDetail" @deleted="handleDeletedFromDetail" />

      <div class="fixed top-4 right-4 z-[999] flex flex-col gap-2 max-w-[280px] pointer-events-none">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="p-3.5 rounded-xl shadow-lg border text-xs font-bold transition-all duration-300 pointer-events-auto flex items-center gap-2 bg-white animate-in slide-in-from-top-2"
          :class="[
            toast.type === 'success' ? 'text-accent border-accent-hover/55 bg-accent-hover/95' : 
            toast.type === 'error' ? 'text-rose-800 border-rose-200 bg-rose-50/95' : 
            'text-slate-800 border-slate-200 bg-slate-50/95'
          ]"
        >
          <component :is="toast.type === 'success' ? PhCheck : toast.type === 'error' ? PhX : PhWarning" :size="16" weight="bold" class="shrink-0" />
          <span class="flex-1 break-words leading-tight">{{ toast.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>