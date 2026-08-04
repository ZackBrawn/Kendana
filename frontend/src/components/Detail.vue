<script setup>
import { ref, computed } from 'vue';
import { api, showToast } from '../api';
import { PhX, PhPencil, PhTrash, PhWarning } from "@phosphor-icons/vue";


import * as FinLogos from '../finlogos';

import { resolveIcon, formatRp } from '../utils/helpers';

const props = defineProps({
  transaction: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'edit', 'deleted']);

const loading = ref(false);
const errorMsg = ref('');



const amountColorClass = computed(() => {
  const t = props.transaction;
  if (t.type_id === 1) return 'text-income';
  if (t.type_id === 2) return 'text-expense';
  return 'text-transfer'; // 3.transfer 4.debt 5.receivable
});

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} ${timePart}`;
};

const showDeleteConfirm = ref(false);

const triggerDelete = () => {
  showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
  showDeleteConfirm.value = false;
  loading.value = true;
  errorMsg.value = '';
  try {
    await api.deleteTransaction(props.transaction.id);
    showToast('Transaksi berhasil dihapus', 'success');
    emit('deleted');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
    @click.self="$emit('close')">
    <div
      class="w-full max-w-sm bg-white rounded-xl p-5 shadow-2xl border border-slate-100 space-y-1 relative z-10 overflow-hidden">

      <div class="flex items-center justify-between">
        <button @click="$emit('close')"
          class="w-8 h-8 flex items-center justify-center transition-colors text-xs font-bold" aria-label="Tutup">
          <PhX :size="24" />
        </button>
        <div class="flex items-center gap-5">
          <button type="button" @click="$emit('edit')" :disabled="loading"
            class="w-8 h-8 flex items-center justify-center transition-colors text-xs" title="Edit Transaksi">
            <PhPencil :size="24" />
          </button>
          <button type="button" @click="triggerDelete" :disabled="loading"
            class="w-8 h-8 flex items-center justify-center transition-colors text-xs" title="Hapus Transaksi">
            <PhTrash :size="24" />
          </button>
        </div>
      </div>

      <div v-if="errorMsg" class="p-2.5 text-rose-500 rounded-xl text-xs font-semibold">
        {{ errorMsg }}
      </div>
      <div class="flex items-center gap-2 select-none">
        <span class="text-4xl shrink-0 flex items-center justify-center leading-none h-10 w-10 text-slate-700">
          <component :is="resolveIcon(transaction.category_icon)" v-if="resolveIcon(transaction.category_icon)"
            :size="32" />
          <component :is="transaction.type_id === 1 ? resolveIcon('PhArrowDownLeft') : resolveIcon('PhArrowUpRight')" v-else :size="24" />
        </span>
        <h4 class="text-sm font-bold text-slate-900 truncate leading-none">
          {{ transaction.category_name || (transaction.type_id === 1 ? 'Pemasukan' : 'Pengeluaran') }}
        </h4>
      </div>

      <div class="pb-1">
        <span :class="['text-xs font-black tracking-tight', amountColorClass]">
          {{ transaction.type_id === 1 ? '+' : (transaction.type_id === 2 ? '-' : '') }}{{ formatRp(transaction.amount)
          }}
        </span>
      </div>

      <div class="space-y-2 text-xs font-semibold text-slate-500">
        <div>
          Tanggal: <span class="text-slate-900 font-bold">{{ formatDateTime(transaction.date) }}</span>
        </div>
        <div>
          Dompet:
          <span class="text-slate-900 font-bold">
            <template v-if="transaction.type_id === 3">
              {{ transaction.source_wallet_name }} ➔ {{ transaction.dest_wallet_name }}
            </template>
            <template v-else-if="transaction.type_id === 1 || transaction.type_id === 4">
              {{ transaction.dest_wallet_name }}
            </template>
            <template v-else>
              {{ transaction.source_wallet_name }}
            </template>
          </span>
        </div>

        <div>
          Catatan: <span class="text-slate-500 font-semibold leading-relaxed break-words">{{ transaction.notes || '-'
          }}</span>
        </div>
      </div>

      <Teleport to="body">
        <div v-if="showDeleteConfirm"
          class="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            class="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div class=" p-4 rounded-full inline-flex">
              <PhWarning :size="52" color="#ec2727" />
            </div>
            <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Konfirmasi Hapus</h3>
            <p class="text-xs text-slate-500 font-semibold leading-relaxed">Apakah Anda yakin ingin menghapus transaksi
              ini?
            </p>
            <div class="flex gap-2.5 pt-1">
              <button @click="showDeleteConfirm = false"
                class="flex-1 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border border-slate-200">
                Batal
              </button>
              <button @click="confirmDelete"
                class="flex-1 py-2 bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-500/25">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      </Teleport>

    </div>
  </div>
</template>
