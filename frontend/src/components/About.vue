<script setup>
import { PhArrowLeft, PhInfo } from "@phosphor-icons/vue";

defineProps({
  show: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['close']);
</script>

<template>
  <Teleport to="body">
    <div v-if="show"
      class="fixed inset-0 z-[45] bg-slate-50 flex flex-col w-full max-w-md mx-auto shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250">
      <!-- Header -->
      <div
        class="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
        <button @click="emit('close')"
          class="p-1 rounded-full text-accent text-xs font-bold flex items-center gap-1 cursor-pointer">
          <PhArrowLeft :size="24" weight="bold"/>
        </button>
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Tentang</h3>
        <div class="w-12"></div> <!-- Spacer -->
      </div>

      <!-- Body -->
      <div class="flex-1 p-6 flex flex-col items-center justify-center text-center gap-4">
        <div class="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-accent shadow-sm shrink-0">
          <PhInfo :size="40" weight="bold" />
        </div>
        <div>
          <h4 class="text-sm font-black text-slate-800">Kendana v0.1-alpha</h4>
          <p class="text-[11px] text-slate-400 mt-1 font-semibold leading-relaxed">
            Aplikasi pencatatan keuangan pribadi.
          </p>
        </div>
        <div class="text-[10px] text-slate-400 border-t border-slate-100 pt-4 w-full font-semibold">
          &copy; 2026 ZackBrawn. All Rights Reserved.
        </div>
      </div>
    </div>
  </Teleport>
</template>
