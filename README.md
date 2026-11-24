# SILARAS — Sistem Informasi Laboratorium Siliwangi
**Fakultas Pertanian - Universitas Siliwangi**

Arsitektur frontend modular berbasis **Alpine.js (ES Modules)** dan **Tailwind CSS** yang terhubung dengan backend **Google Apps Script (GAS)**.

## Struktur Direktori
```text
silaras-faperta-unsil/
├── index.html                      # Entry point HTML utama
├── README.md                       # Dokumentasi proyek
├── .gitignore                      # Konfigurasi Git
└── assets/
    ├── css/
    │   └── app.css                 # Custom styling & tema SILARAS
    └── js/
        ├── app.js                  # Entry point ES Module & registrasi Alpine.data
        ├── config/
        │   └── constants.js        # Konfigurasi URL GAS, role, dan matriks modul
        ├── services/
        │   └── gasApi.js           # Layer komunikasi API (google.script.run & fetch fallback)
        ├── utils/
        │   ├── dateHelper.js       # Helper tanggal & kalender
        │   ├── mediaHelper.js      # Helper Google Drive, kamera & pengurutan
        │   └── docGenerator.js     # Generator Berita Acara (.doc)
        └── modules/
            ├── authModule.js       # Autentikasi, OTP reset password, & session watcher
            ├── publicModule.js     # Halaman publik: katalog, paginasi, jadwal & kalender
            ├── inventoryModule.js  # Inventaris alat, bahan, kimia, & alat rusak
            ├── warehouseModule.js  # Gudang pusat: stok, barang masuk/keluar, & tanda tangan
            ├── transactionModule.js# Peminjaman alat, penggunaan bahan, booking ruang, verifikasi
            └── adminModule.js      # Manajemen user, master lab, matriks hak akses, audit trail
```

## Cara Menjalankan Lokal
Karena menggunakan `<script type="module">`, jalankan melalui local HTTP server (bukan `file://`):
```bash
npx serve .
```
Atau gunakan ekstensi **Live Server** di VS Code.

## Konfigurasi Backend Google Apps Script
Ubah `GAS_WEB_APP_URL` pada `assets/js/config/constants.js` sesuai dengan URL Web App deployment Google Apps Script Anda.
