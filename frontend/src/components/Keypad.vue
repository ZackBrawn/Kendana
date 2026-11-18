<script setup>
import { PhBackspace } from '../utils/icons';
import SketchButton from './SketchButton.vue';
import SketchBox from './SketchBox.vue';
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
  <SketchBox class="grid grid-cols-3 gap-1.5 p-2 bg-slate-100/80">
    <template v-for="(row, rIdx) in keys" :key="rIdx">
      <SketchButton v-for="k in row" :key="k" type="button" @click="handlePress(k)" :class="[
        'py-3 font-extrabold text-base transition-all active:scale-95 flex items-center justify-center',
        k === 'backspace'
          ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
          : 'bg-white text-slate-800 hover:bg-slate-50'
      ]">
        <PhBackspace v-if="k === 'backspace'" :size="20" />
        <span v-else>{{ k }}</span>
      </SketchButton>
    </template>
  </SketchBox>
</template>

