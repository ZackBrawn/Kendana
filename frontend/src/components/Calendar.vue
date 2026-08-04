<script setup>
import { ref, computed, watch } from 'vue';
import { PhCalendarBlank, PhCaretDown, PhCaretLeft, PhCaretRight } from "@phosphor-icons/vue";

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  allowFuture: {
    type: Boolean,
    default: true
  },
  showTime: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'close']);

const calendarYear = ref(new Date().getFullYear());
const calendarMonth = ref(new Date().getMonth());
const calendarHour = ref(new Date().getHours());
const calendarMinute = ref(Math.round(new Date().getMinutes() / 10) * 10 % 60);

const showMonthYearPicker = ref(false);

const yearRef = ref(null);
const monthRef = ref(null);
const hourRef = ref(null);
const minuteRef = ref(null);
const isScrolling = ref(false);

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      const [datePart, timePart] = newVal.split(' ');
      const parts = datePart.split('-');
      if (parts.length === 3) {
        calendarYear.value = parseInt(parts[0]);
        calendarMonth.value = parseInt(parts[1]) - 1;
      }
      if (props.showTime && timePart) {
        const timeParts = timePart.split(':');
        if (timeParts.length >= 2) {
          calendarHour.value = parseInt(timeParts[0]);
          calendarMinute.value = Math.round(parseInt(timeParts[1]) / 10) * 10 % 60;
        }
      }
    }
  },
  { immediate: true }
);

const monthNamesList = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const monthList = computed(() => {
  const allMonths = monthNamesList.map((name, idx) => ({
    value: idx,
    label: name
  }));
  
  if (!props.allowFuture && calendarYear.value === currentYear) {
    const todayMonth = new Date().getMonth();
    return allMonths.slice(0, todayMonth + 1);
  }
  
  return allMonths;
});

const currentYear = new Date().getFullYear();

const yearList = computed(() => {
  const years = [];
  const startYear = currentYear - 5;
  const endYear = props.allowFuture ? currentYear + 2 : currentYear;
  for (let y = endYear; y >= startYear; y--) {
    years.push(y);
  }
  return years;
});

const hourList = Array.from({ length: 24 }, (_, i) => i);
const minuteList = [0, 10, 20, 30, 40, 50];

const scrollToItem = (index, type) => {
  let container;
  if (type === 'year') container = yearRef.value;
  else if (type === 'month') container = monthRef.value;
  else if (type === 'hour') container = hourRef.value;
  else if (type === 'minute') container = minuteRef.value;
  
  if (container) {
    container.scrollTo({
      top: index * 40,
      behavior: 'smooth'
    });
  }
};

const handleScroll = (event, type) => {
  const container = event.target;
  const index = Math.round(container.scrollTop / 40);
  isScrolling.value = true;
  
  if (type === 'year') {
    const targetYear = yearList.value[index];
    if (targetYear && calendarYear.value !== targetYear) {
      calendarYear.value = targetYear;
    }
  } else if (type === 'month') {
    const targetMonth = monthList.value[index];
    if (targetMonth !== undefined && calendarMonth.value !== targetMonth.value) {
      calendarMonth.value = targetMonth.value;
    }
  } else if (type === 'hour') {
    const targetHour = hourList[index];
    if (targetHour !== undefined && calendarHour.value !== targetHour) {
      calendarHour.value = targetHour;
    }
  } else if (type === 'minute') {
    const targetMinute = minuteList[index];
    if (targetMinute !== undefined && calendarMinute.value !== targetMinute) {
      calendarMinute.value = targetMinute;
    }
  }
  
  setTimeout(() => {
    isScrolling.value = false;
  }, 100);
};
watch(monthList, (newMonths) => {
  if (newMonths.length > 0) {
    const maxVal = newMonths[newMonths.length - 1].value;
    if (calendarMonth.value > maxVal) {
      calendarMonth.value = maxVal;
      setTimeout(() => {
        scrollToItem(newMonths.length - 1, 'month');
      }, 50);
    }
  }
});

watch(showMonthYearPicker, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      if (yearRef.value) {
        const yIndex = yearList.value.indexOf(calendarYear.value);
        if (yIndex !== -1) {
          yearRef.value.scrollTop = yIndex * 40;
        }
      }
      if (monthRef.value) {
        const mIndex = monthList.value.findIndex(m => m.value === calendarMonth.value);
        if (mIndex !== -1) {
          monthRef.value.scrollTop = mIndex * 40;
        }
      }
      if (props.showTime && hourRef.value) {
        const hIndex = hourList.indexOf(calendarHour.value);
        if (hIndex !== -1) {
          hourRef.value.scrollTop = hIndex * 40;
        }
      }
      if (props.showTime && minuteRef.value) {
        const minIndex = minuteList.indexOf(calendarMinute.value);
        if (minIndex !== -1) {
          minuteRef.value.scrollTop = minIndex * 40;
        }
      }
    }, 50);
  }
});

watch([calendarYear, calendarMonth, calendarHour, calendarMinute], () => {
  if (isScrolling.value || !showMonthYearPicker.value) return;
  if (yearRef.value) {
    const yIndex = yearList.value.indexOf(calendarYear.value);
    if (yIndex !== -1 && Math.abs(yearRef.value.scrollTop - yIndex * 40) > 5) {
      yearRef.value.scrollTop = yIndex * 40;
    }
  }
  if (monthRef.value) {
    const mIndex = monthList.value.findIndex(m => m.value === calendarMonth.value);
    if (mIndex !== -1 && Math.abs(monthRef.value.scrollTop - mIndex * 40) > 5) {
      monthRef.value.scrollTop = mIndex * 40;
    }
  }
  if (props.showTime && hourRef.value) {
    const hIndex = hourList.indexOf(calendarHour.value);
    if (hIndex !== -1 && Math.abs(hourRef.value.scrollTop - hIndex * 40) > 5) {
      hourRef.value.scrollTop = hIndex * 40;
    }
  }
  if (props.showTime && minuteRef.value) {
    const minIndex = minuteList.indexOf(calendarMinute.value);
    if (minIndex !== -1 && Math.abs(minuteRef.value.scrollTop - minIndex * 40) > 5) {
      minuteRef.value.scrollTop = minIndex * 40;
    }
  }
});

const calendarDaysInMonth = computed(() => {
  return new Date(calendarYear.value, calendarMonth.value + 1, 0).getDate();
});

const calendarFirstDayOffset = computed(() => {
  const day = new Date(calendarYear.value, calendarMonth.value, 1).getDay();
  return day === 0 ? 6 : day - 1;
});

const isDateDisabled = (day) => {
  if (props.allowFuture) return false;
  const targetDate = new Date(calendarYear.value, calendarMonth.value, day);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return targetDate > today;
};

const isDateSelected = (day) => {
  const formattedMonth = String(calendarMonth.value + 1).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  const targetStr = `${calendarYear.value}-${formattedMonth}-${formattedDay}`;
  return props.modelValue.split(' ')[0] === targetStr;
};

const selectCalendarDate = (day) => {
  if (isDateDisabled(day)) return;
  const formattedMonth = String(calendarMonth.value + 1).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  let targetStr = `${calendarYear.value}-${formattedMonth}-${formattedDay}`;
  
  if (props.showTime) {
    const hStr = String(calendarHour.value).padStart(2, '0');
    const mStr = String(calendarMinute.value).padStart(2, '0');
    targetStr = `${targetStr} ${hStr}:${mStr}`;
  }
  
  emit('update:modelValue', targetStr);
  emit('close');
};

const prevCalendarMonth = () => {
  if (calendarMonth.value === 0) {
    if (calendarYear.value > currentYear - 5) {
      calendarMonth.value = 11;
      calendarYear.value--;
    }
  } else {
    calendarMonth.value--;
  }
};

const nextCalendarMonth = () => {
  const today = new Date();
  if (!props.allowFuture && calendarYear.value === today.getFullYear() && calendarMonth.value >= today.getMonth()) {
    return;
  }
  if (calendarMonth.value === 11) {
    if (calendarYear.value < currentYear + (props.allowFuture ? 2 : 0)) {
      calendarMonth.value = 0;
      calendarYear.value++;
    }
  } else {
    calendarMonth.value++;
  }
};
</script>

<template>
  <div
    class="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-xs bg-white rounded-xl p-4 shadow-2xl border border-slate-100 space-y-3.5 relative z-[121]"
    >
      <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 px-1">
        <div class="flex items-center gap-1.5 text-accent">
          <PhCalendarBlank :size="24" weight="bold" />
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">
            {{ showMonthYearPicker ? 'Pilih Waktu & Periode' : 'Pilih Tanggal' }}
          </h3>
        </div>
        <button @click="emit('close')"
          class="p-1 rounded-full text-slate-400 hover:bg-slate-100 text-xs font-bold cursor-pointer">✕</button>
      </div>

      <div v-if="showMonthYearPicker" class="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-4 animate-in fade-in duration-200">
        
        <div class="relative h-[120px] flex gap-2 overflow-hidden select-none">
          <div class="absolute inset-x-0 top-10 h-10 bg-slate-200/50 rounded-xl pointer-events-none z-10"></div>
          
          <div 
            ref="yearRef"
            @scroll="handleScroll($event, 'year')"
            class="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar text-center relative z-20"
            style="padding-top: 40px; padding-bottom: 40px; height: 120px;"
          >
            <div 
              v-for="(y, index) in yearList" 
              :key="y"
              @click="scrollToItem(index, 'year')"
              class="h-10 flex items-center justify-center snap-center text-sm font-extrabold cursor-pointer transition-colors duration-150"
              :class="calendarYear === y ? 'text-slate-900 font-black scale-105' : 'text-slate-400 font-semibold'"
            >
              {{ y }}
            </div>
          </div>
          
          <div 
            ref="monthRef"
            @scroll="handleScroll($event, 'month')"
            class="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar text-center relative z-20"
            style="padding-top: 40px; padding-bottom: 40px; height: 120px;"
          >
            <div 
              v-for="(m, index) in monthList" 
              :key="m.value"
              @click="scrollToItem(index, 'month')"
              class="h-10 flex items-center justify-center snap-center text-sm font-extrabold cursor-pointer transition-colors duration-150"
              :class="calendarMonth === m.value ? 'text-slate-900 font-black scale-105' : 'text-slate-400 font-semibold'"
            >
              {{ m.label }}
            </div>
          </div>
          
          <div 
            v-if="props.showTime"
            ref="hourRef"
            @scroll="handleScroll($event, 'hour')"
            class="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar text-center relative z-20"
            style="padding-top: 40px; padding-bottom: 40px; height: 120px;"
          >
            <div 
              v-for="(h, index) in hourList" 
              :key="h"
              @click="scrollToItem(index, 'hour')"
              class="h-10 flex items-center justify-center snap-center text-sm font-extrabold cursor-pointer transition-colors duration-150"
              :class="calendarHour === h ? 'text-slate-900 font-black scale-105' : 'text-slate-400 font-semibold'"
            >
              {{ String(h).padStart(2, '0') }}
            </div>
          </div>

          <div 
            v-if="props.showTime"
            ref="minuteRef"
            @scroll="handleScroll($event, 'minute')"
            class="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar text-center relative z-20"
            style="padding-top: 40px; padding-bottom: 40px; height: 120px;"
          >
            <div 
              v-for="(min, index) in minuteList" 
              :key="min"
              @click="scrollToItem(index, 'minute')"
              class="h-10 flex items-center justify-center snap-center text-sm font-extrabold cursor-pointer transition-colors duration-150"
              :class="calendarMinute === min ? 'text-slate-900 font-black scale-105' : 'text-slate-400 font-semibold'"
            >
              {{ String(min).padStart(2, '0') }}
            </div>
          </div>
        </div>

        <button 
          type="button"
          @click="showMonthYearPicker = false"
          class="w-full py-2.5 bg-accent hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
        >
          Selesai Pilih
        </button>
      </div>

      <div v-else class="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-3">
        <div class="flex justify-between items-center px-1">
          <button type="button" @click="prevCalendarMonth"
            class="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-650 hover:bg-slate-100 active:scale-95 text-xs font-bold shadow-2xs cursor-pointer"
          >
            <PhCaretLeft :size="14" weight="bold" />
          </button>
          
          <button 
            type="button"
            @click="showMonthYearPicker = true"
            class="px-3 py-1 text-xs font-black text-slate-900 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-accent hover:shadow-xs transition-all flex items-center gap-1"
          >
            <span>
              {{ monthNamesList[calendarMonth] }} {{ calendarYear }}
            </span>
            <PhCaretDown :size="10" weight="bold" class="text-slate-400" />
          </button>

          <button type="button" @click="nextCalendarMonth"
            class="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-650 hover:bg-slate-100 active:scale-95 text-xs font-bold shadow-2xs cursor-pointer"
          >
            <PhCaretRight :size="14" weight="bold" />
          </button>
        </div>

        <div class="grid grid-cols-7 text-center">
          <span v-for="d in ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']" :key="d"
            class="text-[10px] font-black text-slate-400 uppercase tracking-wider"
          >
            {{ d }}
          </span>
        </div>

        <div class="grid grid-cols-7 gap-1">
          <div v-for="n in calendarFirstDayOffset" :key="'offset-' + n" class="h-8"></div>
          <button v-for="day in calendarDaysInMonth" :key="day" type="button" @click="selectCalendarDate(day)"
            :disabled="isDateDisabled(day)" :class="[
              'h-8 w-full rounded-xl text-xs font-bold flex items-center justify-center transition-all shadow-2xs cursor-pointer',
              isDateDisabled(day)
                ? 'opacity-25 cursor-not-allowed bg-slate-100/50 text-slate-300'
                : isDateSelected(day)
                  ? 'bg-accent text-white font-black shadow-md scale-105'
                  : 'bg-white text-slate-800 hover:bg-accent-light hover:text-accent border border-slate-200/60'
            ]"
          >
            {{ day }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
