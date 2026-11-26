import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/module.esm.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

import { CONFIG, createConfigMixin } from './config/constants.js';
import { createGasApiMixin } from './services/gasApi.js';
import { createDateHelperMixin } from './utils/dateHelper.js';
import { createMediaHelperMixin } from './utils/mediaHelper.js';
import { createDocGeneratorMixin } from './utils/docGenerator.js';

import { createAuthModule } from './modules/authModule.js';
import { createPublicModule } from './modules/publicModule.js';
import { createInventoryModule } from './modules/inventoryModule.js';
import { createWarehouseModule } from './modules/warehouseModule.js';
import { createTransactionModule } from './modules/transactionModule.js';
import { createAdminModule } from './modules/adminModule.js';

window.Alpine = Alpine;

Alpine.data('silarasApp', () => ({
  // Core Config, Transport & Pure Utilities
  ...createConfigMixin(),
  ...createGasApiMixin(),
  ...createDateHelperMixin(),
  ...createMediaHelperMixin(),
  ...createDocGeneratorMixin(),

  // Domain Modules
  ...createAuthModule(),
  ...createPublicModule(),
  ...createInventoryModule(),
  ...createWarehouseModule(),
  ...createTransactionModule(),
  ...createAdminModule(),

  // Global Shell State & Lifecycle
  loading: false,

  syncing: false,

  loadingText: '',

  toast: { show: false, message: '', type: 'success' },

  activeMenu: 'dashboard',

  mobileSidebarOpen: false,

  // Modal dialog pengganti confirm() dan prompt()
        confirmModal: { open: false, title: '', message: '', resolve: null },

  promptModal: { open: false, title: '', message: '', placeholder: '', options: [], value: '', resolve: null },

  bundleLoaded: false,

  dashData: { stats: {}, bookings: [], loans: [], usages: [], notifications: [] },

  imagePreviewModal: { open: false, url: '', title: '' },

  cameraModal: { open: false, target: '', stream: null },

  // DIALOG KUSTOM NON-BLOCKING (PENGGANTI confirm & prompt)
        askConfirm(message, title = 'Konfirmasi Tindakan') {
          return new Promise((resolve) => {
            this.confirmModal = { open: true, title, message, resolve };
          });
        },

  resolveConfirmModal(result) {
          const fn = this.confirmModal.resolve;
          this.confirmModal.open = false;
          this.confirmModal.resolve = null;
          if (typeof fn === 'function') fn(result);
        },

  askPrompt(message, defaultValue = '', title = 'Input Keterangan', placeholder = '', options = []) {
          return new Promise((resolve) => {
            this.promptModal = {
              open: true,
              title,
              message,
              placeholder,
              options: Array.isArray(options) ? options : [],
              value: defaultValue,
              resolve
            };
          });
        },

  resolvePromptModal(val) {
          const fn = this.promptModal.resolve;
          this.promptModal.open = false;
          this.promptModal.resolve = null;
          if (typeof fn === 'function') fn(val);
        },

  realtimeChannel: null,

  realtimeDebounceTimer: null,

  realtimeSyncInFlight: false,

  initApp() {
          this.initPermissionMatrix(null);
          this.loadLocalInputHistories();
          this.startSessionWatcher();
          const saved = localStorage.getItem('SILARAS_SESSION');
          if (saved) {
            try {
              this.session = JSON.parse(saved);
              this.syncActiveLabContext();
              const cleanUnitProdi = String(this.session.unit_prodi || '').trim();
              this.profileForm.full_name = this.session.full_name || '';
              this.bookingForm.pic_name = this.session.full_name || '';
              this.bookingForm.unit_prodi = cleanUnitProdi === '-' ? '' : cleanUnitProdi;
              this.loadWorkspaceBundle(false);
            } catch (e) {
              localStorage.removeItem('SILARAS_SESSION');
              this.session = null;
            }
          }
          this.loadPublicHome();
          this.startRealtimeSync();
        },

  startRealtimeSync() {
          // 1. Langganan perubahan database instan via Supabase Realtime WebSocket
          if (!this.realtimeChannel && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
            try {
              const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
                auth: { persistSession: false, autoRefreshToken: false }
              });
              const watchTables = [
                'inv_equipment',
                'inv_materials',
                'inv_chemicals',
                'equipment_loans',
                'equipment_loan_items',
                'room_bookings',
                'material_usages',
                'material_usage_items',
                'notifications'
              ];
              let ch = sb.channel('silaras-live-sync');
              for (const tbl of watchTables) {
                ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: tbl }, () => {
                  this.scheduleSilentSync(80);
                });
              }
              this.realtimeChannel = ch.subscribe();
            } catch (e) {
              console.warn('Supabase Realtime fallback ke polling:', e);
            }
          }

          // 2. Sinkronisasi otomatis saat jendela/tab browser kembali aktif
          window.addEventListener('focus', () => {
            if (this.session?.token) this.scheduleSilentSync(50);
          });
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.session?.token) {
              this.scheduleSilentSync(50);
            }
          });

          // 3. Fallback sinkronisasi berkala setiap 5 detik jika WebSocket diblokir jaringan
          setInterval(() => {
            if (document.visibilityState === 'visible' && this.session?.token && !this.loading) {
              this.syncActiveViewSilently();
            }
          }, 5000);
        },

  scheduleSilentSync(delayMs = 80) {
          if (this.realtimeDebounceTimer) clearTimeout(this.realtimeDebounceTimer);
          this.realtimeDebounceTimer = setTimeout(() => {
            this.syncActiveViewSilently();
          }, delayMs);
        },

  async syncActiveViewSilently() {
          if (!this.session?.token || this.realtimeSyncInFlight) return;
          this.realtimeSyncInFlight = true;
          try {
            const menu = this.activeMenu;
            // Jika berada di menu antrean transaksi/dashboard, tarik apiGetDashboardData dulu agar tabel langsung ter-update seketika
            if (['pinjam_alat', 'guna_bahan', 'booking_ruang', 'verifikasi', 'dashboard'].includes(menu)) {
              const dashRes = await this.runGasSilent('apiGetDashboardData', this.session.token);
              if (dashRes) this.dashData = this.normalizeDashboardPayload(dashRes);
            }
            await this.loadWorkspaceBundle(true);
            if (['inv_alat', 'inv_bahan', 'inv_kimia'].includes(menu)) {
              const cat = this.currentInvCategory();
              if (this.invLocationFilter === 'ALL') {
                this.inventoryList = this.invCache[cat] || [];
              } else {
                const res = await this.runGasSilent('apiGetInventory', this.session.token, cat, this.invLocationFilter);
                this.inventoryList = res.items || [];
              }
            } else if (menu === 'alat_rusak') {
              await this.loadDamagedEquipment(true);
            }
          } catch (_) {
            // Abaikan error jaringan sementara pada sinkronisasi latar belakang
          } finally {
            this.realtimeSyncInFlight = false;
          }
        },

  showToast(message, type = 'success') {
          this.toast = { show: true, message, type };
          setTimeout(() => { this.toast.show = false; }, 4200);
        },

  openImagePreview(url, title = 'Pratinjau Foto') {
          if (!url) return;
          this.imagePreviewModal = {
            open: true,
            url: this.normalizeDriveImgUrl(url),
            title: title
          };
        },

  closeImagePreview() {
          this.imagePreviewModal.open = false;
        },

  menuTitle() {
          const titles = {
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
            settings: 'Pengguna, Lab & Hak Akses'
          };
          return titles[this.activeMenu] || 'SILARAS';
        },

  navigate(menu) {
          this.activeMenu = menu;
          this.mobileSidebarOpen = false;
          if (menu === 'dashboard') {
            this.loadDashboard(!this.bundleLoaded);
          } else if (['inv_alat','inv_bahan','inv_kimia'].includes(menu)) {
            const cat = this.currentInvCategory();
            if (this.bundleLoaded && (this.invCache[cat] || []).length > 0 && this.invLocationFilter === 'ALL') {
              this.inventoryList = this.invCache[cat];
            } else {
              this.loadInventory();
            }
          } else if (menu === 'alat_rusak') {
            this.loadDamagedEquipment(false);
          } else if (menu === 'gudang') {
            if (!this.bundleLoaded || (this.warehouseData.stock || []).length === 0) {
              this.loadWarehouse();
            }
          } else if (menu === 'master_data') {
            if (!this.bundleLoaded || (this.masterItemsList || []).length === 0) {
              this.loadMasterItems();
            }
          } else if (menu === 'audit') {
            this.loadAuditLogs();
          } else if (menu === 'settings') {
            if (!this.bundleLoaded || (this.adminData.users || []).length === 0) {
              this.loadAdminSettings();
            }
          }
        },

  normalizeDashboardPayload(res) {
          if (!res || typeof res !== 'object') return this.dashData;
          const src = res.dashboard && typeof res.dashboard === 'object' ? res.dashboard : res;
          return {
            stats: src.stats || this.dashData.stats || {},
            bookings: Array.isArray(src.bookings) ? src.bookings : (Array.isArray(src.room_bookings) ? src.room_bookings : []),
            loans: Array.isArray(src.loans) ? src.loans : (Array.isArray(src.equipment_loans) ? src.equipment_loans : []),
            usages: Array.isArray(src.usages) ? src.usages : (Array.isArray(src.material_usages) ? src.material_usages : []),
            notifications: Array.isArray(src.notifications) ? src.notifications : []
          };
        },

  async loadWorkspaceBundle(silent = false) {
          if (!this.session?.token) return;
          try {
            const runner = silent ? this.runGasSilent.bind(this) : this.runGas.bind(this);
            const res = await runner('apiGetWorkspaceBundle', this.session.token);
            if (!res) return;

            this.dashData = this.normalizeDashboardPayload(res);
            this.invCache = {
              Alat: res.inv_alat || res.inv_equipment || [],
              Bahan: res.inv_bahan || res.inv_materials || [],
              'Bahan Kimia': res.inv_kimia || res.inv_chemicals || []
            };
            if (['inv_alat','inv_bahan','inv_kimia'].includes(this.activeMenu)) {
              this.inventoryList = this.invCache[this.currentInvCategory()] || [];
            }

            if (res.warehouse) {
              this.warehouseData = res.warehouse;
            }
            if (Array.isArray(res.master_items)) {
              this.masterItemsList = res.master_items;
            }
            if (res.role_permissions) {
              this.initPermissionMatrix(res.role_permissions);
            }
            if (res.admin) {
              this.adminData = res.admin;
              this.initPermissionMatrix(res.admin.role_permissions || res.role_permissions || null);
            }
            if (res.session && Array.isArray(res.session.accessible_labs) && this.session) {
              this.session.accessible_labs = res.session.accessible_labs;
            }
            this.bundleLoaded = true;
          } catch (e) {
            if (!silent) {
              await this.loadDashboard(false);
            }
          }
        },

  async refreshActiveView() {
          const menu = this.activeMenu;
          if (menu === 'dashboard') {
            await this.loadWorkspaceBundle(true);
            this.showToast('Data workspace berhasil disegarkan');
          } else if (['inv_alat','inv_bahan','inv_kimia'].includes(menu)) {
            await this.loadInventory();
            this.showToast('Inventaris disegarkan');
          } else if (menu === 'alat_rusak') {
            await this.loadDamagedEquipment(true);
            this.showToast('Data alat rusak & perbaikan disegarkan');
          } else if (menu === 'gudang') {
            await this.loadWarehouse();
            this.showToast('Data gudang disegarkan');
          } else if (['pinjam_alat','guna_bahan','booking_ruang','verifikasi'].includes(menu)) {
            await this.loadDashboard(true);
            this.showToast('Antrean permohonan disegarkan');
          } else if (menu === 'master_data') {
            await this.loadMasterItems();
            this.showToast('Master data disegarkan');
          } else if (menu === 'audit') {
            await this.loadAuditLogs();
            this.showToast('Audit trail disegarkan');
          } else if (menu === 'settings') {
            await this.loadAdminSettings();
            this.showToast('Data pengguna & pengaturan disegarkan');
          }
        },

  navigateFromDashCard(cardType) {
          if (cardType === 'labs') {
            if (this.canView('settings')) {
              this.navigate('settings');
              this.adminTab = 'labs';
            } else {
              this.navigate('inv_alat');
            }
          } else if (cardType === 'pending_verification' || cardType === 'pending_approval') {
            if (this.canView('verifikasi')) {
              this.navigate('verifikasi');
            } else {
              this.navigate('pinjam_alat');
            }
          } else if (cardType === 'active_loans') {
            this.navigate('pinjam_alat');
          }
        },

  unreadNotificationsCount() {
          return (this.dashData?.notifications || []).filter((n) => !n.is_read).length;
        },

  async openNotification(notif) {
          if (!notif) return;
          // 1. Tandai sudah dibaca secara instan di UI & sinkronkan ke backend
          if (!notif.is_read) {
            notif.is_read = true;
            if (this.session?.token && notif.notif_id) {
              this.runGasSilent('apiMarkNotificationRead', this.session.token, notif.notif_id).catch(() => {});
            }
          }

          // 2. Tentukan menu tujuan berdasarkan tipe atau kode transaksi di judul/pesan
          const t = String(notif.type || '').toLowerCase();
          const text = `${notif.title || ''} ${notif.message || ''}`.toUpperCase();
          const isNewRequest = text.includes('BARU') || text.includes('PERMINTAAN PENGEMBALIAN');

          if (t === 'loan' || text.includes('LN-')) {
            this.navigate(isNewRequest && this.canView('verifikasi') ? 'verifikasi' : 'pinjam_alat');
          } else if (t === 'booking' || text.includes('BK-') || text.includes('RUANGAN')) {
            this.navigate(isNewRequest && this.canView('verifikasi') ? 'verifikasi' : 'booking_ruang');
          } else if (t === 'usage' || text.includes('US-') || text.includes('BAHAN')) {
            this.navigate(isNewRequest && this.canView('verifikasi') ? 'verifikasi' : 'guna_bahan');
          } else if (t === 'warehouse' || text.includes('GUDANG')) {
            this.navigate(this.canView('gudang') ? 'gudang' : 'dashboard');
          } else if (t === 'inventory' || text.includes('STOK') || text.includes('ALAT')) {
            this.navigate('inv_alat');
          }
        },

  async markAllNotificationsRead() {
          const list = this.dashData?.notifications || [];
          const hasUnread = list.some((n) => !n.is_read);
          if (!hasUnread) return;
          list.forEach((n) => { n.is_read = true; });
          if (this.session?.token) {
            try {
              await this.runGasSilent('apiMarkAllNotificationsRead', this.session.token);
              this.showToast('Semua notifikasi ditandai sudah dibaca');
            } catch (_) {}
          }
        },

  dashboardChartSeries() {
          const days = [];
          const now = new Date();
          const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const iso = d.toISOString().slice(0, 10);
            days.push({
              date: iso,
              label: `${dayNames[d.getDay()]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`,
              loans: 0,
              bookings: 0,
              usages: 0,
              total: 0
            });
          }
          const map = Object.fromEntries(days.map((x) => [x.date, x]));
          (this.dashData?.loans || []).forEach((l) => {
            const key = String(l.created_at || l.loan_date || '').slice(0, 10);
            if (map[key]) { map[key].loans++; map[key].total++; }
          });
          (this.dashData?.bookings || []).forEach((b) => {
            const key = String(b.created_at || b.booking_date || '').slice(0, 10);
            if (map[key]) { map[key].bookings++; map[key].total++; }
          });
          (this.dashData?.usages || []).forEach((u) => {
            const key = String(u.created_at || u.usage_date || '').slice(0, 10);
            if (map[key]) { map[key].usages++; map[key].total++; }
          });
          const maxVal = Math.max(1, ...days.map((d) => d.total));
          return days.map((d) => ({
            ...d,
            loanPct: Math.round((d.loans / maxVal) * 100),
            bookingPct: Math.round((d.bookings / maxVal) * 100),
            usagePct: Math.round((d.usages / maxVal) * 100)
          }));
        },

  equipmentHealthSummary() {
          const list = Array.isArray(this.invCache?.Alat) ? this.invCache.Alat : [];
          let available = 0;
          let borrowed = 0;
          let damaged = 0;
          list.forEach((eq) => {
            available += Number(eq.qty_available || 0);
            borrowed += Number(eq.qty_borrowed || 0);
            damaged += Number(eq.qty_damaged || 0);
          });
          const total = Math.max(1, available + borrowed + damaged);
          const realTotal = available + borrowed + damaged;
          return {
            available,
            borrowed,
            damaged,
            total: realTotal,
            availPct: Math.round((available / total) * 100),
            borrowPct: Math.round((borrowed / total) * 100),
            damagePct: Math.round((damaged / total) * 100)
          };
        },

  upcomingRoomSchedules() {
          const today = new Date().toISOString().slice(0, 10);
          return (this.dashData?.bookings || [])
            .filter((b) => !['rejected', 'cancelled'].includes(String(b.status || '').toLowerCase()))
            .filter((b) => String(b.booking_date || '').slice(0, 10) >= today)
            .sort((a, b) => {
              const da = `${a.booking_date || ''} ${a.start_time || ''}`;
              const db = `${b.booking_date || ''} ${b.start_time || ''}`;
              return da.localeCompare(db);
            })
            .slice(0, 6);
        },

  activeBorrowedLoans() {
          const today = new Date().toISOString().slice(0, 10);
          return (this.dashData?.loans || [])
            .filter((l) => ['borrowed', 'return_requested'].includes(String(l.status || '').toLowerCase()))
            .map((l) => {
              const retDate = String(l.return_date || '').slice(0, 10);
              const itemsText = Array.isArray(l.items) && l.items.length > 0
                ? l.items.map((it) => `${it.item_name} (${it.qty_requested})`).join(', ')
                : '-';
              return {
                ...l,
                itemsSummary: itemsText,
                isOverdue: Boolean(retDate && retDate < today)
              };
            })
            .slice(0, 6);
        },

  lowStockAlerts() {
          const alerts = [];
          const today = new Date();
          const in30Days = new Date();
          in30Days.setDate(today.getDate() + 30);
          const limitIso = in30Days.toISOString().slice(0, 10);

          const scan = (arr, category, menuKey) => {
            (arr || []).forEach((item) => {
              const avail = Number(item.qty_available || 0);
              const min = Number(item.min_stock || 0);
              const exp = String(item.expired_date || '').slice(0, 10);
              if (min > 0 && avail <= min) {
                alerts.push({
                  id: item.mat_inv_id || item.chem_inv_id || item.eq_inv_id,
                  name: item.item_name,
                  lab: item.location_name || item.location_id || '-',
                  badge: `Sisa ${avail} ${item.unit || ''}`.trim(),
                  reason: `Stok menipis (min: ${min})`,
                  severity: avail === 0 ? 'red' : 'amber',
                  menu: menuKey,
                  category
                });
              } else if (exp && exp <= limitIso) {
                alerts.push({
                  id: item.chem_inv_id || item.mat_inv_id,
                  name: item.item_name,
                  lab: item.location_name || item.location_id || '-',
                  badge: `Exp: ${exp}`,
                  reason: 'Mendekati / lewat kedaluwarsa',
                  severity: 'red',
                  menu: menuKey,
                  category
                });
              }
            });
          };

          scan(this.invCache?.Bahan, 'Bahan', 'inv_bahan');
          scan(this.invCache?.['Bahan Kimia'], 'Bahan Kimia', 'inv_kimia');
          return alerts.slice(0, 6);
        },

  async loadDashboard(silent = false) {
          try {
            const runner = silent ? this.runGasSilent.bind(this) : this.runGas.bind(this);
            const res = await runner('apiGetDashboardData', this.session.token);
            this.dashData = this.normalizeDashboardPayload(res);
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        }
}));

Alpine.start();
