export const CONFIG = {
  // Isi dengan URL Web App GAS Anda jika HTML dijalankan di luar Google Apps Script (opsional)
        GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbw74bgmIMai5nhrcXpg0C6sskBd0hWtxfBjJcFO7FejhvabDl4GBDa7RRbpW_ht2z9Y/exec',
  SESSION_STORAGE_KEY: 'SILARAS_SESSION',
  MAKER_HISTORY_KEY: 'SILARAS_MAKER_HISTORY',
  UNIT_HISTORY_KEY: 'SILARAS_UNIT_HISTORY',
  SESSION_CHECK_INTERVAL_MS: 5 * 60 * 1000,
};

export function createConfigMixin() {
  return {
    // STATE MATRIKS HAK AKSES GRANULAR
        availableRoles: ['Super Admin', 'Admin', 'Petugas Gudang', 'Laboran', 'Kepala Laboratorium', 'User'],

    permissionModules: [
          { key: 'master_data', label: 'Master Data Barang' },
          { key: 'inv_alat', label: 'Inventaris Peralatan' },
          { key: 'alat_rusak', label: 'Alat Perbaikan & Rusak' },
          { key: 'inv_bahan', label: 'Inventaris Bahan' },
          { key: 'inv_kimia', label: 'Inventaris Bahan Kimia' },
          { key: 'gudang', label: 'Gudang & Stok Pusat' },
          { key: 'pinjam_alat', label: 'Peminjaman Peralatan' },
          { key: 'guna_bahan', label: 'Penggunaan Bahan & Kimia' },
          { key: 'booking_ruang', label: 'Penggunaan Ruangan' },
          { key: 'verifikasi', label: 'Verifikasi & Persetujuan' },
          { key: 'laporan', label: 'Laporan & Ekspor' },
          { key: 'audit', label: 'Audit Trail Sistem' },
          { key: 'settings', label: 'Pengaturan Pengguna, Lab & Hak Akses' }
        ],

    // Isi dengan URL Web App GAS Anda jika HTML dijalankan di luar Google Apps Script (opsional)
        GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbw74bgmIMai5nhrcXpg0C6sskBd0hWtxfBjJcFO7FejhvabDl4GBDa7RRbpW_ht2z9Y/exec'
  };
}
