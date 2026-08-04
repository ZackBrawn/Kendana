<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, setAuthToken } from '../api';

const router = useRouter();
const isLogin = ref(true);
const name = ref('');
const email = ref('user@demo.com');
const password = ref('password123');
const errorMsg = ref('');
const loading = ref(false);

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

      <div class="text-center pt-2 border-t border-slate-100">
        <button @click="isLogin = !isLogin" class="text-xs font-bold text-indigo-600 hover:underline">
          {{ isLogin ? 'Belum punya akun? Daftar gratis' : 'Sudah punya akun? Masuk' }}
        </button>
      </div>
    </div>
  </div>
</template>
