import { api, getAuthToken } from '../api';
import { getSyncItems, removeSyncItem } from './offlineDb';

let syncing = false;

export const syncOfflineQueue = async () => {
  if (syncing || !navigator.onLine || !getAuthToken()) return;
  syncing = true;
  try {
    const items = await getSyncItems();
    for (const item of items) {
      try {
        if (item.kind === 'transaction') {
          await api.request('/transactions', { method: 'POST', body: JSON.stringify(item.payload) });
        } else if (item.kind === 'custom-notification') {
          await api.request('/custom-notifications', { method: 'POST', body: JSON.stringify(item.payload) });
        }
        await removeSyncItem(item.id);
      } catch (error) {
        if (!navigator.onLine) break;
        console.error('Offline sync item failed:', error.message);
      }
    }
  } finally {
    syncing = false;
  }
};

export const startOfflineSync = () => {
  window.addEventListener('online', syncOfflineQueue);
  if (navigator.onLine && getAuthToken()) {
    Promise.allSettled([
      api.getMe(),
      api.getDashboard(),
      api.getWallets(),
      api.getCategories(),
      api.getTransactions(),
      api.getCustomNotifications()
    ]).catch(() => {});
  }
  void syncOfflineQueue();
};