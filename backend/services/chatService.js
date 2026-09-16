const { prisma } = require('../config/db');

async function processChatMessage(conversationId, userId, userMessageId, botMessageId) {
  // Update status to processing
  await prisma.chatMessage.update({
    where: { id: botMessageId },
    data: { status: 'processing' }
  });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userMsg = await prisma.chatMessage.findUnique({ where: { id: userMessageId } });
    if (!userMsg) throw new Error('Pesan user tidak ditemukan');

    const rawText = userMsg.raw_text;

    // Get wallets and categories
    const wallets = await prisma.wallet.findMany({
      where: { user_id: userId, group_type: { not: 'System' } }
    });
    const categories = await prisma.category.findMany({
      where: { user_id: userId }
    });

    const walletNames = wallets.map(w => w.name);
    const categoryNames = categories.map(c => c.category_name);

    const prompt = `
Kamu adalah ZackBrawn, asisten keuangan pribadi digital.
Tugas kamu adalah membantu menganalisis pesan obrolan natural language pengguna:
1. Tentukan apakah pengguna ingin mencatat transaksi keuangan (pengeluaran, pemasukan, transfer, hutang, piutang).
2. Jika YA (pencatatan transaksi):
   - intent harus: "transaction"
   - Ekstrak data:
     - amount: nominal uang (angka numerik).
     - type: "Income", "Expense", "Transfer", "Debt", atau "Receivable".
     - subject: deskripsi barang/merchant/hal yang dibeli/diterima.
     - category_name: nama kategori yang paling cocok dari daftar berikut: ${JSON.stringify(categoryNames)}. Jika tidak cocok, tebak nama kategori umum yang pantas.
     - source_wallet: nama dompet asal jika terdeteksi dari daftar berikut: ${JSON.stringify(walletNames)}. Jika tidak terdeteksi, biarkan null.
     - destination_wallet: nama dompet tujuan jika terdeteksi dari daftar berikut: ${JSON.stringify(walletNames)}. Jika tidak terdeteksi, biarkan null.
3. Jika TIDAK (hanya obrolan biasa, menyapa, bertanya tentang bantuan atau tips):
   - intent harus: "chat"
   - reply: kalimat respon asisten keuangan yang ramah, sopan, dan singkat.
4. Format output wajib berupa JSON valid berikut:
{
  "intent": "transaction" atau "chat",
  "reply": "...",
  "transaction": {
    "amount": 15000,
    "type": "Expense",
    "subject": "...",
    "category_name": "...",
    "source_wallet": "...",
    "destination_wallet": "..."
  }
}
Pesan pengguna: "${rawText}"
`;

    const openaiKey = process.env.OPENAI_COMPAT_API_KEY;
    let jsonText;
    let usedProvider = 'google';
    let usedModel = 'gemini-1.5-flash';

    if (openaiKey) {
      // panggil openai compatible api jika key tersedia
      const baseUrl = process.env.OPENAI_COMPAT_BASE_URL || 'https://api.openai.com/v1';
      const model = process.env.OPENAI_COMPAT_MODEL || 'gpt-4o-mini';
      usedProvider = 'openai_compat';
      usedModel = model;

      // pastikan url memiliki /chat/completions tanpa duplikasi
      let targetUrl = baseUrl.replace(/\/$/, '');
      if (!targetUrl.endsWith('/chat/completions')) {
        targetUrl = `${targetUrl}/chat/completions`;
      }

      // siapkan header permintaan
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      };

      // tambahkan header rahasia kustom jika ada
      const secretHeaderName = process.env.OPENAI_COMPAT_SECRET_HEADER_NAME;
      const secretHeaderValue = process.env.OPENAI_COMPAT_SECRET_HEADER_VALUE;
      if (secretHeaderName && secretHeaderValue) {
        headers[secretHeaderName] = secretHeaderValue;
      }

      // log pemanggilan api
      console.log(`[AI Chat] Memanggil OpenAI kompatibel API (${targetUrl}) menggunakan model: ${model}`);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          stream: false
        })
      });

      const contentType = response.headers.get('content-type') || '';
      console.log(`[AI Chat] OpenAI Status HTTP: ${response.status} | Content-Type: ${contentType}`);
      if (!response.ok) {
        let errMsg = `HTTP Error ${response.status}`;
        if (contentType.includes('application/json')) {
          const aiData = await response.json();
          // log error
          console.error(`[AI Chat] Error dari OpenAI kompatibel API:`, aiData.error);
          errMsg = aiData.error?.message || errMsg;
        } else {
          const rawText = await response.text();
          // log error
          console.error(`[AI Chat] Error non-JSON dari OpenAI kompatibel API: ${rawText}`);
          errMsg = `${errMsg}: ${rawText.substring(0, 200)}`;
        }
        throw new Error(errMsg);
      }

      if (!contentType.includes('application/json')) {
        const rawText = await response.text();
        // Fallback: provider mungkin mengabaikan stream:false dan mengirim SSE.
        // Gabungkan potongan delta.content dari stream lalu parse sebagai respon biasa.
        if (rawText.includes('data:')) {
          let streamed = '';
          for (const line of rawText.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const chunk = JSON.parse(payload);
              streamed += chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.message?.content || '';
            } catch {
              // lewati baris yang tidak bisa diparse
            }
          }
          if (streamed) {
            console.log(`[AI Chat] Respon SSE berhasil digabungkan (${streamed.length} chars): ${streamed.substring(0, 150)}`);
            jsonText = streamed;
          } else {
            console.error('[AI Chat] SSE diterima tapi tidak ada konten yang bisa digabungkan');
            throw new Error(`Respon bukan JSON dari OpenAI kompatibel API: ${rawText.substring(0, 200)}`);
          }
        } else {
          throw new Error(`Respon bukan JSON dari OpenAI kompatibel API: ${rawText.substring(0, 200)}`);
        }
      } else {
        const aiData = await response.json();
        // log sukses
        console.log(`[AI Chat] Berhasil menerima respon dari OpenAI kompatibel API`);
        jsonText = aiData.choices?.[0]?.message?.content;
      }
    } else {
      // panggil google gemini api sebagai fallback
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY atau OPENAI_COMPAT_API_KEY tidak ditemukan di environment backend/.env');
      }

      // log pemanggilan api
      console.log(`[AI Chat] Memanggil Google Gemini API menggunakan model: gemini-1.5-flash`);

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        let errMsg = `HTTP Error ${response.status}`;
        if (contentType.includes('application/json')) {
          const aiData = await response.json();
          // log error
          console.error(`[AI Chat] Error dari Google Gemini API:`, aiData.error);
          errMsg = aiData.error?.message || errMsg;
        } else {
          const rawText = await response.text();
          // log error
          console.error(`[AI Chat] Error non-JSON dari Google Gemini API: ${rawText}`);
          errMsg = `${errMsg}: ${rawText.substring(0, 200)}`;
        }
        throw new Error(errMsg);
      }

      if (!contentType.includes('application/json')) {
        const rawText = await response.text();
        throw new Error(`Respon bukan JSON dari Google Gemini API: ${rawText.substring(0, 200)}`);
      }

      const aiData = await response.json();
      // log sukses
      console.log(`[AI Chat] Berhasil menerima respon dari Google Gemini API`);
      jsonText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!jsonText) {
      throw new Error('Respon LLM kosong.');
    }

    console.log(`[AI Chat] Raw LLM response (${jsonText.length} chars): ${jsonText.substring(0, 300)}`);

    // Bersihkan markdown code fence (```json ... ```) yang kadang dibungkus model
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
      console.log('[AI Chat] Markdown code fence dibersihkan dari respon LLM');
    }

    const result = JSON.parse(jsonText);
    let components = [];

    if (result.intent === 'transaction' && result.transaction?.amount) {
      const tx = result.transaction;

      // cocokkan id database
      const matchedCategory = categories.find(c => 
        c.category_name.toLowerCase().includes(tx.category_name?.toLowerCase() || '')
      );
      const matchedSourceWallet = wallets.find(w => 
        w.name.toLowerCase().includes(tx.source_wallet?.toLowerCase() || '')
      );
      const matchedDestWallet = wallets.find(w => 
        w.name.toLowerCase().includes(tx.destination_wallet?.toLowerCase() || '')
      );

      // buat transactiondraft
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // 24 jam

      const draft = await prisma.transactionDraft.create({
        data: {
          user_id: userId,
          conversation_id: conversationId,
          ai_provider: usedProvider,
          ai_model: usedModel,
          draft_type: tx.type === 'Transfer' ? 'multi' : 'single',
          status: 'pending',
          expires_at: expiresAt,
          ai_confidence: 0.95,
          original_text: rawText,
          payload: {
            amount: tx.amount,
            type: tx.type,
            subject: tx.subject,
            category_id: matchedCategory?.id || null,
            category_name: matchedCategory?.category_name || tx.category_name,
            source_wallet_id: matchedSourceWallet?.id || null,
            source_wallet_name: matchedSourceWallet?.name || tx.source_wallet,
            destination_wallet_id: matchedDestWallet?.id || null,
            destination_wallet_name: matchedDestWallet?.name || tx.destination_wallet
          }
        }
      });

      // Prepare UI component card
      components = [
        {
          type: 'text',
          text: `Halo Bos! Saya telah menyiapkan draf pencatatan transaksi untuk Anda:`
        },
        {
          type: 'transaction_card',
          is_draft: true,
          needs_wallet: tx.type === 'Transfer' ? (!matchedSourceWallet || !matchedDestWallet) : (!matchedSourceWallet && !matchedDestWallet),
          transaction: {
            id: draft.id,
            is_draft: true,
            amount: tx.amount,
            amount_formatted: `Rp ${Number(tx.amount).toLocaleString('id-ID')}`,
            subject: tx.subject,
            category: matchedCategory?.category_name || tx.category_name || 'Lain-lain',
            source_wallet: matchedSourceWallet?.name || null,
            dest_wallet: matchedDestWallet?.name || null,
            type_key: tx.type.toLowerCase(),
            is_cleared: false,
            is_cancelled: false
          }
        }
      ];
    } else {
      // General assistant reply
      components = [
        {
          type: 'text',
          text: result.reply || 'Halo! Saya adalah ZackBrawn. Ada yang bisa saya bantu dengan keuangan Anda?'
        }
      ];
    }

    // Save final bot message
    await prisma.chatMessage.update({
      where: { id: botMessageId },
      data: {
        content: components,
        status: 'completed',
        raw_text: result.reply || ''
      }
    });

  } catch (err) {
    console.error('processChatMessage error:', err.message);
    await prisma.chatMessage.update({
      where: { id: botMessageId },
      data: {
        status: 'failed',
        error_message: `Gagal memproses pesan: ${err.message}`
      }
    });
  }
}

module.exports = {
  processChatMessage
};
