export const CONFIG = {
  // URL Endpoint Supabase Edge Function (silaras-api)
  GAS_WEB_APP_URL: 'https://sjoiibckbqamfahjlgmx.supabase.co/functions/v1/silaras-api',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqb2lpYmNrYnFhbWZhaGpsZ214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU1MDIwNDQsImV4cCI6MjExMTA3ODA0NH0.isVDLWhpVCZ-ZT1wYmBsWMbM8r2vE1ahSPsQXHNPlWI',
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

    // URL Endpoint Supabase Edge Function (silaras-api)
    GAS_WEB_APP_URL: 'https://sjoiibckbqamfahjlgmx.supabase.co/functions/v1/silaras-api',
    SUPABASE_ANON_KEY: 'sb_publishable_g-q9pGPIyEQ3Qpa2kc-0YQ_Q1uaoNxe'
  };
}