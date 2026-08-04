const API_BASE = '/api';

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
    'Content-Type': 'application/json',
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

export const api = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  getDashboard: () => request('/dashboard'),
  getWallets: () => request('/wallets'),
  createWallet: (data) => request('/wallets', { method: 'POST', body: JSON.stringify(data) }),
  updateWallet: (id, data) => request(`/wallets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWallet: (id) => request(`/wallets/${id}`, { method: 'DELETE' }),
  getCategories: () => request('/categories'),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
  getTransactions: () => request('/transactions'),
  createTransaction: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
  getAnalytics: () => request('/analytics'),
  getLoans: (type) => request(`/loans/${type}`),
  getBudgets: () => request('/budgets'),
  getBudgetDetail: (id) => request(`/budgets/${id}`),
  createBudget: (data) => request('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  updateBudget: (id, data) => request(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBudget: (id) => request(`/budgets/${id}`, { method: 'DELETE' })
};

export function showToast(message, type = 'success') {
  window.dispatchEvent(new CustomEvent('show-toast', {
    detail: { message, type }
  }));
}
