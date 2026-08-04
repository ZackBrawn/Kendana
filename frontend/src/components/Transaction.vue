<script setup>
import { ref, computed } from 'vue';
import { PhPencil, PhTrash } from '@phosphor-icons/vue';
import { formatRp, resolveIcon } from '../utils/helpers';

const props = defineProps({
  transaction: {
    type: Object,
    required: true
  },
  hideValues: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click', 'edit', 'delete']);

const isDragging = ref(false);
const activeTranslateX = ref(0);
const isSwiped = ref(false);
let startX = 0;
let hasMoved = false;

const getTranslation = computed(() => {
  if (isDragging.value) {
    return activeTranslateX.value;
  }
  return isSwiped.value ? -128 : 0;
});

const startDrag = (clientX) => {
  startX = clientX;
  isDragging.value = true;
  hasMoved = false;
  activeTranslateX.value = isSwiped.value ? -128 : 0;

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};

const onTouchStart = (e) => {
  startDrag(e.touches[0].clientX);
};

const onMouseDown = (e) => {
  startDrag(e.clientX);
};

const moveDrag = (clientX) => {
  if (!isDragging.value) return;
  const diffX = clientX - startX;
  if (Math.abs(diffX) > 10) {
    hasMoved = true;
  }

  const baseOffset = isSwiped.value ? -128 : 0;
  let newX = baseOffset + diffX;

  if (newX < -150) newX = -150;
  if (newX > 0) newX = 0;

  activeTranslateX.value = newX;
};

const onTouchMove = (e) => {
  moveDrag(e.touches[0].clientX);
};

const onMouseMove = (e) => {
  moveDrag(e.clientX);
};

const endDrag = () => {
  if (!isDragging.value) return;
  isDragging.value = false;

  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);

  const finalX = activeTranslateX.value;
  if (finalX < -45) {
    isSwiped.value = true;
    activeTranslateX.value = -128;
  } else {
    isSwiped.value = false;
    activeTranslateX.value = 0;
  }
};

const onTouchEnd = () => {
  endDrag();
};

const onMouseUp = () => {
  endDrag();
};

const handleClick = (e) => {
  if (hasMoved) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  if (isSwiped.value) {
    isSwiped.value = false;
    return;
  }
  emit('click', props.transaction);
};

const handleEdit = () => {
  isSwiped.value = false;
  emit('edit', props.transaction);
};

const handleDelete = () => {
  isSwiped.value = false;
  emit('delete', props.transaction);
};
</script>

<template>
  <div class="relative overflow-hidden group select-none">
    <!-- BACKGROUND LAYER (Swipe Actions) -->
    <div class="absolute inset-0 flex justify-end items-stretch z-0 bg-slate-100">
      <!-- Edit Action -->
      <button type="button" @click.stop="handleEdit"
        class="w-16 bg-accent bg-accent-hover text-white flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer">
        <PhPencil :size="24" />
      </button>
      <!-- Delete Action -->
      <button type="button" @click.stop="handleDelete"
        class="w-16 bg-rose-500 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer">
        <PhTrash :size="24" />
      </button>
    </div>

    <!-- FOREGROUND LAYER (Content) -->
    <div @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd"
      @mousedown="onMouseDown" :style="{ transform: `translateX(${getTranslation}px)` }"
      class="relative z-10 bg-white p-3.5 flex items-center justify-between hover:bg-slate-50 transition-transform duration-200 ease-out cursor-pointer"
      @click="handleClick">
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-lg shrink-0 text-slate-700">
          <component :is="resolveIcon(transaction.category_icon)" v-if="resolveIcon(transaction.category_icon)" :size="34" />
          <component :is="transaction.type_name === 'Income' ? resolveIcon('PhArrowDownLeft') : resolveIcon('PhArrowUpRight')" v-else :size="24" />
        </div>
        <div class="min-w-0">
          <p class="text-xs font-bold text-slate-900 truncate">
            {{ transaction.subject !== '-' ? transaction.subject : (transaction.category_name || transaction.type_name) }}
          </p>
          <p class="text-[10px] text-slate-400 font-medium truncate">
            {{ transaction.type_name === 'Transfer' ? `${transaction.source_wallet_name} → ${transaction.dest_wallet_name}` :
              (transaction.category_name || transaction.source_wallet_name) }}
          </p>
        </div>
      </div>

      <div class="text-right shrink-0">
        <p :class="[
          'text-xs font-black',
          transaction.type_name === 'Income' ? 'text-income' : (transaction.type_name === 'Expense' ? 'text-expense' : 'text-transfer')
        ]">
          {{ transaction.type_name === 'Income' ? '+' : (transaction.type_name === 'Expense' ? '-' : '') }}{{ hideValues ? '***' : formatRp(transaction.amount) }}
        </p>
        <p class="text-[9px] text-slate-400 font-medium">
          {{ transaction.type_name === 'Income' || transaction.type_name === 'Debt' ? transaction.dest_wallet_name : transaction.source_wallet_name }}
          <span class="mx-1">•</span>
          {{ transaction.date ? transaction.date.split('T')[1]?.slice(0, 5) || '' : '' }}
        </p>
      </div>
    </div>
  </div>
</template>
