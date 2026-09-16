# Kendana

Kendana adalah aplikasi personal finance management (PFM) yang membantu pengguna mengelola dompet, anggaran, utang-piutang, pencarian transaksi, dan asisten AI untuk pencatatan keuangan. Project ini berfokus pada pengalaman yang modern, cepat, dan mudah dipahami untuk penggunaan sehari-hari.

## Ringkasan project

- Frontend: Vue 3 + Vite
- Backend: Node.js + Express
- ORM: Prisma
- Database: PostgreSQL
- AI: OpenAI-compatible API dan fallback Gemini
- Styling: Tailwind CSS

## Fitur utama

- Kelola wallet, kategori, dan transaksi
- Pantau anggaran bulanan
- Track utang dan piutang
- Search transaksi global
- OCR struk dan evidence capture
- Chat AI untuk pencatatan transaksi natural language
- Push notification dan dashboard finansial

## Struktur repo

```text
kendana/
├── backend/        # API Express + Prisma
├── frontend/       # Aplikasi Vue 3
├── AGENTS.md       # Aturan kerja AI agent
├── PRODUCT.md      # Product brief
├── documentation.md # Dokumentasi project
├── README.md       # Dokumentasi utama
└── .vscode/        # Konfigurasi editor
```

## Menjalankan project

### 1) Instal backend dependencies

```bash
cd backend
npm install
```

### 2) Siapkan environment

Pastikan file `backend/.env` sudah dibuat dan berisi nilai database serta AI key.

```bash
DATABASE_URL="postgresql://zack:password@localhost:5432/kendana?schema=public"
JWT_SECRET="your-secret"
OPENAI_COMPAT_API_KEY="your-key"
OPENAI_COMPAT_BASE_URL="https://api.openai.com/v1"
OPENAI_COMPAT_MODEL="gpt-4o-mini"
VAPID_PUBLIC_KEY="generated-public-key"
VAPID_PRIVATE_KEY="generated-private-key"
```

### 3) Sync database

```bash
cd backend
npx prisma generate
npx prisma db push
```

### 4) Jalankan seed (opsional)

```bash
cd backend
npm run seed
```

### 5) Jalankan frontend

```bash
cd frontend
npm install
npm run dev
```

### Testing push notification

Buat VAPID key sekali dan simpan nilainya di `backend/.env`:

```bash
cd backend
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

Push notification membutuhkan service worker production. Jalankan backend dan preview frontend:

```bash
node backend/app.js
cd frontend && VITE_API_BASE_URL="https://backend-url.ngrok-free.app/api" npm run build && npm run preview -- --host 0.0.0.0
```

Untuk menguji dari mobile, expose port backend (3000) dan preview frontend (4173) melalui HTTPS ngrok. Ganti `backend-url.ngrok-free.app` dengan URL backend ngrok sebelum build. Buka URL frontend ngrok, masuk ke `Other > Notifikasi > Preferensi Notifikasi`, aktifkan Web Push, lalu tekan `Kirim Notifikasi Test`. Jangan commit file `.env` atau VAPID private key.

## Catatan penting

- Gunakan workflow AI yang sesuai dengan task: bug fix cek Obsidian vault, UI/feature mengikuti skill Impeccable.
- Jangan mengubah konfigurasi penting tanpa persetujuan eksplisit.
- Baca `documentation.md` dan `AGENTS.md` untuk panduan yang lebih lengkap.


# Terminal 1
cd backend
node -e "console.log(require('web-push').generateVAPIDKeys())"