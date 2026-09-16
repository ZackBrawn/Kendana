const DB_NAME = 'kendana-offline';
const DB_VERSION = 1;

let databasePromise;

const openDatabase = () => {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache');
      if (!db.objectStoreNames.contains('syncQueue')) db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
};

const transaction = async (storeName, mode, action) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = action(tx.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getCache = (key) => transaction('cache', 'readonly', store => store.get(key));
export const setCache = (key, value) => transaction('cache', 'readwrite', store => store.put(JSON.parse(JSON.stringify(value)), key));
export const addSyncItem = (item) => transaction('syncQueue', 'readwrite', store => store.add(JSON.parse(JSON.stringify(item))));
export const getSyncItems = () => transaction('syncQueue', 'readonly', store => store.getAll());
export const removeSyncItem = (id) => transaction('syncQueue', 'readwrite', store => store.delete(id));
