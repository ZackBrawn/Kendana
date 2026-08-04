import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
  { path: '/wallets', name: 'Wallets', component: () => import('../views/Wallets.vue') },
  { path: '/other', name: 'Other', component: () => import('../views/Other.vue') },
  { path: '/budgets', name: 'Budgets', component: () => import('../views/Budgets.vue') },
  { path: '/analytics', name: 'Analytics', component: () => import('../views/Analytics.vue') },
  { path: '/loans', name: 'Loans', component: () => import('../views/Loans.vue') },
  { path: '/login', name: 'Auth', component: () => import('../views/Auth.vue') }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('fm_token');
  if (to.name !== 'Auth' && !token) {
    next({ name: 'Auth' });
  } else {
    next();
  }
});

export default router;
