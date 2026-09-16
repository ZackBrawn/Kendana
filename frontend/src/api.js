const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
import { addSyncItem, getCache, setCache, getSyncItems, removeSyncItem } from './utils/offlineDb';

export function getAuthToken() {
  return localStorage.getItem('fm_token');
}

export function setAuthToken(token) {
  if (token) localStorage.setItem('fm_token', token);
  else localStorage.removeItem('fm_token');
}

export async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...((options.body instanceof FormData) ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Terjadi kesalahan pada server');
  }
  return data;
}

const isOffline = () => typeof navigator !== 'undefined' && !navigator.onLine;
const isNetworkError = (error) => error instanceof TypeError || error.message?.includes('Failed to fetch');
const createClientId = () => window.crypto?.randomUUID?.() || `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const cacheOfflineTransaction = async (payload) => {
  const cachedTransactions = (await getCache('transactions')) || [];
  const categories = (await getCache('categories')) || [];
  const wallets = (await getCache('wallets')) || [];
  const dashboard = await getCache('dashboard');

  const category = categories.find(c => c.id == payload.category_id) || null;
  const sourceWallet = wallets.find(w => w.id == payload.source_wallet_id);
  const destWallet = payload.destination_wallet_id ? wallets.find(w => w.id == payload.destination_wallet_id) : null;
  
  // Basic transaction type deduction (1: Income, 2: Expense, 3: Transfer)
  let typeCode = payload.transaction_type_id == 1 ? 'INCOME' : (payload.transaction_type_id == 2 ? 'EXPENSE' : 'TRANSFER');
  const typeName = typeCode === 'INCOME' ? 'Income' : (typeCode === 'EXPENSE' ? 'Expense' : 'Transfer');

  const populatedTx = {
    ...payload,
    id: payload.client_id,
    transaction_id: payload.client_id,
    offline: true,
    date: payload.date ? payload.date.replace(' ', 'T') : new Date().toISOString(),
    type_id: payload.transaction_type_id,
    type_name: typeName,
    category_id: payload.category_id,
    category_name: category ? category.category_name : 'Offline',
    category_icon: category ? category.icon : 'PhWarning',
    source_wallet_id: payload.source_wallet_id,
    source_wallet_name: sourceWallet ? sourceWallet.name : '',
    destination_wallet_id: payload.destination_wallet_id,
    dest_wallet_name: destWallet ? destWallet.name : ''
  };

  await setCache('transactions', [populatedTx, ...cachedTransactions]);

  // Update wallet balances locally
  const updateWalletBalance = (walletList) => {
    return walletList.map(w => {
      if (w.id == payload.source_wallet_id) {
        if (typeCode === 'EXPENSE' || typeCode === 'TRANSFER') return { ...w, balance: Number(w.balance) - Number(payload.amount) };
        if (typeCode === 'INCOME') return { ...w, balance: Number(w.balance) + Number(payload.amount) };
      }
      if (typeCode === 'TRANSFER' && w.id == payload.destination_wallet_id) {
        return { ...w, balance: Number(w.balance) + Number(payload.amount) };
      }
      return w;
    });
  };

  const updatedWallets = updateWalletBalance(wallets);
  await setCache('wallets', updatedWallets);

  if (dashboard) {
    let newTotal = Number(dashboard.totalBalance);
    if (typeCode === 'INCOME') newTotal += Number(payload.amount);
    if (typeCode === 'EXPENSE') newTotal -= Number(payload.amount);
    
    await setCache('dashboard', {
      ...dashboard,
      totalBalance: newTotal,
      wallets: updateWalletBalance(dashboard.wallets || []),
      recentTransactions: [populatedTx, ...(dashboard.recentTransactions || [])]
    });
  }
};

const getCachedOrRequest = async (cacheKey, endpoint) => {
  if (isOffline()) return (await getCache(cacheKey)) || [];
  try {
    const data = await request(endpoint);
    await setCache(cacheKey, data);
    return data;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    return (await getCache(cacheKey)) || [];
  }
};

const getDashboardCached = async () => {
  if (isOffline()) return (await getCache('dashboard')) || { totalBalance: 0, monthlyIncome: 0, monthlyExpense: 0, wallets: [], recentTransactions: [] };
  try {
    const data = await request('/dashboard');
    await setCache('dashboard', data);
    return data;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    return (await getCache('dashboard')) || { totalBalance: 0, monthlyIncome: 0, monthlyExpense: 0, wallets: [], recentTransactions: [] };
  }
};

const getWalletsCached = async () => {
  const cached = await getCache('wallets');
  if (isOffline()) {
    if (cached?.length) return cached;
    return (await getCache('dashboard'))?.wallets || [];
  }
  try {
    const data = await request('/wallets');
    await setCache('wallets', data);
    return data;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    return cached || (await getCache('dashboard'))?.wallets || [];
  }
};

const getMeCached = async () => {
  if (isOffline()) return (await getCache('me')) || { user: null, offline: true };
  try {
    const data = await request('/auth/me');
    await setCache('me', data);
    return data;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    return (await getCache('me')) || { user: null, offline: true };
  }
};

export const api = {
  request,
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: getMeCached,
  getDashboard: getDashboardCached,
  getWallets: getWalletsCached,
  createWallet: (data) => request('/wallets', { method: 'POST', body: JSON.stringify(data) }),
  updateWallet: (id, data) => request(`/wallets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWallet: (id) => request(`/wallets/${id}`, { method: 'DELETE' }),
  getCategories: () => getCachedOrRequest('categories', '/categories'),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
  getTransactions: () => getCachedOrRequest('transactions', '/transactions'),
  createTransaction: async (data) => {
    const payload = { ...data, client_id: data.client_id || createClientId() };
    if (isOffline()) {
      await addSyncItem({ kind: 'transaction', payload, created_at: new Date().toISOString() });
      await cacheOfflineTransaction(payload);
      return { success: true, offline: true, transaction: payload };
    }
    try {
      return await request('/transactions', { method: 'POST', body: JSON.stringify(payload) });
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await addSyncItem({ kind: 'transaction', payload, created_at: new Date().toISOString() });
      await cacheOfflineTransaction(payload);
      return { success: true, offline: true, transaction: payload };
    }
  },
  updateTransaction: async (id, data) => {
    if (isOffline()) {
      const queue = await getSyncItems();
      const createItem = queue.find(q => q.kind === 'transaction' && (q.payload.client_id === id || q.payload.id === id));
      if (createItem) {
        await removeSyncItem(createItem.id);
        await addSyncItem({ kind: 'transaction', payload: { ...createItem.payload, ...data }, created_at: createItem.created_at });
      } else {
        const updateItem = queue.find(q => q.kind === 'update-transaction' && q.payload.id === id);
        if (updateItem) {
          await removeSyncItem(updateItem.id);
          await addSyncItem({ kind: 'update-transaction', payload: { id, data: { ...updateItem.payload.data, ...data } }, created_at: updateItem.created_at });
        } else {
          await addSyncItem({ kind: 'update-transaction', payload: { id, data }, created_at: new Date().toISOString() });
        }
      }
      
      const txs = (await getCache('transactions')) || [];
      const oldTx = txs.find(t => t.id === id || t.transaction_id === id);
      if (oldTx) {
        const categories = (await getCache('categories')) || [];
        const wallets = (await getCache('wallets')) || [];
        const dashboard = await getCache('dashboard');

        const payload = { ...oldTx, ...data };
        const category = categories.find(c => c.id == payload.category_id) || null;
        const sourceWallet = wallets.find(w => w.id == payload.source_wallet_id);
        const destWallet = payload.destination_wallet_id ? wallets.find(w => w.id == payload.destination_wallet_id) : null;
        
        let typeCode = payload.transaction_type_id == 1 ? 'INCOME' : (payload.transaction_type_id == 2 ? 'EXPENSE' : 'TRANSFER');
        const typeName = typeCode === 'INCOME' ? 'Income' : (typeCode === 'EXPENSE' ? 'Expense' : 'Transfer');

        const populatedTx = {
          ...payload,
          offline: true,
          date: payload.date ? (payload.date.includes('T') ? payload.date : payload.date.replace(' ', 'T')) : new Date().toISOString(),
          type_id: payload.transaction_type_id,
          type_name: typeName,
          category_id: payload.category_id,
          category_name: category ? category.category_name : 'Offline',
          category_icon: category ? category.icon : 'PhWarning',
          source_wallet_id: payload.source_wallet_id,
          source_wallet_name: sourceWallet ? sourceWallet.name : '',
          destination_wallet_id: payload.destination_wallet_id,
          dest_wallet_name: destWallet ? destWallet.name : ''
        };

        await setCache('transactions', txs.map(t => (t.id === id || t.transaction_id === id) ? populatedTx : t));

        let oldTypeName = oldTx.type_name || (oldTx.type_id == 1 ? 'Income' : (oldTx.type_id == 2 ? 'Expense' : 'Transfer'));

        const updateWalletBalance = (walletList) => {
          return walletList.map(w => {
            let balance = Number(w.balance);
            
            const isSourceOld = w.id == oldTx.source_wallet_id || w.name === oldTx.source_wallet_name || (oldTx.source_wallet && w.id == oldTx.source_wallet.id);
            const isDestOld = w.id == oldTx.destination_wallet_id || w.name === oldTx.dest_wallet_name || (oldTx.destination_wallet && w.id == oldTx.destination_wallet.id);
            
            // Revert old
            if (isSourceOld) {
               if (oldTypeName === 'Expense' || oldTypeName === 'Transfer') balance += Number(oldTx.amount);
               if (oldTypeName === 'Income') balance -= Number(oldTx.amount);
            }
            if (oldTypeName === 'Transfer' && isDestOld) {
               balance -= Number(oldTx.amount);
            }
            // Apply new
            if (w.id == payload.source_wallet_id) {
               if (typeCode === 'EXPENSE' || typeCode === 'TRANSFER') balance -= Number(payload.amount);
               if (typeCode === 'INCOME') balance += Number(payload.amount);
            }
            if (typeCode === 'TRANSFER' && w.id == payload.destination_wallet_id) {
               balance += Number(payload.amount);
            }
            return { ...w, balance };
          });
        };

        await setCache('wallets', updateWalletBalance(wallets));

        if (dashboard) {
          let newTotal = Number(dashboard.totalBalance);
          if (oldTypeName === 'Income') newTotal -= Number(oldTx.amount);
          if (oldTypeName === 'Expense') newTotal += Number(oldTx.amount);
          if (typeCode === 'INCOME') newTotal += Number(payload.amount);
          if (typeCode === 'EXPENSE') newTotal -= Number(payload.amount);

          await setCache('dashboard', {
            ...dashboard,
            totalBalance: newTotal,
            wallets: updateWalletBalance(dashboard.wallets || []),
            recentTransactions: (dashboard.recentTransactions || []).map(t => (t.id === id || t.transaction_id === id) ? populatedTx : t)
          });
        }
      }
      return { success: true, offline: true };
    }
    try {
      return await request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await addSyncItem({ kind: 'update-transaction', payload: { id, data }, created_at: new Date().toISOString() });
      return { success: true, offline: true };
    }
  },
  deleteTransaction: async (id) => {
    if (isOffline()) {
      const queue = await getSyncItems();
      const createItem = queue.find(q => q.kind === 'transaction' && (q.payload.client_id === id || q.payload.id === id));
      if (createItem) {
        await removeSyncItem(createItem.id);
        const updates = queue.filter(q => q.kind === 'update-transaction' && q.payload.id === id);
        for(let u of updates) await removeSyncItem(u.id);
      } else {
        await addSyncItem({ kind: 'delete-transaction', payload: { id }, created_at: new Date().toISOString() });
      }
      
      const txs = (await getCache('transactions')) || [];
      const oldTx = txs.find(t => t.id === id || t.transaction_id === id);
      if (oldTx) {
        await setCache('transactions', txs.filter(t => t.id !== id && t.transaction_id !== id));
        
        const wallets = (await getCache('wallets')) || [];
        const dashboard = await getCache('dashboard');

        let oldTypeName = oldTx.type_name || (oldTx.type_id == 1 ? 'Income' : (oldTx.type_id == 2 ? 'Expense' : 'Transfer'));

        const updateWalletBalance = (walletList) => {
          return walletList.map(w => {
            let balance = Number(w.balance);
            const isSource = w.id == oldTx.source_wallet_id || w.name === oldTx.source_wallet_name || (oldTx.source_wallet && w.id == oldTx.source_wallet.id);
            const isDest = w.id == oldTx.destination_wallet_id || w.name === oldTx.dest_wallet_name || (oldTx.destination_wallet && w.id == oldTx.destination_wallet.id);
            
            if (isSource) {
               if (oldTypeName === 'Expense' || oldTypeName === 'Transfer') balance += Number(oldTx.amount);
               if (oldTypeName === 'Income') balance -= Number(oldTx.amount);
            }
            if (oldTypeName === 'Transfer' && isDest) {
               balance -= Number(oldTx.amount);
            }
            return { ...w, balance };
          });
        };

        await setCache('wallets', updateWalletBalance(wallets));

        if (dashboard) {
          let newTotal = Number(dashboard.totalBalance);
          if (oldTypeName === 'Income') newTotal -= Number(oldTx.amount);
          if (oldTypeName === 'Expense') newTotal += Number(oldTx.amount);

          await setCache('dashboard', {
            ...dashboard,
            totalBalance: newTotal,
            wallets: updateWalletBalance(dashboard.wallets || []),
            recentTransactions: (dashboard.recentTransactions || []).filter(t => t.id !== id && t.transaction_id !== id)
          });
        }
      }
      return { success: true, offline: true };
    }
    try {
      return await request(`/transactions/${id}`, { method: 'DELETE' });
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await addSyncItem({ kind: 'delete-transaction', payload: { id }, created_at: new Date().toISOString() });
      return { success: true, offline: true };
    }
  },
  getAnalytics: () => request('/analytics'),
  getLoans: (type) => request(`/loans/${type}`),
  getLoanSubjects: (type) => request(`/loans/${type}/subjects`),
  getBudgets: () => getCachedOrRequest('budgets', '/budgets'),
  getBudgetDetail: (id) => request(`/budgets/${id}`),
  createBudget: (data) => request('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  updateBudget: (id, data) => request(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBudget: (id) => request(`/budgets/${id}`, { method: 'DELETE' }),
  updateProfile: async (data) => {
    const cacheKey = 'me';
    if (isOffline()) {
      await addSyncItem({ kind: 'setting', payload: { endpoint: '/settings/profile', data }, created_at: new Date().toISOString() });
      const cached = await getCache(cacheKey);
      if (cached) await setCache(cacheKey, { ...cached, user: { ...(cached.user || {}), ...data } });
      return { success: true, offline: true };
    }
    try {
      const res = await request('/settings/profile', { method: 'PATCH', body: JSON.stringify(data) });
      const cached = await getCache(cacheKey);
      if (cached) await setCache(cacheKey, { ...cached, user: { ...(cached.user || {}), ...data } });
      return res;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await addSyncItem({ kind: 'setting', payload: { endpoint: '/settings/profile', data }, created_at: new Date().toISOString() });
      const cached = await getCache(cacheKey);
      if (cached) await setCache(cacheKey, { ...cached, user: { ...(cached.user || {}), ...data } });
      return { success: true, offline: true };
    }
  },
  updatePassword: (data) => request('/settings/password', { method: 'PATCH', body: JSON.stringify(data) }),
  updatePreferences: async (data) => {
    const cacheKey = 'me';
    if (isOffline()) {
      await addSyncItem({ kind: 'setting', payload: { endpoint: '/settings/preferences', data }, created_at: new Date().toISOString() });
      const cached = await getCache(cacheKey);
      if (cached) await setCache(cacheKey, { ...cached, user: { ...(cached.user || {}), ...data } });
      return { success: true, offline: true };
    }
    try {
      const res = await request('/settings/preferences', { method: 'PATCH', body: JSON.stringify(data) });
      const cached = await getCache(cacheKey);
      if (cached) await setCache(cacheKey, { ...cached, user: { ...(cached.user || {}), ...data } });
      return res;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await addSyncItem({ kind: 'setting', payload: { endpoint: '/settings/preferences', data }, created_at: new Date().toISOString() });
      const cached = await getCache(cacheKey);
      if (cached) await setCache(cacheKey, { ...cached, user: { ...(cached.user || {}), ...data } });
      return { success: true, offline: true };
    }
  },
  updateAppearance: async (data) => {
    const cacheKey = 'me';
    if (isOffline()) {
      await addSyncItem({ kind: 'setting', payload: { endpoint: '/settings/appearance', data }, created_at: new Date().toISOString() });
      const cached = await getCache(cacheKey);
      if (cached) await setCache(cacheKey, { ...cached, user: { ...(cached.user || {}), ...data } });
      return { success: true, offline: true };
    }
    try {
      const res = await request('/settings/appearance', { method: 'PATCH', body: JSON.stringify(data) });
      const cached = await getCache(cacheKey);
      if (cached) await setCache(cacheKey, { ...cached, user: { ...(cached.user || {}), ...data } });
      return res;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await addSyncItem({ kind: 'setting', payload: { endpoint: '/settings/appearance', data }, created_at: new Date().toISOString() });
      const cached = await getCache(cacheKey);
      if (cached) await setCache(cacheKey, { ...cached, user: { ...(cached.user || {}), ...data } });
      return { success: true, offline: true };
    }
  },
  updateNotifications: async (data) => {
    if (isOffline()) {
      await addSyncItem({ kind: 'setting', payload: { endpoint: '/settings/notifications', data }, created_at: new Date().toISOString() });
      return { success: true, offline: true };
    }
    try {
      return await request('/settings/notifications', { method: 'PATCH', body: JSON.stringify(data) });
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await addSyncItem({ kind: 'setting', payload: { endpoint: '/settings/notifications', data }, created_at: new Date().toISOString() });
      return { success: true, offline: true };
    }
  },
  updateFinanceLogic: async (data) => {
    const cacheKey = 'me';
    if (isOffline()) {
      await addSyncItem({ kind: 'setting', payload: { endpoint: '/settings/logic', data }, created_at: new Date().toISOString() });
      const cached = await getCache(cacheKey);
      if (cached) await setCache(cacheKey, { ...cached, user: { ...(cached.user || {}), ...data } });
      return { success: true, offline: true };
    }
    try {
      const res = await request('/settings/logic', { method: 'PATCH', body: JSON.stringify(data) });
      const cached = await getCache(cacheKey);
      if (cached) await setCache(cacheKey, { ...cached, user: { ...(cached.user || {}), ...data } });
      return res;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await addSyncItem({ kind: 'setting', payload: { endpoint: '/settings/logic', data }, created_at: new Date().toISOString() });
      const cached = await getCache(cacheKey);
      if (cached) await setCache(cacheKey, { ...cached, user: { ...(cached.user || {}), ...data } });
      return { success: true, offline: true };
    }
  },
  getRecentChanges: () => request('/settings/recent-changes'),
  clearCache: () => request('/settings/cache/clear', { method: 'POST' }),
  deleteAccount: (data) => request('/settings/account/delete', { method: 'POST', body: JSON.stringify(data) }),
  getAbout: () => request('/settings/about'),
  getWalletDetail: (id, params = {}) => request(`/wallets/${id}?${new URLSearchParams(params)}`),
  getCategoryDetail: (id, params = {}) => request(`/categories/${id}?${new URLSearchParams(params)}`),
  confirmTransaction: (id) => request(`/transactions/${id}/confirm`, { method: 'PATCH' }),
  getBudgetSettings: () => request('/budgets/settings'),
  updateBudgetSettings: (data) => request('/budgets/settings', { method: 'POST', body: JSON.stringify(data) }),
  generateAiBudget: (data) => request('/budgets/generate', { method: 'POST', body: JSON.stringify(data) }),
  getAiBudgetStatus: (params) => request(`/budgets/generate/status?${new URLSearchParams(params)}`),
  getAiBudgetGroup: (year, month) => request(`/budgets/group/${year}/${month}`),
  updateAiBudgetGroup: (id, data) => request(`/budgets/group/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  uploadEvidence: (formData) => request('/evidence', { method: 'POST', body: formData }),
  getEvidenceDraft: (uuid) => request(`/evidence/${uuid}/draft`),
  updateEvidenceDraft: (uuid, data) => request(`/evidence/${uuid}/draft`, { method: 'PATCH', body: JSON.stringify(data) }),
  commitEvidence: (uuid, data) => request(`/evidence/${uuid}/commit`, { method: 'POST', body: JSON.stringify(data) }),
  getEvidenceTimeline: (uuid) => request(`/evidence/${uuid}/timeline`),
  getEvidenceStats: () => request('/evidence/stats'),
  getEvidenceHealth: () => request('/evidence/health'),
  globalSearch: (query) => request(`/search?q=${encodeURIComponent(query)}`),
  getPushKey: () => request('/notifications/key'),
  subscribePush: (data) => request('/notifications/subscribe', { method: 'POST', body: JSON.stringify(data) }),
  unsubscribePush: (data) => request('/notifications/unsubscribe', { method: 'POST', body: JSON.stringify(data) }),
  sendTestPush: () => request('/notifications/test', { method: 'POST' }),
  getCustomNotifications: () => getCachedOrRequest('custom-notifications', '/custom-notifications'),
  createCustomNotification: async (data) => {
    if (isOffline()) {
      await addSyncItem({ kind: 'custom-notification', payload: data, created_at: new Date().toISOString() });
      return { ...data, offline: true, id: `offline-${Date.now()}` };
    }
    try {
      return await request('/custom-notifications', { method: 'POST', body: JSON.stringify(data) });
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await addSyncItem({ kind: 'custom-notification', payload: data, created_at: new Date().toISOString() });
      return { ...data, offline: true, id: `offline-${Date.now()}` };
    }
  },
  updateCustomNotification: (id, data) => request(`/custom-notifications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomNotification: (id) => request(`/custom-notifications/${id}`, { method: 'DELETE' }),
  reportPresence: (state) => isOffline()
    ? Promise.resolve({ offline: true })
    : request('/notifications/presence', { method: 'POST', body: JSON.stringify({ state }) }),
  getChatIndex: () => request('/chat'),
  sendChatMessage: (data) => request('/chat/message', { method: 'POST', body: JSON.stringify(data) }),
  getChatMessageStatus: (id) => request(`/chat/message/${id}/status`),
  getChatHistory: (params) => request(`/chat/history?${new URLSearchParams(params)}`),
  getChatCommands: () => request('/chat/commands'),
  getChatWallets: () => request('/chat/wallets'),
  assignChatWallet: (id, walletId) => request(`/chat/transaction/${id}/wallet`, { method: 'PATCH', body: JSON.stringify({ wallet_id: walletId }) }),
  confirmChatTransaction: (id) => request(`/chat/transaction/${id}/confirm`, { method: 'POST' }),
  cancelChatTransaction: (id) => request(`/chat/transaction/${id}/cancel`, { method: 'DELETE' })
};

export function showToast(message, type = 'success') {
  window.dispatchEvent(new CustomEvent('show-toast', {
    detail: { message, type }
  }));
}
