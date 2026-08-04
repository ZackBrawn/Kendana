<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api, getAuthToken, setAuthToken } from './api';
import Record from './components/Record.vue';
import Detail from './components/Detail.vue';
import { PhPlus, PhHouse, PhCardholder, PhChartPieSlice, PhFaders, PhSignOut, PhCheck, PhX, PhWarning } from "@phosphor-icons/vue";

const router = useRouter();
const route = useRoute();
const user = ref(null);
const showRecordModal = ref(false);
const editTransactionData = ref(null);
const showDetailModal = ref(false);
const selectedTransaction = ref(null);

const checkUser = async () => {
  if (getAuthToken()) {
    try {
      const res = await api.getMe();
      user.value = res.user;
    } catch {
      setAuthToken(null);
      router.push('/login');
    }
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

onMounted(() => {
  checkUser();
  window.addEventListener('open-edit-modal', handleOpenEditModal);
  window.addEventListener('open-detail-modal', handleOpenDetailModal);
  window.addEventListener('show-toast', handleShowToast);
});

onUnmounted(() => {
  window.removeEventListener('open-edit-modal', handleOpenEditModal);
  window.removeEventListener('open-detail-modal', handleOpenDetailModal);
  window.removeEventListener('show-toast', handleShowToast);
});
</script>

<template>
  <div class="min-h-screen bg-slate-200 flex justify-center selection:bg-indigo-500 selection:text-white">
    <div
      class="w-full max-w-md bg-slate-50 min-h-screen border-x border-slate-200 shadow-xl flex flex-col relative pb-24">

      <header v-if="route.name !== 'Auth'"
        class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div class="flex items-center gap-2.5">
          <div
            class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm">
            F
          </div>
          <div>
            <h1 class="text-sm font-extrabold text-slate-900 tracking-tight leading-tight">Kendana</h1>
            <p class="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Personal Finance</p>
          </div>
        </div>

        <div v-if="user" class="flex items-center gap-2">
          <span class="text-xs font-semibold text-slate-700 max-w-[100px] truncate">{{ user.name }}</span>
          <button @click="handleLogout" title="Logout"
            class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors flex items-center justify-center">
            <PhSignOut :size="16" weight="bold" />
          </button>
        </div>
      </header>

      <main class="flex-1 p-4 overflow-x-hidden">
        <router-view />
      </main>

      <nav v-if="route.name !== 'Auth'"
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
          class="flex flex-col items-center justify-center text-white hover:opacity-90 transition-all py-1.5 px-3.5 bg-accent bg-accent-hover rounded-full shadow-md shrink-0">
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
            toast.type === 'success' ? 'text-emerald-800 border-emerald-200 bg-emerald-50/95' : 
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
