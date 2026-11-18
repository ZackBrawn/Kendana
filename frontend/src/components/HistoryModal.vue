<script setup>
import { ref, computed, watch } from 'vue';
import { PhX, PhCaretDown } from "../utils/icons";
import RoughChart from './RoughChart.vue';
import { formatRp, resolveIcon, groupTransactionsByDate, calculateGroupTotals } from '../utils/helpers';
import Transaction from './Transaction.vue';
import SketchCard from './SketchCard.vue';
import SketchDivider from './SketchDivider.vue';
import SketchTabs from './SketchTabs.vue';

const props = defineProps({
  show: Boolean,
  historyItem: Object,
  activeTypeId: Number
});

const emit = defineEmits(['close', 'edit', 'delete', 'click-tx']);

const barChartInterval = ref('day');
const collapsedGroups = ref({});

const getGroupTotals = (transactions) => calculateGroupTotals(transactions);

const getWeekNumber = (d) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return date.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0');
};

const getMonthKey = (d) => {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};

const processBarChartData = (transactions, interval) => {
  const groups = {};

  transactions.forEach(t => {
    if (!t.date) return;
    const d = new Date(t.date);
    let key = '';
    let label = '';

    if (interval === 'day') {
      key = t.date.split('T')[0];
      label = d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'][d.getMonth()];
    } else if (interval === 'week') {
      key = getWeekNumber(d);
      label = 'Minggu ' + key.split('-W')[1];
    } else if (interval === 'month') {
      key = getMonthKey(d);
      label = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'][d.getMonth()] + ' ' + d.getFullYear();
    }

    if (!groups[key]) {
      groups[key] = { label, total: 0, key };
    }
    groups[key].total += parseFloat(t.amount);
  });

  const sortedKeys = Object.keys(groups).sort();
  return {
    labels: sortedKeys.map(k => groups[k].label),
    totals: sortedKeys.map(k => groups[k].total)
  };
};

// Data chart rough — reaktif terhadap interval & historyItem lewat computed
const barChartData = computed(() => {
  if (!props.historyItem || !props.historyItem.transactions) {
    return { labels: [], totals: [] };
  }
  return processBarChartData(props.historyItem.transactions, barChartInterval.value);
});

const barChartColor = computed(() => {
  const isIncome = props.activeTypeId === 1 || props.activeTypeId === 5;
  return isIncome ? '#10b981' : '#f43f5e';
});

const formatAxisValue = (value) => {
  if (value >= 1000000) return (value / 1000000) + 'M';
  if (value >= 1000) return (value / 1000) + 'k';
  return value;
};

watch(() => props.historyItem, (newVal) => {
  if (newVal) {
    collapsedGroups.value = {};
  } else {
    barChartInterval.value = 'day';
  }
}, { deep: true, immediate: true });

const isGroupCollapsed = (dateStr) => !!collapsedGroups.value[dateStr];
const toggleGroup = (dateStr) => {
  collapsedGroups.value[dateStr] = !collapsedGroups.value[dateStr];
};

const itemGroupedTransactions = computed(() => {
  if (!props.historyItem) return [];
  return groupTransactionsByDate(props.historyItem.transactions);
});

const formatGroupDateLabel = (dateStr) => {
  if (!dateStr) return '';
  const dateObj = new Date(dateStr);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = days[dateObj.getDay()];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const mName = months[dateObj.getMonth()];
  return `${dayName}, ${dateObj.getDate()} ${mName} ${dateObj.getFullYear()}`;
};

</script>

<template>
  <Teleport to="body">
    <div v-if="show && historyItem" class="fixed inset-0 z-[45] flex justify-center animate-in fade-in duration-200"
      @click.self="emit('close')">
      <div
        class="w-full max-w-md bg-slate-50 flex flex-col h-[100dvh] shadow-2xl relative animate-in slide-in-from-bottom duration-250 overflow-hidden">

        <div
          class="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
          <div class="flex items-center gap-2.5">
            <span
              class="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-2xs">
              <component :is="resolveIcon(historyItem.icon)" v-if="resolveIcon(historyItem.icon)"
                :size="18" class="text-slate-700" />
              <span v-else>{{ historyItem.icon }}</span>
            </span>
            <div>
              <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider truncate max-w-[180px]">{{ historyItem.name }}</h4>
              <p class="text-[10px] text-slate-455 font-bold mt-0.5">Riwayat Lengkap</p>
            </div>
          </div>

          <button @click="emit('close')"
            class="w-10 h-10 flex items-center justify-center text-accent transition-colors cursor-pointer">
            <PhX :size="18" />
          </button>
        </div>

        <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-200/60 flex justify-between items-center shrink-0">
          <span class="text-[10px] font-black text-slate-455 uppercase tracking-wider">Total</span>
          <span class="text-xs font-black"
            :class="activeTypeId === 1 || activeTypeId === 5 ? 'text-emerald-600' : 'text-rose-500'">
            {{ activeTypeId === 1 || activeTypeId === 5 ? '+' : '-' }}{{ formatRp(historyItem.total) }}
          </span>
        </div>

        <div class="flex-1 overflow-y-auto no-scrollbar bg-slate-50 pb-20">
          <!-- Bar Chart Section -->
          <div class="px-4 pt-4 pb-2">
            <SketchTabs v-model="barChartInterval" class="mb-4 w-full"
              :tabs="[{ value: 'day', label: 'Harian' }, { value: 'week', label: 'Mingguan' }, { value: 'month', label: 'Bulanan' }]" />
            <div class="h-40 w-full relative">
              <RoughChart type="bar" :labels="barChartData.labels" :data="barChartData.totals"
                :color="barChartColor" :format-value="formatRp" :format-axis="formatAxisValue" />
            </div>
          </div>

          <!-- Transaction List -->
          <div class="p-4 space-y-3.5 border-t border-slate-200/50 mt-2">
            <SketchCard v-for="group in itemGroupedTransactions" :key="group.date"
              class="mb-3.5 last:mb-0 shadow-md">
              <div @click="toggleGroup(group.date)"
                class="flex items-center justify-between cursor-pointer select-none px-3.5 py-2.5 bg-slate-100 border border-slate-200/50 hover:bg-slate-200/50 transition-all"
                :class="isGroupCollapsed(group.date) ? '' : 'border-b-0'">
                <span class="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                  {{ formatGroupDateLabel(group.date) }}
                </span>
                <div
                  class="flex items-center gap-x-2.5 ml-auto mr-2.5 text-[9px] font-black tracking-wider text-slate-500">
                  <span
                    v-if="(activeTypeId === 1 || activeTypeId === 5) && getGroupTotals(group.transactions).income > 0"
                    class="text-income">
                    + {{ formatRp(getGroupTotals(group.transactions).income) }}
                  </span>
                  <span
                    v-if="(activeTypeId === 2 || activeTypeId === 4) && getGroupTotals(group.transactions).expense > 0"
                    class="text-expense">
                    - {{ formatRp(getGroupTotals(group.transactions).expense) }}
                  </span>
                </div>
                <PhCaretDown :size="14" class="text-accent transition-transform duration-700"
                  :class="{ '-rotate-180': isGroupCollapsed(group.date) }" />
              </div>

              <SketchDivider />

              <div v-show="!isGroupCollapsed(group.date)"
                class="bg-white divide-y divide-slate-100 overflow-hidden">
                <Transaction v-for="t in group.transactions" :key="t.id" :transaction="t" :hide-values="false"
                  @click="emit('click-tx', t)" @edit="emit('edit', t)" @delete="emit('delete', t)" />
              </div>
            </SketchCard>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
