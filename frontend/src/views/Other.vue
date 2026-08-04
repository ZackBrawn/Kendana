<script setup>
import { ref } from 'vue';
import { PhTag, PhGear, PhInfo, PhPiggyBank } from "@phosphor-icons/vue";
import Categories from '../components/Categories.vue';
import Settings from '../components/Settings.vue';
import About from '../components/About.vue';

const showCategories = ref(false);
const showSettings = ref(false);
const showAbout = ref(false);
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Lainnya</h2>
    </div>

    <!-- Menu Grid Group -->
    <div class="grid grid-cols-3 gap-3">
      <!-- Menu Item: Categories -->
      <button @click="showCategories = true"
        class="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-md hover:bg-slate-50 active:scale-[0.97] transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer gap-2 aspect-square">
        <div class="w-12 h-12 flex items-center justify-center text-accent shrink-0 shadow-3xs">
          <PhTag :size="40" weight="bold" />
        </div>
        <span class="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-tight">Kategori</span>
      </button>

      <!-- Menu Item: Budget -->
      <router-link to="/budgets"
        class="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-md hover:bg-slate-50 active:scale-[0.97] transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer gap-2 aspect-square">
        <div class="w-12 h-12 flex items-center justify-center text-accent shrink-0 shadow-3xs">
          <PhPiggyBank :size="40" weight="bold" />
        </div>
        <span class="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-tight">Anggaran</span>
      </router-link>

      <!-- Menu Item: Settings -->
      <button @click="showSettings = true"
        class="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-md hover:bg-slate-50 active:scale-[0.97] transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer gap-2 aspect-square">
        <div class="w-12 h-12 flex items-center justify-center text-accent shrink-0 shadow-3xs">
          <PhGear :size="40" weight="bold" />
        </div>
        <span class="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-tight">Pengaturan</span>
      </button>

      <!-- Menu Item: About -->
      <button @click="showAbout = true"
        class="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-md hover:bg-slate-50 active:scale-[0.97] transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer gap-2 aspect-square">
        <div class="w-12 h-12 flex items-center justify-center text-accent shrink-0 shadow-3xs">
          <PhInfo :size="40" weight="bold" />
        </div>
        <span class="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-tight">Tentang</span>
      </button>
    </div>

    <!-- Modals / Sheets -->
    <Categories :show="showCategories" @close="showCategories = false" />
    <Settings :show="showSettings" @close="showSettings = false" />
    <About :show="showAbout" @close="showAbout = false" />
  </div>
</template>
