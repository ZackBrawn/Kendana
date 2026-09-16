<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { PhArrowLeft, PhBell, PhEnvelope, PhGlobe, PhCaretRight, PhCalendarDots, PhPlus, PhPencil, PhTrash, PhPaperPlane, PhTimer, PhX } from '@phosphor-icons/vue';
import { api, showToast } from '../api';
import Calendar from '../components/Calendar.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';

const router = useRouter();
const loading = ref(true);
const saving = ref(false);
const showPreferences = ref(false);
const testSending = ref(false);
const pushStatus = ref('Memeriksa dukungan browser...');
const notifications = ref({
  email_notifications: true,
  push_notifications: true
});

// Custom Notifications State
const customNotifications = ref([]);
const showCustomList = ref(false);
const editingNotification = ref(null);
const editTitle = ref('');
const editBody = ref('');
const editDate = ref('');
const editTime = ref('21:00');
const editFrequency = ref('once');
const showEditDateCalendar = ref(false);
const showEditTimeCalendar = ref(false);

const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return 'Pilih tanggal';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const formatTimeForDisplay = (timeStr) => {
  if (!timeStr) return 'Pilih waktu';
  return timeStr;
};

const getFrequencyLabel = (freq) => {
  const labels = { once: 'Sekali', daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' };
  return labels[freq] || freq;
};

const toNotificationView = (notification) => {
  const scheduledAt = notification.scheduled_at
    ? new Date(notification.scheduled_at)
    : new Date(`${notification.date}T${notification.time}`);
  const pad = (value) => String(value).padStart(2, '0');
  return {
    ...notification,
    date: `${scheduledAt.getFullYear()}-${pad(scheduledAt.getMonth() + 1)}-${pad(scheduledAt.getDate())}`,
    time: `${pad(scheduledAt.getHours())}:${pad(scheduledAt.getMinutes())}`
  };
};

// Load custom notifications from the backend so schedules survive page/app close.
const loadCustomNotifications = async () => {
  try {
    const stored = await Promise.race([
      api.getCustomNotifications(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Server belum merespons')), 5000))
    ]);
    if (stored.length === 0) {
      const legacy = JSON.parse(localStorage.getItem('kendana_custom_notifications') || '[]');
      if (legacy.length > 0) {
        const migrated = await Promise.all(legacy.map(notification => api.createCustomNotification({
          title: notification.title,
          body: notification.body,
          date: notification.date,
          time: notification.time,
          frequency: notification.frequency
        })));
        customNotifications.value = migrated.map(toNotificationView);
        localStorage.removeItem('kendana_custom_notifications');
        return;
      }
    }
    customNotifications.value = stored
      .filter(notification => notification.is_test !== true && notification.active !== false)
      .map(toNotificationView);
  } catch (err) {
    console.error('Failed to load custom notifications:', err);
  }
};

// Send notification immediately for testing
const sendNotificationNow = async (notification) => {
  try {
    await ensurePushSubscription();
    const registration = await getPushRegistration();
    if (Notification.permission !== 'granted') {
      throw new Error('Izin notifikasi belum diberikan');
    }

    const notificationOptions = {
      body: notification.body.trim(),
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: `kendana-custom-${notification.id}-test`,
      data: { url: '/other/notifikasi', customId: notification.id, test: true }
    };

    await registration.showNotification(notification.title.trim(), notificationOptions);
    showToast('Notifikasi test dikirim');
  } catch (err) {
    showToast(err.message || 'Gagal mengirim notifikasi test', 'error');
  }
};

const sendNotificationInTenSeconds = async (notification) => {
  if (!notification?.title?.trim() || !notification?.body?.trim()) {
    showToast('Judul dan isi notifikasi wajib diisi', 'error');
    return;
  }

  try {
    if (!isPushSupported.value) throw new Error('Browser ini belum mendukung Web Push');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Izin notifikasi belum diberikan');

    await ensurePushSubscription();
    notifications.value.push_notifications = true;
    await updateNotifications();
    const scheduledAt = new Date(Date.now() + 10000).toISOString();
    await api.createCustomNotification({
      title: notification.title.trim(),
      body: notification.body.trim(),
      scheduled_at: scheduledAt,
      frequency: 'once',
      is_test: true
    });
    showToast('Notifikasi testing akan dikirim dalam 10 detik');
  } catch (err) {
    showToast(err.message || 'Gagal menjadwalkan notifikasi testing', 'error');
  }
};

// Open add/edit modal
const openAddNotification = () => {
  editingNotification.value = null;
  editTitle.value = 'Pengingat Kendana';
  editBody.value = 'Jangan lupa mencatat transaksi keuangan Anda hari ini.';
  editFrequency.value = 'once';
  
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  editDate.value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  editTime.value = '21:00';
  
  showCustomList.value = true;
  // Show edit form after a tick
  nextTick(() => {
    showEditForm.value = true;
  });
};

const openPreferences = () => {
  showCustomList.value = false;
  showEditForm.value = false;
  showPreferences.value = true;
};

const openCustomList = () => {
  showPreferences.value = false;
  showCustomList.value = true;
};

const openEditNotification = (notification) => {
  editingNotification.value = notification;
  editTitle.value = notification.title;
  editBody.value = notification.body;
  editDate.value = notification.date;
  editTime.value = notification.time;
  editFrequency.value = notification.frequency;
  showCustomList.value = true;
  nextTick(() => {
    showEditForm.value = true;
  });
};

const closeEditForm = () => {
  showEditForm.value = false;
  editingNotification.value = null;
};

const showEditForm = ref(false);

const saveCustomNotification = async () => {
  if (!editTitle.value.trim() || !editBody.value.trim()) {
    showToast('Judul dan isi notifikasi wajib diisi', 'error');
    return;
  }
  if (!editDate.value || !editTime.value) {
    showToast('Tanggal dan waktu notifikasi wajib dipilih', 'error');
    return;
  }

  if (editingNotification.value) {
    // Update existing
    const idx = customNotifications.value.findIndex(n => n.id === editingNotification.value.id);
    if (idx !== -1) {
      const updated = await api.updateCustomNotification(editingNotification.value.id, {
        title: editTitle.value.trim(),
        body: editBody.value.trim(),
        date: editDate.value,
        time: editTime.value,
        frequency: editFrequency.value
      });
      customNotifications.value[idx] = toNotificationView(updated);
    }
  } else {
    // Add new
    const newNotification = {
      id: Date.now().toString(),
      title: editTitle.value.trim(),
      body: editBody.value.trim(),
      date: editDate.value,
      time: editTime.value,
      frequency: editFrequency.value,
      createdAt: new Date().toISOString()
    };
    const created = await api.createCustomNotification({
      title: newNotification.title,
      body: newNotification.body,
      date: newNotification.date,
      time: newNotification.time,
      frequency: newNotification.frequency
    });
    customNotifications.value.unshift(toNotificationView(created));
  }

  closeEditForm();
  showToast(editingNotification.value ? 'Notifikasi diperbarui' : 'Notifikasi ditambahkan');
};

const showDeleteConfirm = ref(false);
const notificationToDelete = ref(null);

const deleteCustomNotification = async (id) => {
  await api.deleteCustomNotification(id);
  customNotifications.value = customNotifications.value.filter(notification => notification.id !== id);
};

const confirmDelete = async () => {
  if (notificationToDelete.value) {
    try {
      await deleteCustomNotification(notificationToDelete.value);
      showToast('Notifikasi dihapus');
    } catch (err) {
      showToast(err.message || 'Gagal menghapus notifikasi', 'error');
    }
    notificationToDelete.value = null;
  }
  showDeleteConfirm.value = false;
};

const initiateDelete = (id) => {
  notificationToDelete.value = id;
  showDeleteConfirm.value = true;
};

// Swipe handling for custom notification cards
const customSwipeState = ref({});

const startCustomSwipe = (id, clientX) => {
  customSwipeState.value[id] = {
    dragging: true,
    startX: clientX,
    hasMoved: false,
    translateX: 0,
    isOpen: false
  };
};

const moveCustomSwipe = (id, clientX) => {
  const state = customSwipeState.value[id];
  if (!state || !state.dragging) return;
  
  const diffX = clientX - state.startX;
  if (Math.abs(diffX) > 10) state.hasMoved = true;

  const baseOffset = state.isOpen ? -128 : 0;
  let newX = baseOffset + diffX;
  
  if (newX < -150) newX = -150;
  if (newX > 0) newX = 0;
  
  state.translateX = newX;
  customSwipeState.value = { ...customSwipeState.value };
};

const endCustomSwipe = (id) => {
  const state = customSwipeState.value[id];
  if (!state || !state.dragging) return;
  
  state.dragging = false;
  const finalX = state.translateX;
  
  if (finalX < -45) {
    state.isOpen = true;
    state.translateX = -128;
  } else {
    state.isOpen = false;
    state.translateX = 0;
  }
  customSwipeState.value = { ...customSwipeState.value };
};

const getCustomSwipeTranslate = (id) => {
  const state = customSwipeState.value[id];
  if (!state) return 0;
  return state.translateX;
};

const isCustomSwiped = (id) => {
  const state = customSwipeState.value[id];
  return state?.isOpen || false;
};

const closeCustomSwipe = (id) => {
  if (customSwipeState.value[id]) {
    customSwipeState.value[id].isOpen = false;
    customSwipeState.value[id].translateX = 0;
    customSwipeState.value = { ...customSwipeState.value };
  }
};

const handleCustomTouchStart = (e, id) => {
  startCustomSwipe(id, e.touches[0].clientX);
};

const handleCustomTouchMove = (e, id) => {
  moveCustomSwipe(id, e.touches[0].clientX);
};

const handleCustomTouchEnd = (e, id) => {
  endCustomSwipe(id);
};

const handleCustomMouseDown = (e, id) => {
  startCustomSwipe(id, e.clientX);
  window.addEventListener('mousemove', (ev) => moveCustomSwipe(id, ev.clientX));
  window.addEventListener('mouseup', () => endCustomSwipe(id), { once: true });
};

const handleCustomClick = (e, id) => {
  const state = customSwipeState.value[id];
  if (state?.hasMoved) {
    e.preventDefault();
    e.stopPropagation();
  }
};

const fetchNotifications = async (showLoading = true) => {
  if (showLoading) loading.value = true;
  try {
    const res = await Promise.race([
      api.getMe(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Server belum merespons')), 5000))
    ]);
    const user = res.user;
    if (user) {
      notifications.value = {
        email_notifications: user.email_notifications !== false,
        push_notifications: user.push_notifications !== false
      };
    }
  } catch (err) {
    showToast(err.message || 'Gagal memuat pengaturan notifikasi', 'error');
  } finally {
    loading.value = false;
  }
};

const updateNotifications = async () => {
  saving.value = true;
  try {
    await api.updateNotifications(notifications.value);
    showToast('Notifikasi berhasil diperbarui');
  } catch (err) {
    showToast(err.message || 'Gagal menyimpan notifikasi', 'error');
  } finally {
    saving.value = false;
  }
};

const isPushSupported = computed(() => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const waitForServiceWorker = async (registration) => {
  const worker = registration.active || registration.waiting || registration.installing;
  if (worker && worker.state !== 'activated') {
    await Promise.race([new Promise((resolve, reject) => {
      const onStateChange = () => {
        if (worker.state === 'activated') {
          worker.removeEventListener('statechange', onStateChange);
          resolve();
        } else if (worker.state === 'redundant') {
          worker.removeEventListener('statechange', onStateChange);
          reject(new Error('Service Worker gagal diaktifkan'));
        }
      };
      worker.addEventListener('statechange', onStateChange);
    }), new Promise((_, reject) => setTimeout(() => reject(new Error('Service Worker gagal diaktifkan')), 5000))]);
  }
  if (!navigator.serviceWorker.controller) {
    await new Promise((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
      setTimeout(resolve, 1500);
    });
  }
  return registration;
};

const getPushRegistration = async () => {
  if (!isPushSupported.value) throw new Error('Browser ini belum mendukung Web Push');
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Service Worker belum siap')), 5000))
  ]);
  return waitForServiceWorker(registration);
};

const refreshPushStatus = async () => {
  if (!isPushSupported.value) {
    pushStatus.value = 'Web Push tidak didukung browser ini';
    return;
  }

  try {
    const registration = await getPushRegistration();
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      pushStatus.value = 'Perangkat ini terdaftar untuk Web Push';
    } else if (Notification.permission === 'denied') {
      pushStatus.value = 'Izin notifikasi diblokir browser';
    } else {
      pushStatus.value = 'Web Push belum diaktifkan pada perangkat ini';
    }
  } catch (err) {
    console.warn('Push status unavailable:', err.message);
    pushStatus.value = 'Web Push belum siap, coba refresh halaman';
  }
};

const ensurePushSubscription = async () => {
  const registration = await getPushRegistration();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const { publicKey } = await api.getPushKey();
    if (!publicKey) throw new Error('VAPID public key tidak tersedia dari server');
    let subscribeAttempt = 0;
    while (!subscription && subscribeAttempt < 3) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey.trim())
        });
      } catch (err) {
        subscribeAttempt += 1;
        if (err.name !== 'AbortError' || subscribeAttempt >= 3) throw err;
        await new Promise(resolve => setTimeout(resolve, 800 * subscribeAttempt));
      }
    }
  }

  const subscriptionJson = subscription.toJSON();
  await api.subscribePush({
    endpoint: subscriptionJson.endpoint,
    p256dh: subscriptionJson.keys.p256dh,
    auth: subscriptionJson.keys.auth
  });
  return subscription;
};

const enablePush = async () => {
  console.log('enablePush called');
  const previousValue = notifications.value.push_notifications;
  try {
    if (!isPushSupported.value) throw new Error('Browser ini belum mendukung Web Push');
    const permission = await Notification.requestPermission();
    console.log('Permission:', permission);
    
    if (permission !== 'granted') throw new Error('Izin notifikasi belum diberikan');

    await ensurePushSubscription();
    await updateNotifications();
    pushStatus.value = 'Perangkat ini terdaftar untuk Web Push';
  } catch (err) {
    console.error('[DEBUG] Enable push error:', err);
    notifications.value.push_notifications = previousValue;
    showToast(err.message || 'Gagal mengaktifkan Web Push', 'error');
    await refreshPushStatus();
  }
};

const disablePush = async () => {
  try {
    if (isPushSupported.value) {
      const registration = await getPushRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.unsubscribePush({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
    }
    await updateNotifications();
    await refreshPushStatus();
  } catch (err) {
    notifications.value.push_notifications = true;
    showToast(err.message || 'Gagal menonaktifkan Web Push', 'error');
  }
};

const togglePush = () => notifications.value.push_notifications ? enablePush() : disablePush();

const sendTestPush = async () => {
  testSending.value = true;
  try {
    await api.sendTestPush();
    showToast('Notifikasi test sedang dikirim');
  } catch (err) {
    showToast(err.message || 'Gagal mengirim notifikasi test', 'error');
  } finally {
    testSending.value = false;
  }
};

const handleBack = () => {
  if (showPreferences.value) {
    showPreferences.value = false;
    return;
  }
  if (showCustomList.value) {
    showCustomList.value = false;
    closeEditForm();
    return;
  }
  router.push('/other');
};

onMounted(async () => {
  void loadCustomNotifications();
  loading.value = false;
  void fetchNotifications(false);
});

</script>

<template>
  <div class="space-y-4">
    <div class="relative flex items-center justify-center">
      <button
        @click="handleBack"
        class="absolute left-0 p-1 rounded-full text-accent cursor-pointer"
        aria-label="Kembali ke halaman lainnya"
      >
        <PhArrowLeft :size="24" weight="bold" />
      </button>
      <h2 class="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
        {{ showPreferences ? 'Preferensi Notifikasi' : 'Notifikasi' }}
      </h2>
      <button
        v-if="showCustomList"
        @click="openAddNotification"
        class="absolute right-0 p-1 text-accent cursor-pointer"
      >
        <PhPlus :size="24" weight="bold" />
      </button>
    </div>

    <div v-if="loading" class="bg-white border border-slate-200/60 rounded-2xl p-6 text-center text-xs text-slate-400 font-semibold">
      Memuat pengaturan notifikasi...
    </div>

    <div v-else class="divide-y divide-slate-100">
      <div v-if="!showPreferences && !showCustomList" class="divide-y divide-slate-100">
      <button
        type="button"
        @click="openPreferences"
        class="w-full bg-transparent py-4 px-1 flex items-center justify-between hover:bg-slate-50/50 active:scale-[0.99] transition-all cursor-pointer text-left"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-accent-light/10 text-accent flex items-center justify-center shrink-0">
            <PhBell :size="20" weight="bold" />
          </div>
          <div>
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wide">Preferensi Notifikasi</h3>
            <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Pilih peringatan yang ingin Anda terima.</p>
          </div>
        </div>
        <PhCaretRight :size="16" weight="bold" class="text-slate-400 shrink-0" />
      </button>

      <button
        type="button"
        @click="openCustomList"
        class="w-full bg-transparent py-4 px-1 flex items-center justify-between hover:bg-slate-50/50 active:scale-[0.99] transition-all cursor-pointer text-left"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-accent-light/10 text-accent flex items-center justify-center shrink-0">
            <PhBell :size="20" weight="bold" />
          </div>
          <div>
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wide">Notifikasi Kustom</h3>
            <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Buat pengingat atau pesan notifikasi sendiri.</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span v-if="customNotifications.length" class="text-[10px] font-black text-accent bg-accent-light/10 px-2 py-0.5 rounded-full">{{ customNotifications.length }}</span>
          <PhCaretRight :size="16" weight="bold" class="text-slate-400" />
        </div>
      </button>

      <button
        @click="sendTestPush"
        :disabled="testSending"
        class="w-full bg-transparent py-4 px-1 flex items-center justify-between hover:bg-slate-50/50 active:scale-[0.99] transition-all cursor-pointer text-left disabled:opacity-50 disabled:cursor-wait"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-accent-light/10 text-accent flex items-center justify-center shrink-0">
            <PhBell :size="20" weight="bold" />
          </div>
          <div>
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wide">Kirim Notifikasi Test</h3>
            <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Uji pengiriman push notification ke perangkat ini.</p>
          </div>
        </div>
        <PhCaretRight :size="16" weight="bold" class="text-slate-400 shrink-0" />
      </button>
      </div>

      <div v-else-if="showPreferences" class="py-4 px-4 space-y-4">
        <div class="space-y-4">
        <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0 pr-4">
          <PhEnvelope :size="20" weight="bold" class="text-accent shrink-0" />
          <div>
            <h4 class="text-xs font-black text-slate-800 uppercase tracking-wide">Notifikasi Email</h4>
            <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Kirim ringkasan laporan keuangan bulanan ke email.</p>
          </div>
        </div>
        <label class="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            v-model="notifications.email_notifications"
            @change="updateNotifications"
            :disabled="saving"
            type="checkbox"
            class="sr-only peer"
          >
          <div class="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
        </label>
      </div>

      <div class="flex items-center justify-between pt-3 border-t border-slate-100">
        <div class="flex items-center gap-3 min-w-0 pr-4">
          <PhGlobe :size="20" weight="bold" class="text-accent shrink-0" />
          <div>
            <h4 class="text-xs font-black text-slate-800 uppercase tracking-wide">Notifikasi Web Push</h4>
            <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Dapatkan peringatan overbudget langsung di browser.</p>
            <p class="text-[10px] text-slate-400 font-semibold mt-1">{{ pushStatus }}</p>
          </div>
        </div>
        <label class="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            v-model="notifications.push_notifications"
            @change="togglePush"
            :disabled="saving"
            type="checkbox"
            class="sr-only peer"
          >
          <div class="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
        </label>
      </div>
        </div>
      </div>

      <div v-else-if="showCustomList" class="py-4 px-4 space-y-4">
        <!-- Edit Form (overlay) -->
        <div v-if="showEditForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" @click.self="closeEditForm">
          <div class="w-full max-w-md mx-4 bg-white rounded-2xl M- p-4 shadow-2xl animate-in fade-in duration-200" @click.stop>
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider">
                {{ editingNotification ? 'Edit Notifikasi' : 'Tambah Notifikasi' }}
              </h4>
              <button @click="closeEditForm" class="w-8 h-8 flex items-center justify-center text-slate-400 cursor-pointer">
                <PhX :size="18" weight="bold" />
              </button>
            </div>

            <div class="space-y-3">
              <div>
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Judul</label>
                <input v-model="editTitle" type="text" maxlength="80"
                  class="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-accent mt-1 bg-slate-50" />
              </div>

              <div>
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Isi Notifikasi</label>
                <textarea v-model="editBody" maxlength="240" rows="3"
                  class="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-accent mt-1 bg-slate-50 resize-none"></textarea>
              </div>

              <div>
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tanggal Pengiriman</label>
                <button type="button" @click="showEditDateCalendar = true"
                  class="w-full h-[38px] bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 px-3 hover:bg-slate-100 transition-colors flex items-center gap-2 mt-1 cursor-pointer">
                  <PhCalendarDots :size="16" class="text-accent shrink-0" />
                  <span>{{ formatDateForDisplay(editDate) }}</span>
                </button>
              </div>

              <div>
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Waktu Pengiriman</label>
                <button type="button" @click="showEditTimeCalendar = true"
                  class="w-full h-[38px] bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 px-3 hover:bg-slate-100 transition-colors flex items-center gap-2 mt-1 cursor-pointer">
                  <PhCalendarDots :size="16" class="text-accent shrink-0" />
                  <span>{{ formatTimeForDisplay(editTime) }}</span>
                </button>
              </div>

              <div>
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pengulangan</label>
                <select v-model="editFrequency"
                  class="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-accent mt-1 bg-slate-50 cursor-pointer">
                  <option value="once">Sekali pada waktu tertentu</option>
                  <option value="daily">Setiap hari</option>
                  <option value="weekly">Setiap minggu</option>
                  <option value="monthly">Setiap bulan</option>
                </select>
              </div>
            </div>

            <div class="flex gap-2 mt-4">
              <button
                @click="closeEditForm"
                class="flex-1 bg-slate-100 text-slate-700 font-black text-xs py-2.5 px-4 rounded-xl cursor-pointer transition-all hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                @click="saveCustomNotification"
                class="flex-1 bg-accent text-white font-black text-xs py-2.5 px-4 rounded-xl cursor-pointer transition-all hover:opacity-95"
              >
                {{ editingNotification ? 'Simpan' : 'Tambah' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Notification List with Swipe -->
        <div v-if="customNotifications.length === 0" class="text-center py-8">
          <PhBell :size="32" class="text-slate-300 mx-auto mb-2" />
          <p class="text-[10px] text-slate-400 font-semibold">Belum ada notifikasi kustom.</p>
          <p class="text-[10px] text-slate-400 font-semibold mt-1">Klik + untuk membuat notifikasi baru.</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="notification in customNotifications"
            :key="notification.id"
            class="relative"
          >
            <!-- Swipe Actions (behind card) -->
            <div
              class="absolute inset-0 flex items-center justify-end rounded-2xl overflow-hidden"
            >
              <button
                @click="openEditNotification(notification)"
                @mousedown.stop
                class="w-16 h-full flex items-center justify-center text-white bg-indigo-600 cursor-pointer transition-all hover:bg-indigo-700"
              >
                <PhPencil :size="24" weight="bold" />
              </button>
              <button
                @click="initiateDelete(notification.id)"
                @mousedown.stop
                class="w-16 h-full flex items-center justify-center text-white bg-rose-500 cursor-pointer transition-all hover:bg-rose-600"
              >
                <PhTrash :size="24" weight="bold" />
              </button>
            </div>

            <!-- Swipeable Card -->
            <div
              class="relative bg-white border border-b-slate-200/60 rounded-xl p-3 shadow-sm transition-transform duration-200 cursor-pointer"
              :style="{ transform: `translateX(${getCustomSwipeTranslate(notification.id)}px)` }"
              @touchstart="handleCustomTouchStart($event, notification.id)"
              @touchmove="handleCustomTouchMove($event, notification.id)"
              @touchend="handleCustomTouchEnd($event, notification.id)"
              @mousedown="handleCustomMouseDown($event, notification.id)"
              @click="handleCustomClick($event, notification.id)"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0 pr-2">
                  <h4 class="text-xs font-black text-slate-800 uppercase tracking-wide truncate">{{ notification.title }}</h4>
                  <p class="text-[10px] text-slate-455 font-semibold mt-0.5 line-clamp-2">{{ notification.body }}</p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <span class="text-[10px] font-black text-slate-400 uppercase">{{ getFrequencyLabel(notification.frequency) }}</span>
                </div>
              </div>

              <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <div class="flex items-center gap-1">
                  <PhCalendarDots :size="12" class="text-slate-400" />
                  <span class="text-[10px] font-semibold text-slate-455">{{ formatDateForDisplay(notification.date) }}</span>
                  <span class="text-[10px] font-semibold text-slate-400">•</span>
                  <span class="text-[10px] font-semibold text-slate-455">{{ formatTimeForDisplay(notification.time) }}</span>
                </div>
                <button
                  @click.stop="sendNotificationNow(notification)"
                  class="flex items-center gap-1 text-[10px] font-black text-accent bg-accent-light/10 px-2 py-1 rounded-lg cursor-pointer transition-all hover:bg-accent-light/20"
                >
                  <PhPaperPlane :size="12" weight="bold" />
                  <span>Kirim Sekarang</span>
                </button>
                <button
                  @click.stop="sendNotificationInTenSeconds(notification)"
                  class="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg cursor-pointer transition-all hover:bg-amber-100"
                >
                  <PhTimer :size="12" weight="bold" />
                  <span>10 Detik</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <Calendar v-if="showEditDateCalendar" v-model="editDate" :allow-future="true"
    @close="showEditDateCalendar = false" />
  <Calendar v-if="showEditTimeCalendar" v-model="editTime" :time-only="true" :show-time="true"
    @close="showEditTimeCalendar = false" />

  <ConfirmDeleteModal
    v-model:show="showDeleteConfirm"
    title="Konfirmasi Hapus"
    message="Apakah Anda yakin ingin menghapus notifikasi ini?"
    confirm-text="Ya, Hapus"
    cancel-text="Batal"
    @confirm="confirmDelete"
    @cancel="showDeleteConfirm = false"
  />
</template>
