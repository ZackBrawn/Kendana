<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api, setAuthToken } from '../api';

const router = useRouter();
const route = useRoute();
const isLogin = ref(true);
const name = ref('');
const email = ref('');
const password = ref('');
const errorMsg = ref('');
const loading = ref(false);

onMounted(() => {
  if (route.query.token) {
    setAuthToken(route.query.token);
    router.push('/');
  }
});

const handleSubmit = async () => {
  errorMsg.value = '';
  loading.value = true;
  try {
    let res;
    if (isLogin.value) {
      res = await api.login({ email: email.value, password: password.value });
    } else {
      res = await api.register({ name: name.value, email: email.value, password: password.value });
    }
    setAuthToken(res.token);
    router.push('/');
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-[80vh] flex flex-col justify-center">
    <div class="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xl space-y-5">
      <div class="text-center space-y-1">
        <div
          class="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-md shadow-indigo-500/20">
          F
        </div>
        <h2 class="text-xl font-black text-slate-900 tracking-tight pt-2">Kendana</h2>
        <p class="text-xs text-slate-500 font-medium">{{ isLogin ? 'Masuk ke akun Anda' : 'Buat akun baru' }}</p>
      </div>

      <div v-if="errorMsg" class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
        {{ errorMsg }}
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-3">
        <div v-if="!isLogin">
          <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Nama Lengkap</label>
          <input v-model="name" type="text" placeholder="Nama Anda" required
            class="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600" />
        </div>

        <div>
          <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Email</label>
          <input v-model="email" type="email" placeholder="nama@email.com" required
            class="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600" />
        </div>

        <div>
          <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Password</label>
          <input v-model="password" type="password" placeholder="••••••••" required
            class="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600" />
        </div>

        <button type="submit" :disabled="loading"
          class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold rounded-2xl shadow-md transition-all text-xs uppercase tracking-wider">
          {{ loading ? 'Memproses...' : (isLogin ? 'Masuk' : 'Daftar') }}
        </button>
      </form>

      <div class="relative flex py-1 items-center">
        <div class="flex-grow border-t border-slate-150"></div>
        <span class="flex-shrink mx-3.5 text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">atau</span>
        <div class="flex-grow border-t border-slate-150"></div>
      </div>

      <a href="/api/auth/google" 
        class="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-98 text-slate-750 font-bold rounded-2xl shadow-xs transition-all text-xs flex items-center justify-center gap-2 cursor-pointer select-none">
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.48-1.12 2.73-2.38 3.58v3h3.84c2.25-2.06 3.68-5.1 3.68-8.41z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.84-3c-1.08.72-2.45 1.16-4.09 1.16-3.15 0-5.81-2.13-6.76-5H1.27v3.1A11.99 11.99 0 0012 24z"/>
          <path fill="#FBBC05" d="M5.24 14.25a7.12 7.12 0 010-4.5V6.65H1.27a11.99 11.99 0 000 10.7l3.97-3.1z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.37 2.67 1.27 6.65l3.97 3.1c.95-2.87 3.61-5 6.76-5z"/>
        </svg>
        <span>Masuk dengan Google</span>
      </a>

      <div class="text-center pt-2 border-t border-slate-100">
        <button @click="isLogin = !isLogin" class="text-xs font-bold text-indigo-600 hover:underline">
          {{ isLogin ? 'Belum punya akun? Daftar gratis' : 'Sudah punya akun? Masuk' }}
        </button>
      </div>
    </div>
  </div>
</template>

