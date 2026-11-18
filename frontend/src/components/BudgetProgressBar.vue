<script setup>
import { computed } from 'vue';
import { RProgress, RGraphicsConfig } from 'roughness';
import { formatRp } from '../utils/helpers';

const props = defineProps({
  limitAmount: {
    type: [Number, String],
    default: 0
  },
  spentAmount: {
    type: [Number, String],
    default: 0
  },
  percentageUsed: {
    type: [Number, String],
    default: 0
  },
  // 'detailed' shows Limit, %, Sisa inside the bar.
  // 'compact' shows % centered inside the bar.
  variant: {
    type: String,
    default: 'detailed'
  },
  // 'full' for rounded-full, 'xl' for rounded-xl
  rounded: {
    type: String,
    default: 'full'
  },
  heightClass: {
    type: String,
    default: 'h-8'
  },
  // Menggambar track + isi bar dengan roughness (gaya gambar tangan).
  // Height mengikuti .sketch-progress di theme.css (default 2rem / h-8).
  rough: {
    type: Boolean,
    default: false
  }
});

const numPercentage = computed(() => {
  const p = parseFloat(props.percentageUsed || 0);
  return isNaN(p) ? 0 : p;
});

const roundedPercentage = computed(() => Math.round(numPercentage.value));

const remainingAmount = computed(() => {
  const limit = parseFloat(props.limitAmount || 0);
  const spent = parseFloat(props.spentAmount || 0);
  return Math.max(0, limit - spent);
});

const roundedClass = computed(() => {
  return props.rounded === 'xl' ? 'rounded-xl' : 'rounded-full';
});

// Mode rough: lebar area teks putih diklip ke ujung isi bar (sama seperti
// trik overflow-hidden pada mode biasa).
const clampedPercentage = computed(() => Math.min(100, Math.max(0, numPercentage.value)));
const clippedTextWidth = computed(() => (100 / Math.max(1, clampedPercentage.value)) * 100 + '%');
</script>

<template>
  <!-- MODE ROUGHNESS: track + isi digambar RProgress (roughness) -->
  <RGraphicsConfig v-if="rough" :options="{ roughness: 2.4, bowing: 2.2, seed: 7 }">
    <RProgress class="sketch-progress" :value="numPercentage / 100" :min="0" :max="1">
      <!-- Teks di atas track (terlihat di area yang belum terisi) -->
      <div
        class="absolute inset-0 flex items-center px-3 text-[10px] font-bold text-slate-500 select-none pointer-events-none"
        :class="variant === 'detailed' ? 'justify-between' : 'justify-center'"
      >
        <template v-if="variant === 'detailed'">
          <span>Limit: {{ formatRp(limitAmount) }}</span>
          <span>{{ roundedPercentage }}%</span>
          <span>Sisa: {{ formatRp(remainingAmount) }}</span>
        </template>
        <span v-else>{{ roundedPercentage }}%</span>
      </div>

      <!-- Teks di dalam isi bar (terpotong tepat di ujung isi) -->
      <div
        class="absolute top-0 bottom-0 left-0 overflow-hidden pointer-events-none"
        :style="{ width: clampedPercentage + '%' }"
      >
        <div
          class="absolute top-0 bottom-0 left-0 flex items-center px-3 text-[10px] font-bold text-white select-none"
          :class="variant === 'detailed' ? 'justify-between' : 'justify-center'"
          :style="{ width: clippedTextWidth }"
        >
          <template v-if="variant === 'detailed'">
            <span>Limit: {{ formatRp(limitAmount) }}</span>
            <span>{{ roundedPercentage }}%</span>
            <span>Sisa: {{ formatRp(remainingAmount) }}</span>
          </template>
          <span v-else>{{ roundedPercentage }}%</span>
        </div>
      </div>
    </RProgress>
  </RGraphicsConfig>

  <div
    v-else
    class="w-full overflow-hidden bg-slate-100 relative shadow-inner"
    :class="[heightClass, roundedClass]"
  >
    <!-- VARIANT: DETAILED (Used in Budget Detail Modal & Dashboard) -->
    <template v-if="variant === 'detailed'">
      <!-- Background text (visible on unfilled track) -->
      <div class="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-bold text-slate-500 select-none pointer-events-none">
        <span>Limit: {{ formatRp(limitAmount) }}</span>
        <span>{{ roundedPercentage }}%</span>
        <span>Sisa: {{ formatRp(remainingAmount) }}</span>
      </div>

      <!-- Progress Fill (Active bar) -->
      <div
        class="h-full transition-all duration-500 bg-progress relative overflow-hidden"
        :class="roundedClass"
        :style="{ width: Math.min(100, Math.max(0, numPercentage)) + '%' }"
      >
        <!-- Foreground text (visible inside filled bar, clipped to track width) -->
        <div
          class="absolute top-0 bottom-0 left-0 flex items-center justify-between px-3 text-[10px] font-bold text-white select-none pointer-events-none"
          :style="{ width: (100 / Math.max(1, Math.min(100, Math.max(0, numPercentage)))) * 100 + '%' }"
        >
          <span>Limit: {{ formatRp(limitAmount) }}</span>
          <span>{{ roundedPercentage }}%</span>
          <span>Sisa: {{ formatRp(remainingAmount) }}</span>
        </div>
      </div>
    </template>

    <!-- VARIANT: COMPACT (Used in Budget Cards) -->
    <template v-else>
      <!-- Background text (visible when not covered by progress) -->
      <div class="absolute inset-0 flex items-center justify-center px-2.5 text-[9px] font-bold text-slate-500 select-none pointer-events-none whitespace-nowrap">
        <span class="shrink-0">{{ roundedPercentage }}%</span>
      </div>

      <!-- Progress Fill -->
      <div
        class="h-full transition-all duration-500 bg-progress relative overflow-hidden"
        :class="roundedClass"
        :style="{ width: Math.min(100, Math.max(0, numPercentage)) + '%' }"
      >
        <!-- Foreground text inside fill -->
        <div
          class="absolute top-0 bottom-0 left-0 flex items-center justify-center px-2.5 text-[9px] font-bold text-white select-none pointer-events-none whitespace-nowrap"
          :style="{ width: (100 / Math.max(1, Math.min(100, Math.max(0, numPercentage)))) * 100 + '%' }"
        >
          <span class="shrink-0">{{ roundedPercentage }}%</span>
        </div>
      </div>
    </template>
  </div>
</template>
