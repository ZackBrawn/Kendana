# Impor Bendaharaku

Impor tersedia pada **Pengaturan → Logika Keuangan → Pengelolaan Data** dan hanya ditampilkan untuk email admin yang dikonfigurasi. Endpoint menerima satu file JSON hingga 10 MB di memori; file tidak disimpan di server.

## Prasyarat

1. Pastikan ekspor Bendaharaku lengkap dan mencakup `transaction_types`, semua wallet/kategori yang dirujuk transaksi, serta seluruh histori. File ekspor lama yang hanya berisi `user`, `wallets`, `categories`, dan `transactions` akan ditolak karena tipe transaksi tidak dapat dipetakan dengan aman.
2. Pastikan user dengan email yang sama sudah dapat login ke Kendana. Impor hanya memetakan data ke akun yang sedang login; impor tidak membuat user baru dan tidak mengubah password/profile Kendana.
3. Buat backup database sumber dan Kendana, lalu uji pada staging yang merupakan salinan schema Kendana saat ini.
4. Terapkan migration dan buat ulang Prisma Client:

   ```powershell
   cd backend
   npx prisma migrate deploy
   npx prisma generate
   ```

`migrate deploy` ini ditujukan untuk staging yang sudah memiliki tabel Kendana saat ini. Jangan jalankan migration terhadap database produksi sebelum backup dan validasi staging selesai.

## Aktifkan UI admin sementara

Atur variabel berikut hanya pada backend staging:

```env
KENDANA_DATA_IMPORT_ENABLED=true
KENDANA_DATA_IMPORT_ADMIN_EMAIL=alamat-email-admin-yang-sudah-ada-di-Kendana
```

Email tersebut harus sama dengan email user di ekspor Bendaharaku. Restart backend, login ke Kendana dengan akun tersebut, lalu pilih file JSON di menu Pengaturan. UI meminta konfirmasi sebelum mengirim file.

Impor bersifat append-only: tidak menghapus data Kendana yang sudah ada, tidak menghitung ulang saldo, dan menjalankan semua insert dalam satu transaksi database. Jika ada reference number yang bentrok, ID/foreign key yang hilang, tipe yang tidak diketahui, atau format yang tidak valid, seluruh impor dibatalkan.

Sesudah berhasil, browser mengunduh file peta ID sumber → ID Kendana. Simpan file tersebut di lokasi backup privat. Setelah uji staging selesai, nonaktifkan UI dengan menghapus `KENDANA_DATA_IMPORT_ENABLED` dan restart backend. Jangan aktifkan endpoint ini di produksi sebelum keputusan cutover dan validasi akhir.

Ekspor yang memuat `deleted_at` tetap disimpan, tetapi record soft-deleted/nonaktif tidak ditampilkan dalam daftar utama aplikasi.
