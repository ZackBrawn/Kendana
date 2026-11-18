<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { PhTag, PhGear, PhInfo, PhPiggyBank, PhChatCircleDots, PhBell } from "../utils/icons";
import Categories from '../components/Categories.vue';
import Settings from '../components/Settings.vue';
import About from '../components/About.vue';
import SketchCard from '../components/SketchCard.vue';

const route = useRoute();
const router = useRouter();

const showCategories = ref(false);
const showSettings = ref(false);
const showAbout = ref(false);

// pantau hash url untuk membuka modal yang sesuai
watch(() => route.hash, (newHash) => {
  showCategories.value = newHash.startsWith('#categories');
  showSettings.value = newHash.startsWith('#settings');
  showAbout.value = newHash.startsWith('#about');
}, { immediate: true });

// buka modal dengan menambahkan hash pada url
const openModal = (hashName) => {
  router.push({ hash: `#${hashName}` });
};

// tutup modal dengan kembali ke riwayat sebelumnya atau menghapus hash
const closeModal = (hashName) => {
  if (route.hash.startsWith(`#${hashName}`)) {
    if (window.history.state && window.history.state.back) {
      router.back();
    } else {
      router.replace({ hash: '' });
    }
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Lainnya</h2>
    </div>

    <!-- Menu Grid Group -->
    <div class="grid grid-cols-3 gap-3">
      <!-- Menu Item: Categories -->
      <SketchCard @click="openModal('categories')"
        class="bg-white p-4 hover:bg-slate-50 active:scale-[0.97] transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer gap-2 aspect-square">
        <div class="w-12 h-12 flex items-center justify-center text-accent shrink-0 shadow-3xs">
          <PhTag :size="40" />
        </div>
        <span class="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-tight">Kategori</span>
      </SketchCard>

      <!-- Menu Item: Budget -->
      <router-link to="/budgets">
        <SketchCard
          class="bg-white p-4 hover:bg-slate-50 active:scale-[0.97] transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer gap-2 aspect-square">
          <div class="w-12 h-12 flex items-center justify-center text-accent shrink-0 shadow-3xs">
            <PhPiggyBank :size="40" />
          </div>
          <span class="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-tight">Anggaran</span>
        </SketchCard>
      </router-link>

      <!-- Menu Item: Settings -->
      <SketchCard @click="openModal('settings')"
        class="bg-white p-4 hover:bg-slate-50 active:scale-[0.97] transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer gap-2 aspect-square">
        <div class="w-12 h-12 flex items-center justify-center text-accent shrink-0 shadow-3xs">
          <PhGear :size="40" />
        </div>
        <span class="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-tight">Pengaturan</span>
      </SketchCard>

      <!-- Menu Item: About -->
      <SketchCard @click="openModal('about')"
        class="bg-white p-4 hover:bg-slate-50 active:scale-[0.97] transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer gap-2 aspect-square">
        <div class="w-12 h-12 flex items-center justify-center text-accent shrink-0 shadow-3xs">
          <PhInfo :size="40" />
        </div>
        <span class="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-tight">Tentang</span>
      </SketchCard>

      <!-- Menu Item: Chat AI -->
      <router-link to="/chat">
        <SketchCard
          class="bg-white p-4 hover:bg-slate-50 active:scale-[0.97] transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer gap-2 aspect-square">
          <div class="w-12 h-12 flex items-center justify-center text-accent shrink-0 shadow-3xs">
            <PhChatCircleDots :size="40" />
          </div>
          <span class="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-tight">Chat AI</span>
        </SketchCard>
      </router-link>

      <!-- Menu Item: Notifications -->
      <router-link to="/other/notifikasi">
        <SketchCard
          class="bg-white p-4 hover:bg-slate-50 active:scale-[0.97] transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer gap-2 aspect-square">
          <div class="w-12 h-12 flex items-center justify-center text-accent shrink-0 shadow-3xs">
            <PhBell :size="40" />
          </div>
          <span class="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-tight">Notifikasi</span>
        </SketchCard>
      </router-link>
    </div>

    <!-- Modals / Sheets -->
    <Categories :show="showCategories" @close="closeModal('categories')" />
    <Settings :show="showSettings" @close="closeModal('settings')" />
    <About :show="showAbout" @close="closeModal('about')" />
  </div>
</template>
