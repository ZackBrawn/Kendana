import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './style.css';
import { startOfflineSync } from './utils/offlineSync';

const app = createApp(App);
app.use(router);
app.mount('#app');
startOfflineSync();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('SW registered:', reg))
      .catch((err) => console.error('SW registration failed:', err));
  });
}