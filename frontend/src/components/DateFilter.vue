<script setup>
import { ref, watch } from 'vue';
import { PhCalendarDots } from "../utils/icons";
import Calendar from './Calendar.vue';
import SketchButton from './SketchButton.vue';
import SketchBox from './SketchBox.vue';
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

const isOpen = ref(false);
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
  showDateModal.value = false;
  isOpen.value = false;
};

const applyCustomFilter = () => {
  emit('applyCustom', {
    start: tempStartDate.value,
    end: tempEndDate.value
  });
  showDateModal.value = false;
  isOpen.value = false;
};

const close = () => {
  showDateModal.value = false;
  isOpen.value = false;
  emit('close');
};

const openCalendar = (target) => {
  calendarTarget.value = target;
  showDateModal.value = true;
};

defineExpose({
  open: () => { isOpen.value = true; }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[110] bg-slate-900/60 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <SketchBox class="w-full max-w-sm bg-white p-6 space-y-4">
        <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider text-center">Filter</h3>

        <!-- Filter Presets Grid -->
        <div class="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
          <SketchButton v-for="preset in presetsList" :key="preset.id" type="button" @click="applyPreset(preset.id)"
            :class="['py-2 px-3 text-[11px] font-bold text-center transition-all cursor-pointer truncate', filterType === preset.id ? 'bg-accent text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100']">
            {{ preset.label }}
          </SketchButton>
        </div>

        <!-- Custom Date Form (Always Visible) -->
        <div class="pt-3 border-t border-slate-100 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal Mulai</label>
              <SketchButton type="button" @click="openCalendar('start')"
                class="w-full text-xs font-semibold p-2.5 bg-slate-50 flex items-center justify-between hover:bg-slate-100 cursor-pointer">
                <span>{{ formatCustomLabel(tempStartDate) }}</span>
                <PhCalendarDots :size="16" class="text-slate-400" />
              </SketchButton>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal Selesai</label>
              <SketchButton type="button" @click="openCalendar('end')"
                class="w-full text-xs font-semibold p-2.5 bg-slate-50 flex items-center justify-between hover:bg-slate-100 cursor-pointer">
                <span>{{ formatCustomLabel(tempEndDate) }}</span>
                <PhCalendarDots :size="16" class="text-slate-400" />
              </SketchButton>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2.5 pt-2">
          <SketchButton type="button" @click="close"
            class="flex-1 py-2 bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer">
            Batal
          </SketchButton>
          <SketchButton type="button" @click="applyCustomFilter"
            class="flex-1 py-2 bg-accent hover:bg-indigo-700 text-white font-extrabold text-xs cursor-pointer transition-all">
            Terapkan
          </SketchButton>
        </div>
      </SketchBox>
    </div>
  </Teleport>

  <!-- Teleport Calendar Picker Modal Component -->
  <Calendar v-if="isOpen && showDateModal" :model-value="calendarTarget === 'start' ? tempStartDate : tempEndDate"
    :allow-future="true"
    @update:model-value="val => { if (calendarTarget === 'start') { tempStartDate = val; } else { tempEndDate = val; } }"
    @close="showDateModal = false" />
</template>

