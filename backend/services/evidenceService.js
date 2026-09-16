const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/db');

// Main method to process evidence using multimodal Gemini API
async function processEvidence(evidenceId, userId) {
  // Update status to processing
  await prisma.evidence.update({
    where: { id: evidenceId },
    data: {
      status: 'PROCESSING',
      processing_started_at: new Date()
    }
  });

  await prisma.evidenceProcessingLog.create({
    data: {
      evidence_id: evidenceId,
      stage: 'PROCESSING',
      status_before: 'UPLOADED',
      status_after: 'PROCESSING',
      message: 'Memulai pipeline pemrosesan OCR & AI.'
    }
  });

  try {
    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId }
    });

    if (!evidence) throw new Error('Evidence tidak ditemukan');

    // Read file from disk
    const absolutePath = path.resolve(evidence.path);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File fisik tidak ditemukan pada path: ${evidence.path}`);
    }

    const imageBuffer = fs.readFileSync(absolutePath);
    const base64Image = imageBuffer.toString('base64');

    const prompt = `
Kamu adalah sistem OCR dan analisis transaksi finansial pribadi.
Tugas kamu adalah:
1. Lakukan OCR penuh pada gambar struk/bukti ini dan ekstrak seluruh teks yang ada (simpan di ocr_text).
2. Tentukan tipe dokumen (document_type, pilih salah satu dari: TransferReceipt, ShoppingReceipt, QrisReceipt, Invoice, atau Unknown).
3. Ekstrak data transaksi secara terstruktur:
   - amount: nominal total transaksi (angka desimal/integer, jangan gunakan desimal jika tidak ada sen).
   - date: tanggal transaksi (format YYYY-MM-DD HH:mm:ss). Jika waktu tidak ada, gunakan pukul 12:00:00. Jika tanggal tidak terdeteksi, gunakan tanggal hari ini.
   - merchant: nama toko, vendor, merchant, atau pihak lawan transaksi.
   - category_name: nama kategori pengeluaran yang cocok (misal: Makanan, Transportasi, Hiburan, Belanja, Tagihan, Lain-lain).
   - wallet_name: tebakan jenis/sumber pembayaran (misal: Cash, E-Wallet, Bank Transfer).
4. Berikan output HANYA dalam format JSON valid berikut:
{
  "ocr_text": "...",
  "document_type": "...",
  "amount": 125000,
  "date": "2026-08-04 12:30:00",
  "merchant": "...",
  "category_name": "...",
  "wallet_name": "..."
}
`;

    const openaiKey = process.env.OPENAI_COMPAT_API_KEY;
    let jsonText;

    if (openaiKey) {
      // panggil openai compatible api jika key tersedia
      const baseUrl = process.env.OPENAI_COMPAT_BASE_URL || 'https://api.openai.com/v1';
      const model = process.env.OPENAI_COMPAT_MODEL || 'gpt-4o-mini';

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
      console.log(`[AI OCR] Memanggil OpenAI kompatibel API (${targetUrl}) menggunakan model: ${model}`);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${evidence.mime_type};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        let errMsg = `HTTP Error ${response.status}`;
        if (contentType.includes('application/json')) {
          const aiData = await response.json();
          // log error
          console.error(`[AI OCR] Error dari OpenAI kompatibel API:`, aiData.error);
          errMsg = aiData.error?.message || errMsg;
        } else {
          const rawText = await response.text();
          // log error
          console.error(`[AI OCR] Error non-JSON dari OpenAI kompatibel API: ${rawText}`);
          errMsg = `${errMsg}: ${rawText.substring(0, 200)}`;
        }
        throw new Error(errMsg);
      }

      if (!contentType.includes('application/json')) {
        const rawText = await response.text();
        throw new Error(`Respon bukan JSON dari OpenAI kompatibel API: ${rawText.substring(0, 200)}`);
      }

      const aiData = await response.json();
      // log sukses
      console.log(`[AI OCR] Berhasil menerima respon dari OpenAI kompatibel API`);
      jsonText = aiData.choices?.[0]?.message?.content;
    } else {
      // panggil google gemini api sebagai fallback
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY atau OPENAI_COMPAT_API_KEY tidak ditemukan di environment backend/.env');
      }

      // log pemanggilan api
      console.log(`[AI OCR] Memanggil Google Gemini API menggunakan model: gemini-1.5-flash`);

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: evidence.mime_type,
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        let errMsg = `HTTP Error ${response.status}`;
        if (contentType.includes('application/json')) {
          const aiData = await response.json();
          // log error
          console.error(`[AI OCR] Error dari Google Gemini API:`, aiData.error);
          errMsg = aiData.error?.message || errMsg;
        } else {
          const rawText = await response.text();
          // log error
          console.error(`[AI OCR] Error non-JSON dari Google Gemini API: ${rawText}`);
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
      console.log(`[AI OCR] Berhasil menerima respon dari Google Gemini API`);
      jsonText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!jsonText) {
      throw new Error('Respon LLM kosong atau tidak terformat.');
    }

    const parsedJson = JSON.parse(jsonText);

    // Save parsed result and set to READY
    const finishedAt = new Date();
    await prisma.evidence.update({
      where: { id: evidenceId },
      data: {
        status: 'READY',
        processing_finished_at: finishedAt,
        ocr_text: parsedJson.ocr_text || '',
        document_type: parsedJson.document_type || 'Unknown',
        parsed_data: parsedJson,
        resolved_data: parsedJson,
        last_processed_at: finishedAt
      }
    });

    await prisma.evidenceProcessingLog.create({
      data: {
        evidence_id: evidenceId,
        stage: 'READY',
        status_before: 'PROCESSING',
        status_after: 'READY',
        message: 'Pemrosesan OCR & AI sukses.'
      }
    });

  } catch (err) {
    console.error('processEvidence error:', err.message);
    const finishedAt = new Date();
    await prisma.evidence.update({
      where: { id: evidenceId },
      data: {
        status: 'FAILED',
        processing_finished_at: finishedAt,
        error_message: err.message
      }
    });

    await prisma.evidenceProcessingLog.create({
      data: {
        evidence_id: evidenceId,
        stage: 'FAILED',
        status_before: 'PROCESSING',
        status_after: 'FAILED',
        message: `Pemrosesan gagal: ${err.message}`
      }
    });
  }
}

// Convert draft evidence to final TransactionLog
async function commitEvidence(evidenceId, userId, overrides = {}) {
  const evidence = await prisma.evidence.findFirst({
    where: { id: evidenceId, user_id: userId }
  });

  if (!evidence) {
    throw new Error('Bukti transaksi tidak ditemukan.');
  }

  if (evidence.status !== 'READY') {
    throw new Error('Bukti transaksi belum siap untuk dicommit.');
  }

  const resolved = evidence.resolved_data || {};
  
  // Merge resolved data fields with manual overrides
  const amount = parseFloat(overrides.amount !== undefined ? overrides.amount : resolved.amount || 0);
  const date = overrides.date ? new Date(overrides.date) : (resolved.date ? new Date(resolved.date) : new Date());
  const typeId = parseInt(overrides.type_id || 2); // default Expense
  const categoryId = overrides.category_id ? parseInt(overrides.category_id) : null;
  const sourceWalletId = overrides.source_wallet_id ? parseInt(overrides.source_wallet_id) : null;
  const destWalletId = overrides.destination_wallet_id ? parseInt(overrides.destination_wallet_id) : null;
  const subject = overrides.subject || resolved.merchant || 'Transaksi Bukti';
  const notes = overrides.notes || resolved.ocr_text || '';

  if (amount <= 0) {
    throw new Error('Nominal transaksi harus lebih besar dari 0');
  }

  if (!sourceWalletId && !destWalletId) {
    throw new Error('Silakan tentukan dompet transaksi.');
  }

  const refNumber = `TX-EV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const transaction = await prisma.$transaction(async (tx) => {
    // Modify wallet balance if needed
    // 2.Expense: subtract source
    // 1.Income: add destination
    // 3.Transfer: subtract source, add destination
    let balanceBefore = 0;
    let balanceAfter = 0;

    if (typeId === 2 && sourceWalletId) { // Expense
      const wallet = await tx.wallet.findUnique({ where: { id: sourceWalletId } });
      balanceBefore = parseFloat(wallet.balance);
      balanceAfter = balanceBefore - amount;
      await tx.wallet.update({
        where: { id: sourceWalletId },
        data: { balance: balanceAfter }
      });
    } else if (typeId === 1 && destWalletId) { // Income
      const wallet = await tx.wallet.findUnique({ where: { id: destWalletId } });
      balanceBefore = parseFloat(wallet.balance);
      balanceAfter = balanceBefore + amount;
      await tx.wallet.update({
        where: { id: destWalletId },
        data: { balance: balanceAfter }
      });
    }

    // Insert TransactionLog
    const txLog = await tx.transactionLog.create({
      data: {
        reference_number: refNumber,
        user_id: userId,
        date,
        type_id: typeId,
        category_id: categoryId,
        source_wallet_id: sourceWalletId || destWalletId, // fallback if single
        destination_wallet_id: destWalletId || sourceWalletId,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        subject,
        notes,
        is_cleared: true
      }
    });

    // Update Evidence status to COMPLETED
    await tx.evidence.update({
      where: { id: evidenceId },
      data: {
        status: 'COMPLETED',
        transaction_id: txLog.id,
        completed_at: new Date()
      }
    });

    await tx.evidenceProcessingLog.create({
      data: {
        evidence_id: evidenceId,
        stage: 'COMPLETED',
        status_before: 'READY',
        status_after: 'COMPLETED',
        message: `Berhasil di-commit ke transaksi ID ${txLog.id}.`
      }
    });

    return txLog;
  });

  return transaction;
}

module.exports = {
  processEvidence,
  commitEvidence
};

