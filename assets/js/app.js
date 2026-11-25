import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/module.esm.js';

import { createConfigMixin } from './config/constants.js';
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

  initApp() {
          this.initPermissionMatrix(null);
          this.loadLocalInputHistories();
          this.startSessionWatcher();
          const saved = localStorage.getItem('SILARAS_SESSION');
          if (saved) {
            try {
              this.session = JSON.parse(saved);
              this.syncActiveLabContext();
              this.profileForm.full_name = this.session.full_name || '';
              this.bookingForm.pic_name = this.session.full_name || '';
              this.bookingForm.unit_prodi = this.session.unit_prodi || '';
              this.loadWorkspaceBundle(false);
            } catch (e) {
              localStorage.removeItem('SILARAS_SESSION');
              this.session = null;
            }
          }
          this.loadPublicHome();
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
