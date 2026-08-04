<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';
import { formatRp } from '../utils/helpers';

const activeTab = ref('debt'); // debt / receivable
const loans = ref([]);

const loadLoans = async () => {
  try {
    loans.value = await api.getLoans(activeTab.value);
  } catch (err) {
    console.error(err);
  }
};

const handleTabChange = (tab) => {
  activeTab.value = tab;
  loadLoans();
};


onMounted(loadLoans);
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Hutang & Piutang</h2>

    <div class="grid grid-cols-2 gap-1 bg-slate-200/60 p-1 rounded-xl">
      <button @click="handleTabChange('debt')"
        :class="activeTab === 'debt' ? 'bg-white text-rose-500 font-bold shadow-xs' : 'text-slate-500'"
        class="py-2 text-xs rounded-lg transition-all">Hutang Saya</button>
      <button @click="handleTabChange('receivable')"
        :class="activeTab === 'receivable' ? 'bg-white text-emerald-600 font-bold shadow-xs' : 'text-slate-500'"
        class="py-2 text-xs rounded-lg transition-all">Piutang Teman</button>
    </div>

    <div v-if="loans.length === 0"
      class="bg-white border border-slate-200/80 rounded-2xl p-6 text-center text-slate-400 text-xs font-medium">
      Belum ada pencatatan {{ activeTab === 'debt' ? 'hutang' : 'piutang' }}.
    </div>

    <div v-else class="space-y-2">
      <div v-for="l in loans" :key="l.id"
        class="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
        <div>
          <p class="text-xs font-bold text-slate-900">{{ l.subject !== '-' ? l.subject : l.category_name }}</p>
          <p class="text-[10px] text-slate-400 font-medium">{{ l.date ? l.date.split('T')[0] : '' }}</p>
        </div>
        <p :class="['text-xs font-black', activeTab === 'debt' ? 'text-rose-500' : 'text-emerald-600']">
          {{ formatRp(l.amount) }}
        </p>
      </div>
    </div>
  </div>
</template>
