<script setup>
import { ref, watch } from 'vue';
import { PhCalendarDots } from "@phosphor-icons/vue";
import Calendar from './Calendar.vue';
import { formatCustomLabel } from '../utils/helpers';

const props = defineProps({
  filterType: {
    type: String,
    required: true
  },
  presetsList: {
    type: Array,
    required: true
  },
  startDate: {
    type: String,
    default: ''
  },
  endDate: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'applyPreset', 'applyCustom']);

const tempStartDate = ref('');
const tempEndDate = ref('');
const showDateModal = ref(false);
const calendarTarget = ref('start');

// Initialize temp dates
const initDates = () => {
  tempStartDate.value = props.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  tempEndDate.value = props.endDate || new Date().toISOString().split('T')[0];
};

initDates();

watch(() => props.startDate, () => {
  tempStartDate.value = props.startDate;
});
watch(() => props.endDate, () => {
  tempEndDate.value = props.endDate;
});

const applyPreset = (presetId) => {
  emit('applyPreset', presetId);
};

const applyCustomFilter = () => {
  emit('applyCustom', {
    start: tempStartDate.value,
    end: tempEndDate.value
  });
};

const openCalendar = (target) => {
  calendarTarget.value = target;
  showDateModal.value = true;
};
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div class="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
        <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider text-center">Filter</h3>

        <!-- Filter Presets Grid -->
        <div class="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
          <button v-for="preset in presetsList" :key="preset.id" type="button" @click="applyPreset(preset.id)"
            :class="['py-2 px-3 text-[11px] font-bold rounded-xl border text-center transition-all cursor-pointer truncate', filterType === preset.id ? 'bg-accent border-accent text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100']">
            {{ preset.label }}
          </button>
        </div>

        <!-- Custom Date Form (Always Visible) -->
        <div class="pt-3 border-t border-slate-100 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal Mulai</label>
              <button type="button" @click="openCalendar('start')"
                class="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-100 cursor-pointer">
                <span>{{ formatCustomLabel(tempStartDate) }}</span>
                <PhCalendarDots :size="16" class="text-slate-400" />
              </button>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal Selesai</label>
              <button type="button" @click="openCalendar('end')"
                class="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-100 cursor-pointer">
                <span>{{ formatCustomLabel(tempEndDate) }}</span>
                <PhCalendarDots :size="16" class="text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2.5 pt-2">
          <button type="button" @click="emit('close')"
            class="flex-1 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer">
            Batal
          </button>
          <button type="button" @click="applyCustomFilter"
            class="flex-1 py-2 bg-accent hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-500/25 cursor-pointer transition-all">
            Terapkan
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Teleport Calendar Picker Modal Component -->
  <Calendar v-if="showDateModal" :model-value="calendarTarget === 'start' ? tempStartDate : tempEndDate"
    :allow-future="true"
    @update:model-value="val => { if (calendarTarget === 'start') { tempStartDate = val; } else { tempEndDate = val; } }"
    @close="showDateModal = false" />
</template>
