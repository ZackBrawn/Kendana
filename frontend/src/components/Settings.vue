<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  PhArrowLeft, PhUser, PhGlobe, PhPalette, PhDatabase,
  PhClock, PhFloppyDisk, PhKey, PhTrash, PhDownload,
  PhBroom, PhLock, PhCaretRight
} from "../utils/icons";
import { api, showToast } from '../api';
import SketchButton from './SketchButton.vue';
import SketchInput from './SketchInput.vue';
import SketchSelect from './SketchSelect.vue';
import SketchSwitch from './SketchSwitch.vue';
import SketchBox from './SketchBox.vue';
import SketchCard from './SketchCard.vue';

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['close']);

const route = useRoute();
const router = useRouter();

const currentTab = ref(null); // null berarti menampilkan daftar utama pengaturan


const subPanelTitle = computed(() => {
  switch (currentTab.value) {
    case 'profile': return 'Profil Pengguna';
    case 'preferences': return 'Preferensi Aplikasi';
    case 'appearance': return 'Tema & Tampilan';
    case 'finance_data': return 'Logika Keuangan';
    case 'history': return 'Riwayat Perubahan';
    default: return 'Pengaturan';
  }
});
const loading = ref(false);
const saving = ref(false);
const bendaharakuImportEnabled = ref(false);
const bendaharakuImportFile = ref(null);
const importingBendaharaku = ref(false);

const profile = ref({
  name: '',
  email: '',
  whatsapp: '',
  telegram: '',
  avatar: ''
});

const password = ref({
  current_password: '',
  new_password: '',
  confirm_password: ''
});

const preferences = ref({
  timezone: 'Asia/Jakarta',
  date_format: 'DD/MM/YYYY',
  language: 'id'
});

const appearance = ref({
  category_icon_colored: true
});

const finance = ref({
  allow_negative_balance: false,
  auto_budget_enabled: false
});

const historyLogs = ref([]);

// Available options
const timezones = [
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
  'UTC',
  'America/New_York',
  'Europe/London',
  'Asia/Singapore'
];

const dateFormats = [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD'
];

const languages = [
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'en', name: 'English' }
];

const fetchUserData = async () => {
  loading.value = true;
  try {
    const res = await api.getMe();
    const user = res.user;
    if (user) {
      profile.value = {
        name: user.name || '',
        email: user.email || '',
        whatsapp: user.whatsapp || '',
        telegram: user.telegram || '',
        avatar: user.avatar || ''
      };
      preferences.value = {
        timezone: user.timezone || 'Asia/Jakarta',
        date_format: user.date_format || 'DD/MM/YYYY',
        language: user.locale || 'id',
        dashboard_show_budget: user.dashboard_show_budget !== false,
        dashboard_budget_expanded: !!user.dashboard_budget_expanded
      };
      appearance.value = {
        category_icon_colored: user.category_icon_colored !== false
      };
      finance.value = {
        allow_negative_balance: !!user.allow_negative_balance,
        auto_budget_enabled: !!user.auto_budget_enabled
      };

    }
  } catch (err) {
    showToast(err.message || 'Gagal memuat profil', 'error');
  } finally {
    loading.value = false;
  }
};

const fetchHistoryLogs = async () => {
  loading.value = true;
  try {
    const logs = await api.getRecentChanges();
    historyLogs.value = logs;
  } catch (err) {
    showToast('Gagal memuat log riwayat perubahan', 'error');
  } finally {
    loading.value = false;
  }
};

// pantau perubahan hash untuk mengubah tab aktif di dalam pengaturan
watch(() => route.hash, (newHash) => {
  if (newHash.startsWith('#settings-')) {
    const tabName = newHash.replace('#settings-', '');
    currentTab.value = tabName;
    if (tabName === 'history') {
      fetchHistoryLogs();
    } else {
      fetchUserData();
    }
    if (tabName === 'finance_data') {
      fetchBendaharakuImportStatus();
    }
  } else if (newHash === '#settings') {
    currentTab.value = null;
  }
}, { immediate: true });

const saveProfile = async () => {
  saving.value = true;
  try {
    await api.updateProfile(profile.value);
    showToast('Profil berhasil diperbarui');
  } catch (err) {
    showToast(err.message || 'Gagal memperbarui profil', 'error');
  } finally {
    saving.value = false;
  }
};

const savePassword = async () => {
  if (!navigator.onLine) {
    showToast('Ganti password hanya bisa dilakukan saat online', 'error');
    return;
  }
  if (!password.value.current_password || !password.value.new_password) {
    showToast('Semua field password harus diisi', 'error');
    return;
  }
  if (password.value.new_password !== password.value.confirm_password) {
    showToast('Konfirmasi password baru tidak cocok', 'error');
    return;
  }
  saving.value = true;
  try {
    await api.updatePassword({
      current_password: password.value.current_password,
      new_password: password.value.new_password
    });
    showToast('Password berhasil diperbarui');
    password.value = { current_password: '', new_password: '', confirm_password: '' };
  } catch (err) {
    showToast(err.message || 'Gagal memperbarui password', 'error');
  } finally {
    saving.value = false;
  }
};

const updatePreferencesSetting = async () => {
  saving.value = true;
  try {
    await api.updatePreferences(preferences.value);
    showToast('Preferensi berhasil disimpan');
  } catch (err) {
    showToast(err.message || 'Gagal menyimpan preferensi', 'error');
  } finally {
    saving.value = false;
  }
};

const updateAppearanceSetting = async () => {
  saving.value = true;
  try {
    await api.updateAppearance({
      category_icon_colored: appearance.value.category_icon_colored
    });
    showToast('Tampilan berhasil diperbarui');
  } catch (err) {
    showToast(err.message || 'Gagal menyimpan tampilan', 'error');
  } finally {
    saving.value = false;
  }
};

const updateFinanceSetting = async () => {
  saving.value = true;
  try {
    await api.updateFinanceLogic({
      allow_negative_balance: finance.value.allow_negative_balance,
      auto_budget_enabled: finance.value.auto_budget_enabled
    });
    showToast('Logika transaksi berhasil disimpan');
  } catch (err) {
    showToast(err.message || 'Gagal menyimpan logika transaksi', 'error');
  } finally {
    saving.value = false;
  }
};

const handleExport = async () => {
  try {
    const res = await fetch('/api/settings/account/export', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('fm_token')}`
      }
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kendana-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Data berhasil diekspor');
  } catch (err) {
    showToast('Gagal mengekspor data', 'error');
  }
};

async function fetchBendaharakuImportStatus() {
  try {
    const status = await api.getBendaharakuImportStatus();
    bendaharakuImportEnabled.value = status.enabled === true;
  } catch (err) {
    bendaharakuImportEnabled.value = false;
    showToast(err.message || 'Gagal memeriksa izin impor data', 'error');
  }
}

const handleImportFileSelected = (event) => {
  const file = event.target.files?.[0] || null;
  bendaharakuImportFile.value = null;
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.json')) {
    showToast('Pilih file ekspor JSON.', 'error');
    event.target.value = '';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('Ukuran file maksimal 10 MB.', 'error');
    event.target.value = '';
    return;
  }
  bendaharakuImportFile.value = file;
};

const handleBendaharakuImport = async () => {
  const file = bendaharakuImportFile.value;
  if (!file || importingBendaharaku.value) return;
  const confirmed = window.confirm(
    `Impor data dari "${file.name}" ke akun Kendana ini? Data yang ada tidak akan dihapus. Pastikan backup sudah tersedia.`
  );
  if (!confirmed) return;

  importingBendaharaku.value = true;
  try {
    const result = await api.importBendaharaku(file);
    const blob = new Blob([JSON.stringify(result.id_map, null, 2)], {
      type: 'application/json'
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `kendana-bendaharaku-id-map-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
    showToast(
      `Impor selesai: ${result.counts.wallets} wallet, ${result.counts.categories} kategori, ${result.counts.transactions} transaksi.`
    );
    window.setTimeout(() => window.location.reload(), 700);
  } catch (err) {
    showToast(err.message || 'Gagal mengimpor data Bendaharaku', 'error');
  } finally {
    importingBendaharaku.value = false;
  }
};

const handleClearCache = async () => {
  try {
    await api.clearCache();
  } catch (err) {
    showToast(err.message || 'Gagal menghapus cache', 'error');
  }
};

const handleDeleteAccount = async () => {
  if (!navigator.onLine) {
    showToast('Hapus akun hanya bisa dilakukan saat online', 'error');
    return;
  }
  const pwd = prompt('Masukkan password Anda untuk mengonfirmasi penghapusan akun:');
  if (!pwd) return;

  try {
    await api.deleteAccount({ password: pwd });
    showToast('Akun berhasil dihapus', 'success');
    localStorage.removeItem('fm_token');
    window.location.reload();
  } catch (err) {
    showToast(err.message || 'Gagal menghapus akun', 'error');
  }
};

watch(() => props.show, (newVal) => {
  if (newVal) {
    currentTab.value = null;
  }
});

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};
</script>

<template>
  <Teleport to="body">
    <div v-if="show"
      class="fixed inset-0 z-[45] bg-slate-50 flex flex-col w-full max-w-md mx-auto shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250">
      <!-- Header -->
      <div
        class="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
        <button @click="currentTab ? router.back() : emit('close')"
          class="p-1 rounded-full text-accent text-xs font-bold flex items-center gap-1 cursor-pointer">
          <PhArrowLeft :size="24" />
        </button>
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">
          {{ currentTab ? subPanelTitle : 'Pengaturan' }}
        </h3>
        <div class="w-12"></div> <!-- Spacer -->
      </div>

      <!-- Body / Active Tab Panel -->
      <div class="flex-1 relative flex flex-col overflow-hidden">
        <!-- Main settings list (rendered when currentTab is null) -->
        <div v-if="currentTab === null" class="flex-1 px-4 py-4 overflow-y-auto space-y-3">
          <!-- Profil -->
          <SketchBox @click="router.push({ hash: '#settings-profile' })"
            class="w-full bg-white p-3.5 flex items-center justify-between hover:bg-slate-50/50 active:scale-[0.99] transition-all cursor-pointer text-left">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl bg-accent-light/10 text-accent flex items-center justify-center shrink-0">
                <PhUser :size="20" />
              </div>
              <div>
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-wide">Profil Pengguna</h4>
                <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Informasi akun, nama, email, dan ubah
                  password.</p>
              </div>
            </div>
            <PhCaretRight :size="16" class="text-slate-400 shrink-0" />
          </SketchBox>

          <!-- Preferensi -->
          <SketchBox @click="router.push({ hash: '#settings-preferences' })"
            class="w-full bg-white p-3.5 flex items-center justify-between hover:bg-slate-50/50 active:scale-[0.99] transition-all cursor-pointer text-left">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl bg-accent-light/10 text-accent flex items-center justify-center shrink-0">
                <PhGlobe :size="20" />
              </div>
              <div>
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-wide">Preferensi</h4>
                <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Zona waktu, format tanggal, dan pilihan
                  bahasa.</p>
              </div>
            </div>
            <PhCaretRight :size="16" class="text-slate-400 shrink-0" />
          </SketchBox>

          <!-- Tema -->
          <SketchBox @click="router.push({ hash: '#settings-appearance' })"
            class="w-full bg-white p-3.5 flex items-center justify-between hover:bg-slate-50/50 active:scale-[0.99] transition-all cursor-pointer text-left">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl bg-accent-light/10 text-accent flex items-center justify-center shrink-0">
                <PhPalette :size="20" />
              </div>
              <div>
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-wide">Tampilan</h4>
                <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Mode terang dengan warna aksen bawaan.
                </p>
              </div>
            </div>
            <PhCaretRight :size="16" class="text-slate-400 shrink-0" />
          </SketchBox>

          <!-- Kelola Data -->
          <SketchBox @click="router.push({ hash: '#settings-finance_data' })"
            class="w-full bg-white p-3.5 flex items-center justify-between hover:bg-slate-50/50 active:scale-[0.99] transition-all cursor-pointer text-left">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl bg-accent-light/10 text-accent flex items-center justify-center shrink-0">
                <PhDatabase :size="20" />
              </div>
              <div>
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-wide">Logika Keuangan</h4>
                <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Saldo negatif, ekspor, dan bersihkan cache.
                </p>
              </div>
            </div>
            <PhCaretRight :size="16" class="text-slate-400 shrink-0" />
          </SketchBox>

          <!-- Riwayat Log -->
          <SketchBox @click="router.push({ hash: '#settings-history' })"
            class="w-full bg-white p-3.5 flex items-center justify-between hover:bg-slate-50/50 active:scale-[0.99] transition-all cursor-pointer text-left">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl bg-accent-light/10 text-accent flex items-center justify-center shrink-0">
                <PhClock :size="20" />
              </div>
              <div>
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-wide">Riwayat Log</h4>
                <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Catatan riwayat perubahan pengaturan akun.
                </p>
              </div>
            </div>
            <PhCaretRight :size="16" class="text-slate-400 shrink-0" />
          </SketchBox>
        </div>

        <!-- Full-screen Sub-Panel (rendered when currentTab is NOT null) -->
        <div v-else
          class="absolute inset-0 z-50 flex flex-col bg-slate-50 overflow-hidden animate-in slide-in-from-right duration-200">
          <!-- Active Panel Content -->
          <div class="flex-1 p-4 overflow-y-auto space-y-4">
            <div v-if="loading" class="flex items-center justify-center h-48 text-slate-400">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>

            <div v-else class="space-y-4">
              <!-- Profile Tab -->
              <div v-if="currentTab === 'profile'" class="space-y-4">
                <!-- Edit Profile Card -->
                <SketchBox class="bg-white p-4 space-y-3">
                  <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Identitas Profil</h4>

                  <div class="space-y-2">
                    <div>
                      <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</label>
                      <SketchInput v-model="profile.name" type="text"
                        class="w-full text-xs font-semibold px-3 py-2.5 mt-1" />
                    </div>

                    <div>
                      <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alamat Email</label>
                      <SketchInput v-model="profile.email" type="email"
                        class="w-full text-xs font-semibold px-3 py-2.5 mt-1" />
                    </div>

                    <div>
                      <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. WhatsApp</label>
                      <SketchInput v-model="profile.whatsapp" type="text" placeholder="Contoh: 08123456789"
                        class="w-full text-xs font-semibold px-3 py-2.5 mt-1" />
                    </div>

                    <div>
                      <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Username
                        Telegram</label>
                      <SketchInput v-model="profile.telegram" type="text" placeholder="Contoh: username"
                        class="w-full text-xs font-semibold px-3 py-2.5 mt-1" />
                    </div>

                    <div>
                      <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avatar (Emoji /
                        URL)</label>
                      <SketchInput v-model="profile.avatar" type="text" placeholder="Contoh: 👨‍💻 atau URL Gambar"
                        class="w-full text-xs font-semibold px-3 py-2.5 mt-1" />
                    </div>
                  </div>

                  <SketchButton @click="saveProfile" :disabled="saving"
                    class="w-full bg-accent text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-3">
                    <PhFloppyDisk :size="16" />
                    <span>Simpan Profil</span>
                  </SketchButton>
                </SketchBox>

                <!-- Password Card -->
                <SketchBox class="p-4 space-y-3">
                  <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Ubah Password</h4>

                  <div class="space-y-2">
                    <div>
                      <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password Saat
                        Ini</label>
                      <SketchInput v-model="password.current_password" type="password"
                        class="w-full text-xs font-semibold px-3 py-2.5 mt-1" />
                    </div>

                    <div>
                      <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password Baru</label>
                      <SketchInput v-model="password.new_password" type="password"
                        class="w-full text-xs font-semibold px-3 py-2.5 mt-1" />
                    </div>

                    <div>
                      <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Konfirmasi Password
                        Baru</label>
                      <SketchInput v-model="password.confirm_password" type="password"
                        class="w-full text-xs font-semibold px-3 py-2.5 mt-1" />
                    </div>
                  </div>

                  <SketchButton @click="savePassword" :disabled="saving"
                    class="w-full bg-accent text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-3">
                    <PhLock :size="16" />
                    <span>Perbarui Password</span>
                  </SketchButton>
                </SketchBox>
              </div>

              <!-- Preferences Tab -->
              <div v-if="currentTab === 'preferences'" class="space-y-4">
                <SketchBox class="bg-white p-4 space-y-4">
                  <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Preferensi Akun</h4>

                  <div class="space-y-3">
                    <div>
                      <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bahasa
                        Aplikasi</label>
                      <SketchSelect v-model="preferences.language"
                        class="w-full text-xs font-semibold px-3 py-2.5 mt-1 cursor-pointer">
                        <option v-for="lang in languages" :key="lang.code" :value="lang.code">{{ lang.name }}</option>
                      </SketchSelect>
                    </div>

                    <div>
                      <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Zona Waktu
                        (Timezone)</label>
                      <SketchSelect v-model="preferences.timezone"
                        class="w-full text-xs font-semibold px-3 py-2.5 mt-1 cursor-pointer">
                        <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
                      </SketchSelect>
                    </div>

                    <div>
                      <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Format
                        Tanggal</label>
                      <SketchSelect v-model="preferences.date_format"
                        class="w-full text-xs font-semibold px-3 py-2.5 mt-1 cursor-pointer">
                        <option v-for="df in dateFormats" :key="df" :value="df">{{ df }}</option>
                      </SketchSelect>
                    </div>
                  </div>

                  <div class="pt-2 pb-2">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Tampilan Dashboard</label>
                    <div class="space-y-3">
                      <div class="flex items-center justify-between">
                        <div>
                          <p class="text-xs font-bold text-slate-900">Tampilkan Anggaran Aktif</p>
                          <p class="text-[10px] font-medium text-slate-500">Munculkan bagian Anggaran di halaman Dashboard</p>
                        </div>
                        <SketchSwitch v-model="preferences.dashboard_show_budget" />
                      </div>

                      <div class="flex items-center justify-between" :class="{'opacity-50 pointer-events-none': !preferences.dashboard_show_budget}">
                        <div>
                          <p class="text-xs font-bold text-slate-900">Buka Daftar Anggaran (Default)</p>
                          <p class="text-[10px] font-medium text-slate-500">Secara default rentangkan daftar anggaran di Dashboard</p>
                        </div>
                        <SketchSwitch v-model="preferences.dashboard_budget_expanded" />
                      </div>
                    </div>
                  </div>

                  <SketchButton @click="updatePreferencesSetting" :disabled="saving"
                    class="w-full bg-accent text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-3">
                    <PhFloppyDisk :size="16" />
                    <span>Simpan Preferensi</span>
                  </SketchButton>
                </SketchBox>
              </div>

              <!-- Appearance Tab -->
              <div v-if="currentTab === 'appearance'" class="space-y-4">
                <SketchBox class="bg-white p-4 space-y-4">
                  <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Tampilan</h4>

                  <div class="space-y-4">
                    <p class="text-xs text-slate-600">
                      Aplikasi selalu menggunakan mode terang dan warna aksen bawaan.
                    </p>

                    <!-- Category Icon Color Toggle -->
                    <div class="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div>
                        <h5 class="text-xs font-black text-slate-800 uppercase tracking-wide">Ikon Kategori Berwarna
                        </h5>
                        <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Tampilkan latar belakang berwarna
                          untuk ikon kategori.</p>
                      </div>
                      <SketchSwitch v-model="appearance.category_icon_colored" @change="updateAppearanceSetting()" />
                    </div>
                  </div>
                </SketchBox>
              </div>

              <!-- Data & Danger Zone Tab -->
              <div v-if="currentTab === 'finance_data'" class="space-y-4">
                <!-- Finance Rules -->
                <SketchBox class="bg-white p-4 space-y-4">
                  <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Logika Keuangan</h4>

                  <div class="flex items-center justify-between">
                    <div>
                      <h5 class="text-xs font-black text-slate-800 uppercase tracking-wide">Izinkan Saldo Negatif</h5>
                      <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Izinkan pengeluaran melebihi sisa saldo
                        dompet.</p>
                    </div>
                    <SketchSwitch v-model="finance.allow_negative_balance" @change="updateFinanceSetting" />
                  </div>
                </SketchBox>

                <!-- Manage Account Data -->
                <SketchCard class="bg-white p-4 space-y-3">
                  <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Pengelolaan Data</h4>

                  <SketchButton @click="handleExport"
                    class="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]">
                    <PhDownload :size="18" />
                    <span>Ekspor Data Transaksi (JSON)</span>
                  </SketchButton>

                  <div v-if="bendaharakuImportEnabled" class="space-y-2 border-t border-slate-100 pt-3">
                    <h5 class="text-[11px] font-black text-slate-800 uppercase tracking-wide">Impor Bendaharaku</h5>
                    <p class="text-[10px] text-slate-500 font-medium leading-relaxed">
                      Hanya file ekspor lengkap. Data akan ditambahkan ke akun ini tanpa menghapus data Kendana.
                      Backup database terlebih dahulu.
                    </p>
                    <input
                      type="file"
                      accept=".json,application/json"
                      :disabled="importingBendaharaku"
                      @change="handleImportFileSelected"
                      class="block w-full text-[10px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-slate-700 disabled:opacity-50"
                    >
                    <p v-if="bendaharakuImportFile" class="text-[10px] text-slate-500 break-all">
                      {{ bendaharakuImportFile.name }}
                    </p>
                    <SketchButton
                      @click="handleBendaharakuImport"
                      :disabled="!bendaharakuImportFile || importingBendaharaku"
                      class="w-full bg-accent text-white font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>{{ importingBendaharaku ? 'Mengimpor...' : 'Impor data JSON' }}</span>
                    </SketchButton>
                  </div>

                  <SketchButton @click="handleClearCache"
                    class="w-full bg-slate-100 hover:bg-slate-200 text-slate-850 font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]">
                    <PhBroom :size="18" />
                    <span>Bersihkan Cache Cache</span>
                  </SketchButton>
                </SketchCard>

                <!-- Danger Zone -->
                <SketchBox class="bg-white p-4 space-y-3">
                  <h4 class="text-xs font-extrabold text-red-650 uppercase tracking-wider">Zona Bahaya</h4>
                  <p class="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    Penghapusan akun bersifat permanen dan seluruh data keuangan (dompet, kategori, transaksi) akan
                    terhapus selamanya.
                  </p>

                  <SketchButton @click="handleDeleteAccount"
                    class="w-full bg-red-600 hover:bg-red-750 text-white font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] shadow-xs">
                    <PhTrash :size="18" />
                    <span>Hapus Akun Permanen</span>
                  </SketchButton>
                </SketchBox>
              </div>

              <!-- Settings Change Log Tab -->
              <div v-if="currentTab === 'history'" class="space-y-4">
                <SketchCard class="bg-white p-4 space-y-4">
                  <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Log Riwayat Perubahan</h4>

                  <div v-if="historyLogs.length === 0" class="text-center py-6 text-slate-400 text-xs font-semibold">
                    Belum ada log perubahan terdeteksi.
                  </div>

                  <div v-else class="space-y-3">
                    <div v-for="log in historyLogs" :key="log.id"
                      class="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">{{ log.setting_key
                          }}</span>
                        <span class="text-[9px] text-slate-400 font-semibold">{{ formatDate(log.changed_at) }}</span>
                      </div>
                      <div class="flex items-center gap-1.5 mt-1 text-[10px] font-semibold text-slate-500">
                        <SketchBox class="bg-slate-100 px-2 py-0.5 truncate max-w-[120px]">{{ log.old_value ||
                          'null' }}</SketchBox>
                        <span>&rarr;</span>
                        <SketchBox class="bg-indigo-50 text-indigo-700 px-2 py-0.5 truncate max-w-[120px]">{{
                          log.new_value || 'null' }}</SketchBox>
                      </div>
                      <div class="text-[9px] text-slate-400 font-semibold mt-1">Halaman: {{ log.setting_page }}</div>
                    </div>
                  </div>
                </SketchCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
