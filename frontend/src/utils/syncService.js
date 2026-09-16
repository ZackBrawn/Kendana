import { getSyncItems, removeSyncItem } from './offlineDb';
import { api } from '../api';

let isSyncing = false;

export const syncOfflineData = async () => {
  if (isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
  
  try {
    isSyncing = true;
    const items = await getSyncItems();
    if (!items || items.length === 0) {
      isSyncing = false;
      return;
    }

    // Process each item in the queue sequentially
    for (const item of items) {
      try {
        if (item.kind === 'transaction') {
          await api.request('/transactions', { method: 'POST', body: JSON.stringify(item.payload) });
        } else if (item.kind === 'update-transaction') {
          await api.request(`/transactions/${item.payload.id}`, { method: 'PUT', body: JSON.stringify(item.payload.data) });
        } else if (item.kind === 'delete-transaction') {
          await api.request(`/transactions/${item.payload.id}`, { method: 'DELETE' });
        } else if (item.kind === 'setting') {
          await api.request(item.payload.endpoint, { method: 'PATCH', body: JSON.stringify(item.payload.data) });
        } else if (item.kind === 'custom-notification') {
          await api.request('/custom-notifications', { method: 'POST', body: JSON.stringify(item.payload) });
        }

        // If successful, remove from queue
        await removeSyncItem(item.id);
      } catch (error) {
        if (error.message && !error.message.includes('Failed to fetch')) {
           console.error('Failed to sync item due to server error, removing from queue:', item, error);
           await removeSyncItem(item.id);
        } else {
           console.error('Network error during sync, will retry later:', error);
        }
      }
    }
    
    // Refresh dashboard and transactions after sync
    window.dispatchEvent(new CustomEvent('sync-completed'));
  } catch (err) {
    console.error('Sync process failed:', err);
  } finally {
    isSyncing = false;
  }
};

export const startSyncListener = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      console.log('App is online. Starting sync...');
      syncOfflineData();
    });
    // Try to sync on startup
    syncOfflineData();
  }
};
