<script setup>
import { PhBackspace } from '@phosphor-icons/vue';
const emit = defineEmits(['key']);

const keys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['00', '0', 'backspace']
];

const handlePress = (val) => {
  if (val === 'backspace') {
    emit('key', 'backspace');
  } else {
    emit('key', val);
  }
};
</script>

<template>
  <div class="grid grid-cols-3 gap-1.5 p-2 bg-slate-100/80 rounded-2xl border border-slate-200/60 shadow-xs">
    <template v-for="(row, rIdx) in keys" :key="rIdx">
      <button v-for="k in row" :key="k" type="button" @click="handlePress(k)" :class="[
        'py-3 rounded-xl font-extrabold text-base transition-all active:scale-95 flex items-center justify-center shadow-xs',
        k === 'backspace'
          ? 'bg-rose-50 text-rose-500 hover:bg-rose-100 border border-rose-200/60'
          : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200/80'
      ]">
        <PhBackspace v-if="k === 'backspace'" :size="20" />
        <span v-else>{{ k }}</span>
      </button>
    </template>
  </div>
</template>
