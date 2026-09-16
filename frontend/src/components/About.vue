<script setup>
import { ref, onMounted } from 'vue';
import { 
  PhArrowLeft, 
  PhInfo, 
  PhCaretDown, 
  PhCheckCircle, 
  PhXCircle, 
  PhQuestion, 
  PhSparkle, 
  PhWifiSlash,
  PhShieldCheck
} from "@phosphor-icons/vue";
import { api } from '../api';

defineProps({
  show: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['close']);

const version = ref('0.3');
const serviceType = ref('express-prisma');

// State collapsible sections (default terbuka untuk fitur utama)
const openSections = ref({
  featuresCan: true,
  featuresCannot: false,
  faq: true
});

const toggleSection = (key) => {
  openSections.value[key] = !openSections.value[key];
};

// State untuk FAQ item accordion individual
const openFaqItem = ref(null);
const toggleFaq = (index) => {
  openFaqItem.value = openFaqItem.value === index ? null : index;
};

// Data Apa yang BISA dilakukan Kendana v0.3
const capabilities = [
  {
    title: 'Catat Transaksi Pemasukan, Pengeluaran & Transfer',
    desc: 'Lengkap dengan multi-wallet, multi-kategori, tag tanggal, dan bukti visual (receipt attachment).'
  },
  {
    title: 'Full Offline Mode (PWA & IndexedDB)',
    desc: 'Bisa mencatat, mengubah, dan menghapus transaksi serta mengubah pengaturan saat tanpa internet. Data tersimpan aman di IndexedDB perangkat Anda.'
  },
  {
    title: 'Auto-Sync saat Kembali Online',
    desc: 'Antrean transaksi dan perubahan setting saat offline otomatis disinkronisasi ke server tanpa data tertumpuk atau ganda.'
  },
  {
    title: 'Manajemen Anggaran (Budgeting)',
    desc: 'Set limit anggaran harian, bulanan, atau kustom dengan visualisasi progress bar sisa saldo dan batas limit.'
  },
  {
    title: 'Visualisasi Keuangan & Dashboard Interaktif',
    desc: 'Ringkasan saldo total, grafik tren kekayaan bersih (Net Worth), serta filter rentang tanggal cepat (Bulan Ini, Hari Ini, Custom).'
  },
  {
    title: 'Asisten AI Finansial & Evidence Processing',
    desc: 'Bisa input dan ekstrak transaksi dari struk belanja atau percakapan chat teks/suara melalui AI.'
  },
  {
    title: 'Personalisasi & Notifikasi Web Push',
    desc: 'Pilihan tema warna aksen, sembunyikan nominal (mode privasi), serta pengingat harian pencatatan via Web Push.'
  }
];

// Data Apa yang BELUM BISA / TIDAK DILAKUKAN Kendana v0.3
const limitations = [
  {
    title: 'Belum Terhubung Otomatis ke Bank / Open Banking (API Bank)',
    desc: 'Kendana tidak membaca rekening bank secara langsung demi keamanan dan privasi. Semua pencatatan dilakukan manual atau via struk/AI.'
  },
  {
    title: 'Ganti Password & Hapus Akun Saat Offline',
    desc: 'Fitur autentikasi sensitif membutuhkan koneksi langsung ke server keamanan dan sengaja dinonaktifkan di mode offline.'
  },
  {
    title: 'Sinkronisasi Multi-Device Real-Time Secara P2P',
    desc: 'Sinkronisasi data multi-device berjalan melalui server saat online, bukan sync instan antar HP tanpa perantara server.'
  },
  {
    title: 'Eksekusi Transaksi Finansial Nyata (Transfer Uang Asli)',
    desc: 'Kendana murni aplikasi manajemen dan pencatatan keuangan pribadi, bukan e-wallet atau payment gateway.'
  },
  {
    title: 'Multi-Currency Otomatis Real-Time FX Converter',
    desc: 'Saat ini Kendana difokuskan pada format mata uang Rupiah (IDR) untuk seluruh kalkulasi saldo dan laporan.'
  }
];

// Data FAQ
const faqs = [
  {
    q: 'Apakah data saya aman saat mode offline?',
    a: 'Ya, seluruh data tersimpan di penyimpanan lokal browser/PWA Anda (IndexedDB). Data tidak dibagikan ke pihak ketiga dan akan otomatis disinkronkan ke akun Anda saat perangkat terhubung kembali ke internet.'
  },
  {
    q: 'Bagaimana cara kerja sync transaksi offline?',
    a: 'Setiap aksi (buat, edit, hapus transaksi atau pengaturan) dicatat dalam antrean sinkronisasi IndexedDB. Begitu browser mendeteksi sinyal internet, background sync service akan mengirimkan data secara bertahap dan merekonsiliasi saldo wallet.'
  },
  {
    q: 'Apakah saya bisa install Kendana seperti aplikasi native di HP?',
    a: 'Bisa! Kendana adalah Progressive Web App (PWA). Buka di browser Chrome/Safari di smartphone Anda, lalu klik "Tambahkan ke Layar Utama" (Add to Home Screen) untuk menikmati pengalaman full screen tanpa browser bar.'
  },
  {
    q: 'Bagaimana cara menyembunyikan nominal saldo di tempat umum?',
    a: 'Di halaman Dashboard, tap tombol ikon mata di samping Saldo Bersih untuk mengaktifkan sensor nominal (***) agar privasi Anda terjaga.'
  },
  {
    q: 'Apa itu fitur AI Assistant dan Struk Belanja?',
    a: 'Anda bisa mengunggah foto struk belanjaan di menu Catat/Chat, sistem AI akan otomatis mengekstrak item, total harga, serta mengelompokkan kategori ke dalam draf transaksi siap konfirmasi.'
  }
];

const fetchAboutInfo = async () => {
  try {
    const res = await api.getAbout();
    if (res && res.appVersion) {
      version.value = res.appVersion;
      serviceType.value = res.service;
    }
  } catch (err) {
    console.error('Failed to fetch about details', err);
  }
};

onMounted(() => {
  fetchAboutInfo();
});
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
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Tentang Aplikasi</h3>
        <div class="w-8"></div>
      </div>

      <!-- Scrollable Body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 pb-12">
        
        <div class="text-[10px] text-slate-400 text-center font-semibold pt-2 pb-6 space-y-1">
          <p>Kendana v{{ version }} &bull; Service: {{ serviceType }}</p>
          <p>&copy; 2026 ZackBrawn. All Rights Reserved.</p>
        </div>

        <!-- SECTION 1: Fitur yang BISA dilakukan (Collapsible) -->
        <div class="shadow-md rounded-2xl overflow-hidden bg-white border border-slate-200/80">
          <div @click="toggleSection('featuresCan')"
            class="flex items-center justify-between cursor-pointer select-none px-4 py-3 bg-slate-100 hover:bg-slate-200/60 transition-all"
            :class="!openSections.featuresCan ? 'border-none' : 'border-b border-slate-200/60'">
            <div class="flex items-center gap-2">
              <PhCheckCircle :size="18" weight="fill" class="text-emerald-500 shrink-0" />
              <span class="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                Fitur yang BISA Dilakukan
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[9px] font-bold text-slate-400">({{ capabilities.length }} Fitur)</span>
              <PhCaretDown :size="15" weight="fill" class="text-accent transition-transform duration-300"
                :class="{ '-rotate-180': !openSections.featuresCan }" />
            </div>
          </div>

          <div v-show="openSections.featuresCan" class="p-3.5 space-y-2.5 divide-y divide-slate-100">
            <div v-for="(item, idx) in capabilities" :key="'can-' + idx"
              class="pt-2.5 first:pt-0 flex items-start gap-2.5">
              <div class="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <PhCheckCircle :size="13" weight="bold" />
              </div>
              <div class="flex-1 min-w-0">
                <h5 class="text-xs font-bold text-slate-800 leading-snug">{{ item.title }}</h5>
                <p class="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{{ item.desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 2: Fitur yang BELUM BISA / TIDAK Dilakukan (Collapsible) -->
        <div class="shadow-md rounded-2xl overflow-hidden bg-white border border-slate-200/80">
          <div @click="toggleSection('featuresCannot')"
            class="flex items-center justify-between cursor-pointer select-none px-4 py-3 bg-slate-100 hover:bg-slate-200/60 transition-all"
            :class="!openSections.featuresCannot ? 'border-none' : 'border-b border-slate-200/60'">
            <div class="flex items-center gap-2">
              <PhXCircle :size="18" weight="fill" class="text-rose-500 shrink-0" />
              <span class="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                Batasan / Yang TIDAK Dilakukan
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[9px] font-bold text-slate-400">({{ limitations.length }} Poin)</span>
              <PhCaretDown :size="15" weight="fill" class="text-accent transition-transform duration-300"
                :class="{ '-rotate-180': !openSections.featuresCannot }" />
            </div>
          </div>

          <div v-show="openSections.featuresCannot" class="p-3.5 space-y-2.5 divide-y divide-slate-100">
            <div v-for="(item, idx) in limitations" :key="'cannot-' + idx"
              class="pt-2.5 first:pt-0 flex items-start gap-2.5">
              <div class="w-5 h-5 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                <PhXCircle :size="13" weight="bold" />
              </div>
              <div class="flex-1 min-w-0">
                <h5 class="text-xs font-bold text-slate-800 leading-snug">{{ item.title }}</h5>
                <p class="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{{ item.desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 3: FAQ (Collapsible Parent + Sub-Accordions) -->
        <div class="shadow-md rounded-2xl overflow-hidden bg-white border border-slate-200/80">
          <div @click="toggleSection('faq')"
            class="flex items-center justify-between cursor-pointer select-none px-4 py-3 bg-slate-100 hover:bg-slate-200/60 transition-all"
            :class="!openSections.faq ? 'border-none' : 'border-b border-slate-200/60'">
            <div class="flex items-center gap-2">
              <PhQuestion :size="18" weight="fill" class="text-indigo-500 shrink-0" />
              <span class="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                Pertanyaan Sering Diajukan (FAQ)
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[9px] font-bold text-slate-400">({{ faqs.length }} FAQ)</span>
              <PhCaretDown :size="15" weight="fill" class="text-accent transition-transform duration-300"
                :class="{ '-rotate-180': !openSections.faq }" />
            </div>
          </div>

          <!-- FAQ Accordion List -->
          <div v-show="openSections.faq" class="p-2.5 space-y-2">
            <div v-for="(faq, fIdx) in faqs" :key="'faq-' + fIdx"
              class="border border-slate-200/70 rounded-xl overflow-hidden bg-slate-50/50">
              <button @click="toggleFaq(fIdx)"
                class="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-100/80 transition-colors cursor-pointer">
                <span class="text-[11px] font-bold text-slate-800 leading-tight">{{ faq.q }}</span>
                <PhCaretDown :size="13" weight="bold" class="text-slate-400 shrink-0 transition-transform duration-200"
                  :class="{ '-rotate-180': openFaqItem === fIdx }" />
              </button>
              <div v-show="openFaqItem === fIdx"
                class="px-3 pb-3 pt-1 text-[10px] text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                {{ faq.a }}
              </div>
            </div>
          </div>
        </div>



      </div>
    </div>
  </Teleport>
</template>

