import { CONFIG } from '../config/constants.js';

export function createAuthModule() {
  return {
    session: null,
    sessionCheckTimer: null,
    isHandlingSessionExpiry: false,
    authModal: { open: false, mode: 'login' },
    showLoginPassword: false,
    loginForm: { email: '', password: '' },
    forgotForm: { step: 1, email: '', otp: '', new_password: '', confirm_password: '' },
    regForm: { full_name: '', nim_nip: '', unit_prodi: '', phone: '', email: '', password: '' },
    profileForm: { full_name: '', nim_nip: '', unit_prodi: '', phone: '' },

    isSessionExpiredError(msg) {
      const text = String(msg || '').toLowerCase();
      return (
        text.includes('session_expired') ||
        text.includes('sesi anda telah berakhir') ||
        text.includes('belum login') ||
        text.includes('akun tidak aktif')
      );
    },

    handleSessionExpired(customMessage) {
      if (this.isHandlingSessionExpiry) return;
      if (!this.session && !localStorage.getItem('SILARAS_SESSION')) return;

      this.isHandlingSessionExpiry = true;
      try {
        this.closeCameraModal();
        this.session = null;
        this.activeMenu = 'dashboard';
        this.bundleLoaded = false;
        this.mobileSidebarOpen = false;
        this.invCache = { Alat: [], Bahan: [], 'Bahan Kimia': [] };
        this.damagedEquipmentList = [];
        this.dashData = { stats: {}, bookings: [], loans: [], usages: [], notifications: [] };
        this.warehouseData = { stock: [], transactions: [], labs: [], takers: [], courses: [] };
        this.adminData = { users: [], labs: [], role_permissions: null };
        this.masterItemsList = [];
        this.auditLogsList = [];

        this.invDetailModal.open = false;
        this.invFormModal.open = false;
        this.whDetailModal.open = false;
        this.whEditModal.open = false;
        this.masterFormModal.open = false;
        this.catalogPickerModal.open = false;
        this.userModal.open = false;
        this.labModal.open = false;
        this.damagedDetailModal.open = false;

        localStorage.removeItem('SILARAS_SESSION');

        this.loadPublicHome();
        this.openAuthModal('login');
        this.showToast(
          customMessage || 'Sesi Anda telah berakhir. Silakan login kembali.',
          'error'
        );
      } finally {
        setTimeout(() => { this.isHandlingSessionExpiry = false; }, 1500);
      }
    },

    startSessionWatcher() {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.session?.token) {
          this.runGasSilent('apiCheckSession', this.session.token);
        }
      });

      if (this.sessionCheckTimer) clearInterval(this.sessionCheckTimer);
      this.sessionCheckTimer = setInterval(() => {
        if (this.session?.token) {
          this.runGasSilent('apiCheckSession', this.session.token);
        }
      }, 5 * 60 * 1000);
    },

    // SINKRONISASI DUA ARAH KONTEKS LOKASI AKTIF (active_lab_id)
    syncActiveLabContext() {
      if (!this.session) return;
      if (!this.session.active_lab_id) {
        this.session.active_lab_id = 'ALL';
      }
      this.invLocationFilter = this.session.active_lab_id;
      this.damagedLocationFilter = this.session.active_lab_id;

      if (this.session.active_lab_id !== 'ALL' && this.session.active_lab_id !== 'GUDANG') {
        if (!this.loanForm.lab_id) this.loanForm.lab_id = this.session.active_lab_id;
        if (!this.usageForm.lab_id) this.usageForm.lab_id = this.session.active_lab_id;
        if (!this.bookingForm.lab_id) this.bookingForm.lab_id = this.session.active_lab_id;
      }
    },

    openAuthModal(mode = 'login') {
      this.showLoginPassword = false;
      this.authModal.open = true;
      this.switchAuthMode(mode);
    },

    switchAuthMode(mode) {
      this.showLoginPassword = false;
      this.authModal.mode = mode;
      if (mode === 'register') {
        this.regForm = { full_name: '', nim_nip: '', unit_prodi: '', phone: '', email: '', password: '' };
      } else if (mode === 'forgot') {
        this.forgotForm = {
          step: 1,
          email: this.loginForm.email || '',
          otp: '',
          new_password: '',
          confirm_password: ''
        };
      }
    },

    triggerGoogleLogin() {
      if (!window.google?.accounts?.id) {
        this.showToast('Layanan Google Sign-In belum termuat. Silakan muat ulang halaman.', 'error');
        return;
      }
      window.google.accounts.id.initialize({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const res = await this.runGas('apiGoogleLogin', response.credential);
            const sessionObj = (res && res.session) ? res.session : res;
            if (!sessionObj || !sessionObj.token) {
              throw new Error(res?.message || 'Gagal masuk menggunakan akun Google.');
            }
            this.session = sessionObj;
            this.syncActiveLabContext();
            localStorage.setItem('SILARAS_SESSION', JSON.stringify(this.session));
            this.authModal.open = false;
            this.profileForm.full_name = this.session.full_name;
            this.bookingForm.pic_name = this.session.full_name;
            this.bookingForm.unit_prodi = this.session.unit_prodi;
            this.showToast('Selamat datang di SILARAS, ' + this.session.full_name);
            await this.loadWorkspaceBundle(false);
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        }
      });
      window.google.accounts.id.prompt();
    },

    async submitRequestResetOtp() {
      try {
        const res = await this.runGas('apiRequestPasswordResetOtp', this.forgotForm.email);
        this.forgotForm.step = 2;
        this.showToast(res.message || 'Kode OTP telah dikirim ke email Anda');
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async submitConfirmResetPassword() {
      if (this.forgotForm.new_password !== this.forgotForm.confirm_password) {
        this.showToast('Konfirmasi kata sandi baru tidak cocok', 'error');
        return;
      }
      try {
        const res = await this.runGas(
          'apiResetPasswordWithOtp',
          this.forgotForm.email,
          this.forgotForm.otp,
          this.forgotForm.new_password
        );
        this.loginForm.email = this.forgotForm.email;
        this.loginForm.password = '';
        this.switchAuthMode('login');
        this.showToast(res.message || 'Kata sandi berhasil diperbarui. Silakan login.');
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async submitLogin() {
      try {
        const res = await this.runGas('apiLogin', this.loginForm.email, this.loginForm.password);
        const sessionObj = (res && res.session) ? res.session : res;
        if (!sessionObj || !sessionObj.token) {
          throw new Error('Respons sesi login tidak valid dari server.');
        }
        this.session = sessionObj;
        this.syncActiveLabContext();
        localStorage.setItem('SILARAS_SESSION', JSON.stringify(this.session));
        this.authModal.open = false;
        this.profileForm.full_name = this.session.full_name;
        this.bookingForm.pic_name = this.session.full_name;
        this.bookingForm.unit_prodi = this.session.unit_prodi;
        this.showToast('Selamat datang di SILARAS, ' + this.session.full_name);
        await this.loadWorkspaceBundle(false);
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async submitRegister() {
      try {
        const res = await this.runGas('apiRegisterSelf', this.regForm);
        this.showToast(res.message);
        this.switchAuthMode('login');
        this.loginForm.email = this.regForm.email;
        this.loginForm.password = '';
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async submitCompleteProfile() {
      try {
        const res = await this.runGas('apiCompleteProfile', this.session.token, this.profileForm);
        this.session.needs_profile_completion = false;
        this.session.full_name = res.user.full_name;
        this.session.unit_prodi = res.user.unit_prodi;
        localStorage.setItem('SILARAS_SESSION', JSON.stringify(this.session));
        this.showToast('Profil dasar berhasil disimpan');
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async switchContext() {
      try {
        const res = await this.runGas(
          'apiSwitchContext',
          this.session.token,
          this.session.active_lab_id,
          this.session.active_role
        );
        this.session = res.session;
        this.syncActiveLabContext();
        localStorage.setItem('SILARAS_SESSION', JSON.stringify(this.session));

        if (!this.canView(this.activeMenu)) {
          this.activeMenu = 'dashboard';
        }

        if (this.activeMenu === 'dashboard') {
          await this.loadDashboard(true);
        } else if (['inv_alat', 'inv_bahan', 'inv_kimia'].includes(this.activeMenu)) {
          await this.loadInventory();
        } else if (this.activeMenu === 'alat_rusak') {
          await this.loadDamagedEquipment(true);
        } else if (this.activeMenu === 'gudang') {
          await this.loadWarehouse();
        } else if (['pinjam_alat', 'guna_bahan', 'booking_ruang', 'verifikasi'].includes(this.activeMenu)) {
          await this.loadDashboard(true);
        } else if (this.activeMenu === 'master_data') {
          await this.loadMasterItems();
        } else if (this.activeMenu === 'audit') {
          await this.loadAuditLogs();
        } else if (this.activeMenu === 'settings') {
          await this.loadAdminSettings();
        }

        this.showToast('Konteks peran & lokasi aktif diperbarui');
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    logout() {
      if (this.session?.token) this.runGas('apiLogout', this.session.token).catch(() => {});
      this.session = null;
      this.activeMenu = 'dashboard';
      this.bundleLoaded = false;
      this.invCache = { Alat: [], Bahan: [], 'Bahan Kimia': [] };
      this.damagedEquipmentList = [];
      localStorage.removeItem('SILARAS_SESSION');
      this.loadPublicHome();
    }
  };
}