<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api, showToast } from '../api';
import { PhArrowLeft, PhPaperPlaneRight, PhX, PhCheck, PhWarning, PhFolder, PhWallet, PhRobot } from "@phosphor-icons/vue";

const router = useRouter();

const messages = ref([]);
const conversation = ref(null);
const botProfile = ref({ name: 'ZackBrawn', avatar: '🤖' });
const loading = ref(true);
const isTyping = ref(false);
const inputText = ref('');
const chatAreaRef = ref(null);
const wallets = ref([]);

const loadChatData = async () => {
  try {
    const data = await api.getChatIndex();
    conversation.value = data.conversation;
    messages.value = data.messages || [];
    if (data.botProfile) {
      botProfile.value = data.botProfile;
    }
    
    const wData = await api.getChatWallets();
    wallets.value = wData.wallets || [];
    
    // Check if any assistant message is pending/processing to resume polling
    messages.value.forEach(msg => {
      if (msg.role === 'assistant' && ['pending', 'processing'].includes(msg.status)) {
        pollBotMessageStatus(msg.id);
      }
    });

    scrollToBottom();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    loading.value = false;
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (chatAreaRef.value) {
      chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight;
    }
  });
};

const handleSend = async () => {
  if (!inputText.value.trim()) return;

  const text = inputText.value.trim();
  inputText.value = '';

  // Insert user message local preview
  const userMsgId = Date.now();
  messages.value.push({
    id: userMsgId,
    role: 'user',
    status: 'completed',
    content: [{ type: 'text', text }]
  });

  isTyping.value = true;
  scrollToBottom();

  try {
    const res = await api.sendChatMessage({
      message: text,
      conversation_id: conversation.value?.id
    });

    // Check if command processed sync or queued async
    if (res.queued) {
      // Insert bot message shell
      messages.value.push({
        id: res.bot_message.id,
        role: 'assistant',
        status: 'pending',
        content: []
      });
      pollBotMessageStatus(res.bot_message.id);
    } else {
      isTyping.value = false;
      messages.value.push({
        id: res.bot_message.id,
        role: 'assistant',
        status: 'completed',
        content: res.bot_message.content
      });
      scrollToBottom();
    }
  } catch (err) {
    showToast(err.message, 'error');
    isTyping.value = false;
  }
};

const pollBotMessageStatus = (msgId) => {
  isTyping.value = true;
  const interval = setInterval(async () => {
    try {
      const res = await api.getChatMessageStatus(msgId);
      if (['completed', 'failed'].includes(res.status)) {
        clearInterval(interval);
        isTyping.value = false;

        // Update target message
        const idx = messages.value.findIndex(m => m.id === msgId);
        if (idx !== -1) {
          messages.value[idx].status = res.status;
          messages.value[idx].content = res.bot_message?.content || [];
        }
        scrollToBottom();
      }
    } catch (err) {
      clearInterval(interval);
      isTyping.value = false;
    }
  }, 1500);
};

// Draft action: Assign Wallet
const handleAssignWallet = async (draftId, walletId, messageId) => {
  try {
    await api.assignChatWallet(draftId, walletId);
    showToast('Dompet transaksi berhasil dihubungkan!', 'success');
    
    // Refresh current chat index to sync visual card states
    const data = await api.getChatIndex();
    messages.value = data.messages || [];
    scrollToBottom();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Draft action: Confirm
const handleConfirm = async (draftId) => {
  try {
    await api.confirmChatTransaction(draftId);
    showToast('Transaksi berhasil dikonfirmasi dan dicatat!', 'success');
    
    const data = await api.getChatIndex();
    messages.value = data.messages || [];
    scrollToBottom();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Draft action: Cancel
const handleCancel = async (draftId) => {
  try {
    await api.cancelChatTransaction(draftId);
    showToast('Draf transaksi dibatalkan.', 'info');
    
    const data = await api.getChatIndex();
    messages.value = data.messages || [];
    scrollToBottom();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

onMounted(loadChatData);
</script>

<template>
  <div class="flex flex-col h-screen min-h-0 relative select-none">
    <!-- Header -->
    <div class="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
      <button @click="router.push('/other')" class="p-1 rounded-full text-accent text-xs font-bold flex items-center gap-1 cursor-pointer">
        <PhArrowLeft :size="24" weight="bold" />
      </button>
      <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">{{ botProfile.name }}</h3>
      <div class="w-12"></div> <!-- Spacer -->
    </div>

    <!-- Chat Area -->
    <div ref="chatAreaRef" class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar min-h-0 bg-slate-50">
      <div v-if="loading" class="text-center py-12 text-xs text-slate-400 font-bold">
        Memuat obrolan...
      </div>

      <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center text-center py-16 space-y-3">
        <div class="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-3xl shadow-xs">
          <PhRobot :size="32" />
        </div>
        <div>
          <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Mulai Obrolan Keuangan</h3>
          <p class="text-[10px] text-slate-400 max-w-[200px] mt-1 font-bold leading-normal">
            Ketik kalimat seperti "bayar kopi 25rb pakai cash" untuk mulai mencatat.
          </p>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div v-for="msg in messages" :key="msg.id" :class="[
          'flex flex-col max-w-[85%] rounded-3xl p-3.5 shadow-2xs leading-relaxed',
          msg.role === 'user'
            ? 'bg-accent text-white ml-auto rounded-tr-none'
            : 'bg-white border border-slate-200/80 mr-auto rounded-tl-none text-slate-800'
        ]">
          <!-- Components renderer -->
          <div v-for="(comp, cIdx) in msg.content" :key="cIdx" class="space-y-2">
            <!-- Text component -->
            <p v-if="comp.type === 'text'" class="text-xs font-semibold whitespace-pre-wrap">{{ comp.text }}</p>

            <!-- Error component -->
            <div v-else-if="comp.type === 'error'" class="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
              <PhWarning :size="16" />
              <span>{{ comp.message }}</span>
            </div>

            <!-- Transaction Card component -->
            <div v-else-if="comp.type === 'transaction_card'" class="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 mt-2">
              <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/50 text-indigo-700 tracking-wider">
                  {{ comp.transaction.type_key === 'income' ? 'Pemasukan' : 'Pengeluaran' }}
                </span>
                <span class="text-xs font-black text-slate-800">
                  {{ comp.transaction.amount_formatted || `Rp ${Number(comp.transaction.amount).toLocaleString('id-ID')}` }}
                </span>
              </div>
              <div class="space-y-1.5 text-[10px] font-bold text-slate-600">
                <p v-if="comp.transaction.subject" class="flex justify-between">
                  <span>Subject:</span>
                  <span class="text-slate-800">{{ comp.transaction.subject }}</span>
                </p>
                <p v-if="comp.transaction.category" class="flex justify-between items-center">
                  <span>Kategori:</span>
                  <span class="text-slate-800 flex items-center gap-1">
                    <PhFolder :size="12" />
                    {{ comp.transaction.category }}
                  </span>
                </p>
                <p v-if="comp.transaction.source_wallet || comp.transaction.dest_wallet" class="flex justify-between items-center">
                  <span>Dompet:</span>
                  <span class="text-slate-800 flex items-center gap-1">
                    <PhWallet :size="12" />
                    {{ comp.transaction.source_wallet || comp.transaction.dest_wallet }}
                  </span>
                </p>
              </div>

              <!-- Selection box to connect wallet -->
              <div v-if="comp.needs_wallet && comp.is_draft" class="pt-2 space-y-1.5">
                <label class="text-[9px] font-black uppercase text-slate-400 tracking-wider">Hubungkan Dompet Pembayaran</label>
                <select @change="handleAssignWallet(comp.transaction.id, $event.target.value, msg.id)"
                  class="w-full h-8 px-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 focus:outline-none focus:border-accent">
                  <option value="">-- Pilih Dompet --</option>
                  <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
                </select>
              </div>

              <!-- Action buttons for draf confirmation -->
              <div v-if="comp.is_draft" class="flex gap-1.5 pt-2 shrink-0">
                <button @click="handleCancel(comp.transaction.id)"
                  class="flex-1 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1">
                  <PhX :size="12" />
                  <span>Batal</span>
                </button>
                <button @click="handleConfirm(comp.transaction.id)" :disabled="comp.needs_wallet"
                  class="flex-1 h-8 bg-accent text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1 disabled:opacity-50 disabled:pointer-events-none">
                  <PhCheck :size="12" />
                  <span>Konfirmasi</span>
                </button>
              </div>

              <div v-else-if="comp.transaction.is_cancelled" class="pt-2 text-center text-[10px] font-black uppercase text-rose-500 tracking-wider">
                Draf ini telah Dibatalkan / Expired
              </div>
              <div v-else class="pt-2 text-center text-[10px] font-black uppercase text-emerald-500 tracking-wider flex items-center justify-center gap-1">
                <PhCheck :size="12" weight="bold" />
                Draf Berhasil Dicatat
              </div>
            </div>
          </div>
        </div>

        <!-- Typing state bubble -->
        <div v-if="isTyping" class="bg-transparent mr-auto p-3.5 text-slate-400 flex items-center gap-1">
          <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
          <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
          <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
        </div>
      </div>
    </div>

    <!-- Composer input -->
    <div class="p-3 mb-3 bg-white border-t border-slate-200/80 shrink-0">
      <form @submit.prevent="handleSend" class="flex gap-2 relative">
        <input v-model="inputText" type="text" placeholder="Ketik pesan Anda..."
          class="flex-1 h-11 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-accent focus:bg-white transition-all pr-12" />
        <button type="submit" :disabled="!inputText.trim()"
          class="absolute right-1 top-1 bottom-1 w-9 bg-accent hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl flex items-center justify-center shadow-md shadow-accent/25 transition-all">
          <PhPaperPlaneRight :size="18" weight="bold" />
        </button>
      </form>
    </div>
  </div>
</template>