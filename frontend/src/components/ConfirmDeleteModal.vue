<script setup>
import { PhWarning } from '@phosphor-icons/vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Konfirmasi Hapus'
  },
  message: {
    type: String,
    default: 'Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.'
  },
  confirmText: {
    type: String,
    default: 'Ya, Hapus'
  },
  cancelText: {
    type: String,
    default: 'Batal'
  }
});

const emit = defineEmits(['confirm', 'cancel', 'update:show']);

const handleCancel = () => {
  emit('update:show', false);
  emit('cancel');
};

const handleConfirm = () => {
  emit('confirm');
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div class="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 text-center">
        <div class="p-4 rounded-full inline-flex">
          <PhWarning :size="52" color="#ec2727" />
        </div>
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">{{ title }}</h3>
        <p class="text-xs text-slate-500 font-semibold leading-relaxed">{{ message }}</p>
        <div class="flex gap-2.5 pt-1">
          <button
            type="button"
            @click="handleCancel"
            class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer transition-colors"
          >
            {{ cancelText }}
          </button>
          <button
            type="button"
            @click="handleConfirm"
            class="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-500/25 cursor-pointer transition-colors"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
