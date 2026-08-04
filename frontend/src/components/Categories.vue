<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';
import { PhArrowLeft } from "@phosphor-icons/vue";
import { resolveIcon } from '../utils/helpers';

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['close']);

const categories = ref([]);
const activeTab = ref(2); // 2.expense 1.income

const loadCategories = async () => {
  try {
    categories.value = await api.getCategories();
  } catch (err) {
    console.error(err);
  }
};

onMounted(loadCategories);
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
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Kategori</h3>
        <div class="w-12"></div> <!-- Spacer -->
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-20">
        <div class="grid grid-cols-2 gap-1 bg-slate-200/60 p-1 rounded-xl shrink-0">
          <button @click="activeTab = 2"
            :class="activeTab === 2 ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-500'"
            class="py-2 text-xs rounded-lg transition-all cursor-pointer">Pengeluaran</button>
          <button @click="activeTab = 1"
            :class="activeTab === 1 ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-500'"
            class="py-2 text-xs rounded-lg transition-all cursor-pointer">Pemasukan</button>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div v-for="c in categories.filter(c => c.type_id === activeTab)" :key="c.id"
            class="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3 shadow-xs">
            <div
              class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/50 flex items-center justify-center shrink-0">
              <component :is="resolveIcon(c.icon)" v-if="resolveIcon(c.icon)" :size="24" class="text-slate-700" />
              <component :is="resolveIcon('PhTag')" v-else :size="24" class="text-slate-700" />
            </div>
            <p class="text-xs font-bold text-slate-800 truncate">{{ c.category_name }}</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
