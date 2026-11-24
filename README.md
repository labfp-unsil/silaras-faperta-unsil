# SILARAS — Sistem Informasi Laboratorium Siliwangi
**Fakultas Pertanian - Universitas Siliwangi**

Arsitektur frontend modular berbasis **Alpine.js (ES Modules)** dan **Tailwind CSS** yang terhubung dengan backend **Google Apps Script (GAS)** dan siap di-deploy ke **GitHub Pages**.

## Struktur Direktori
```text
silaras-faperta-unsil/
├── index.html                      # Entry point HTML lengkap (Publik & Workspace Internal)
├── README.md                       # Dokumentasi proyek
├── .gitignore                      # Konfigurasi Git
└── assets/
    ├── css/
    │   └── app.css                 # Custom styling & tema SILARAS
    └── js/
        ├── app.js                  # Entry point ES Module & registrasi Alpine.data('silarasApp')
        ├── config/
        │   └── constants.js        # Konfigurasi URL GAS, daftar role, & definisi modul hak akses
        ├── services/
        │   └── gasApi.js           # Layer komunikasi API (google.script.run & fetch POST fallback)
        ├── utils/
        │   ├── dateHelper.js       # Helper tanggal, format Indonesia, & kalender publik
        │   ├── mediaHelper.js      # Helper Google Drive, kamera, upload foto & pengurutan
        │   └── docGenerator.js     # Generator Berita Acara Penghapusan (.doc) & Ekspor Excel
        └── modules/
            ├── authModule.js       # Autentikasi, registrasi, OTP reset password, & session watcher
            ├── publicModule.js     # Halaman publik: katalog, paginasi, filter jadwal & kalender
            ├── inventoryModule.js  # Inventaris alat, bahan, kimia, master data & alat rusak
            ├── warehouseModule.js  # Gudang pusat: stok, barang masuk/keluar, & signature pad
            ├── transactionModule.js# Peminjaman alat, penggunaan bahan, booking ruang, & verifikasi
            └── adminModule.js      # Manajemen user, master lab, matriks hak akses, & audit trail
```

## Konfigurasi Backend Google Apps Script
Ubah `GAS_WEB_APP_URL` pada `assets/js/config/constants.js` sesuai URL Web App deployment (`/exec`) Google Apps Script Anda.

## Deploy ke GitHub Pages
1. Unggah seluruh isi folder `silaras-faperta-unsil/` ke repository GitHub Anda.
2. Buka **Settings → Pages**, pilih branch `main` dan folder `/ (root)`, lalu klik **Save**.
