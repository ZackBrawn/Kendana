<script setup>
import { PhArrowLeft, PhGear } from "@phosphor-icons/vue";

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
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Pengaturan</h3>
        <div class="w-12"></div> <!-- Spacer -->
      </div>

      <!-- Body -->
      <div class="flex-1 p-6 flex flex-col items-center justify-center text-slate-400 gap-3">
        <PhGear :size="64" class="text-slate-350 animate-spin duration-1000" style="animation-duration: 6s;" />
        <p class="text-xs font-semibold">Pengaturan akan segera hadir.</p>
      </div>
    </div>
  </Teleport>
</template>
