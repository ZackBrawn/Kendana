<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';
import { formatRp } from '../utils/helpers';
import { PhHandCoins, PhHandshake } from '../utils/icons';
import SketchCard from '../components/SketchCard.vue';
import SketchTabs from '../components/SketchTabs.vue';

const TABS = [
  { value: 'debt', label: 'Hutang Saya', icon: PhHandCoins },
  { value: 'receivable', label: 'Piutang Teman', icon: PhHandshake }
];

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

    <SketchTabs v-model="activeTab" :tabs="TABS" @update:model-value="handleTabChange" />

    <div v-if="loans.length === 0"
      class="text-center text-slate-400 text-xs font-medium">
      <SketchCard class="bg-white p-6">
        Belum ada pencatatan {{ activeTab === 'debt' ? 'hutang' : 'piutang' }}.
      </SketchCard>
    </div>

    <div v-else class="space-y-2">
      <SketchCard v-for="l in loans" :key="l.id" class="bg-white p-3.5 flex items-center justify-between">
        <div>
          <p class="text-xs font-bold text-slate-900">{{ l.subject !== '-' ? l.subject : l.category_name }}</p>
          <p class="text-[10px] text-slate-400 font-medium">{{ l.date ? l.date.split('T')[0] : '' }}</p>
        </div>
        <p :class="['text-xs font-black', activeTab === 'debt' ? 'text-rose-500' : 'text-emerald-600']">
          {{ formatRp(l.amount) }}
        </p>
      </SketchCard>
    </div>
  </div>
</template>

