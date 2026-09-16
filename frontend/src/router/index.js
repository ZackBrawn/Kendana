import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import Wallets from '../views/Wallets.vue';
import Other from '../views/Other.vue';
import Notifications from '../views/Notifications.vue';
import Budgets from '../views/Budgets.vue';
import Analytics from '../views/Analytics.vue';
import Loans from '../views/Loans.vue';
import Chat from '../views/Chat.vue';
import Auth from '../views/Auth.vue';

const routes = [
  { path: '/', name: 'Dashboard', component: Dashboard },
  { path: '/wallets', name: 'Wallets', component: Wallets },
  { path: '/other', name: 'Other', component: Other },
  { path: '/other/notifikasi', name: 'Notifications', component: Notifications },
  { path: '/budgets', name: 'Budgets', component: Budgets },
  { path: '/analytics', name: 'Analytics', component: Analytics },
  { path: '/loans', name: 'Loans', component: Loans },
  { path: '/chat', name: 'Chat', component: Chat },
  { path: '/login', name: 'Auth', component: Auth }
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
