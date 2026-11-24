export const CONFIG = {
  GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbw74bgmIMai5nhrcXpg0C6sskBd0hWtxfBjJcFO7FejhvabDl4GBDa7RRbpW_ht2z9Y/exec',
  SESSION_STORAGE_KEY: 'SILARAS_SESSION',
  MAKER_HISTORY_KEY: 'SILARAS_MAKER_HISTORY',
  UNIT_HISTORY_KEY: 'SILARAS_UNIT_HISTORY',
  SESSION_CHECK_INTERVAL_MS: 5 * 60 * 1000,
};

export const AVAILABLE_ROLES = [
  'Super Admin',
  'Admin',
  'Petugas Gudang',
  'Laboran',
  'Kepala Laboratorium',
  'User',
];

export const PERMISSION_MODULES = [
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
  { key: 'settings', label: 'Pengaturan Pengguna, Lab & Hak Akses' },
];

export const MENU_TITLES = {
  dashboard: 'Dashboard Utama',
  master_data: 'Master Data Barang',
  inv_alat: 'Inventaris Peralatan',
  alat_rusak: 'Alat Perbaikan & Rusak',
  inv_bahan: 'Inventaris Bahan',
  inv_kimia: 'Inventaris Bahan Kimia',
  gudang: 'Gudang & Stok Pusat',
  pinjam_alat: 'Peminjaman Peralatan',
  guna_bahan: 'Penggunaan Bahan & Bahan Kimia',
  booking_ruang: 'Penggunaan Ruangan Laboratorium',
  verifikasi: 'Verifikasi & Persetujuan',
  laporan: 'Laporan & Ekspor',
  audit: 'Audit Trail Sistem',
  settings: 'Pengguna, Lab & Hak Akses',
};

export const DEFAULT_MATRIX_FALLBACK = {
  'Super Admin': { master_data: true, inv_alat: true, alat_rusak: true, inv_bahan: true, inv_kimia: true, gudang: true, pinjam_alat: true, guna_bahan: true, booking_ruang: true, verifikasi: true, laporan: true, audit: true, settings: true },
  'Admin': { master_data: true, inv_alat: true, alat_rusak: true, inv_bahan: true, inv_kimia: true, gudang: true, pinjam_alat: true, guna_bahan: true, booking_ruang: true, verifikasi: true, laporan: true, audit: true, settings: true },
  'Petugas Gudang': { master_data: true, inv_alat: false, alat_rusak: false, inv_bahan: false, inv_kimia: false, gudang: true, pinjam_alat: false, guna_bahan: false, booking_ruang: false, verifikasi: false, laporan: true, audit: false, settings: false },
  'Laboran': { master_data: true, inv_alat: true, alat_rusak: true, inv_bahan: true, inv_kimia: true, gudang: false, pinjam_alat: true, guna_bahan: true, booking_ruang: true, verifikasi: true, laporan: true, audit: false, settings: false },
  'Kepala Laboratorium': { master_data: false, inv_alat: true, alat_rusak: true, inv_bahan: true, inv_kimia: true, gudang: false, pinjam_alat: true, guna_bahan: true, booking_ruang: true, verifikasi: true, laporan: true, audit: false, settings: false },
  'User': { master_data: false, inv_alat: false, alat_rusak: false, inv_bahan: false, inv_kimia: false, gudang: false, pinjam_alat: true, guna_bahan: true, booking_ruang: true, verifikasi: false, laporan: false, audit: false, settings: false },
};
