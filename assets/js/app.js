import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/module.esm.js';

import { CONFIG, MENU_TITLES } from './config/constants.js';
import { callGasTransport } from './services/gasApi.js';
import { normalizeYMD, formatDateYMD, formatDateIndonesian } from './utils/dateHelper.js';
import { normalizeDriveImgUrl, sortByItemName } from './utils/mediaHelper.js';

import { createAuthModule } from './modules/authModule.js';
import { createPublicModule } from './modules/publicModule.js';
import { createInventoryModule } from './modules/inventoryModule.js';
import { createWarehouseModule } from './modules/warehouseModule.js';
import { createTransactionModule } from './modules/transactionModule.js';
import { createAdminModule } from './modules/adminModule.js';

window.Alpine = Alpine;

Alpine.data('silarasApp', () => ({
  // Global UI State
  loading: false,
  syncing: false,
  loadingText: '',
  toast: { show: false, message: '', type: 'success' },
  activeMenu: 'dashboard',
  mobileSidebarOpen: false,
  bundleLoaded: false,
  dashData: { stats: {}, bookings: [], loans: [], usages: [], notifications: [] },

  // Custom Non-Blocking Dialogs
  confirmModal: { open: false, title: '', message: '', resolve: null },
  promptModal: { open: false, title: '', message: '', placeholder: '', options: [], value: '', resolve: null },
  imagePreviewModal: { open: false, url: '', title: '' },
  cameraModal: { open: false, target: '', stream: null },

  // Spread seluruh domain modules
  ...createAuthModule(),
  ...createPublicModule(),
  ...createInventoryModule(),
  ...createWarehouseModule(),
  ...createTransactionModule(),
  ...createAdminModule(),

  // Expose pure helpers ke template HTML
  normalizeYMD,
  formatDateYMD,
  formatDateIndonesian,
  normalizeDriveImgUrl,
  sortByItemName,

  // Transport Wrappers
  runGas(fnName, ...args) {
    return callGasTransport(this, fnName, args, true);
  },

  runGasSilent(fnName, ...args) {
    return callGasTransport(this, fnName, args, false);
  },

  showToast(message, type = 'success') {
    this.toast = { show: true, message, type };
    setTimeout(() => { this.toast.show = false; }, 4200);
  },

  openImagePreview(url, title = 'Pratinjau Gambar') {
    if (!url) return;
    this.imagePreviewModal = {
      open: true,
      url: normalizeDriveImgUrl(url),
      title,
    };
  },

  menuTitle() {
    return MENU_TITLES[this.activeMenu] || 'SILARAS';
  },

  async navigate(menuKey) {
    this.activeMenu = menuKey;
    this.mobileSidebarOpen = false;
    await this.refreshCurrentData();
  },

  async refreshCurrentData() {
    if (!this.session) return;
    switch (this.activeMenu) {
      case 'dashboard':
        await this.loadWorkspaceBundle(true);
        break;
      case 'master_data':
        await this.loadMasterData();
        break;
      case 'inv_alat':
        await this.loadInventory('Alat', true);
        break;
      case 'alat_rusak':
        await this.loadDamagedEquipment();
        break;
      case 'inv_bahan':
        await this.loadInventory('Bahan', true);
        break;
      case 'inv_kimia':
        await this.loadInventory('Bahan Kimia', true);
        break;
      case 'gudang':
        await this.loadWarehouse();
        break;
      case 'pinjam_alat':
        await this.loadLoans();
        break;
      case 'guna_bahan':
        await this.loadUsages();
        break;
      case 'booking_ruang':
        await this.loadBookings();
        break;
      case 'verifikasi':
        await this.loadVerifications();
        break;
      case 'audit':
        await this.loadAuditLogs();
        break;
      case 'settings':
        await this.loadSettingsData();
        break;
    }
  },

  async loadWorkspaceBundle(force = false) {
    if (!this.session?.token) return;
    if (this.bundleLoaded && !force) return;
    try {
      const res = await this.runGasSilent('apiGetWorkspaceBundle', this.session.token, this.session.active_lab_id || '');
      if (res.dashData) this.dashData = res.dashData;
      if (res.permission_matrix) this.initPermissionMatrix(res.permission_matrix);
      if (res.labs) this.labsList = res.labs;
      this.bundleLoaded = true;
    } catch (e) {
      console.warn('Workspace bundle load warning:', e.message);
    }
  },

  initApp() {
    this.initPermissionMatrix(null);
    this.startSessionWatcher();

    const saved = localStorage.getItem(CONFIG.SESSION_STORAGE_KEY);
    if (saved) {
      try {
        this.session = JSON.parse(saved);
        this.syncActiveLabContext();
        this.profileForm.full_name = this.session.full_name || '';
        this.bookingForm.pic_name = this.session.full_name || '';
        this.bookingForm.unit_prodi = this.session.unit_prodi || '';
        this.loadWorkspaceBundle(false);
      } catch (e) {
        localStorage.removeItem(CONFIG.SESSION_STORAGE_KEY);
        this.session = null;
      }
    }
    this.loadPublicHome();
  },
}));

Alpine.start();
