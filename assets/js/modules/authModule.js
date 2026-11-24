import { CONFIG } from '../config/constants.js';

export function createAuthModule() {
  return {
    session: null,
    sessionCheckTimer: null,
    isHandlingSessionExpiry: false,
    authModal: { open: false, mode: 'login' },
    loginForm: { email: '', password: '' },
    forgotForm: { step: 1, email: '', otp: '', new_password: '', confirm_password: '' },
    regForm: { full_name: '', nim_nip: '', unit_prodi: '', phone: '', email: '', password: '' },
    profileForm: { full_name: '', nim_nip: '', unit_prodi: '', phone: '' },

    openAuthModal(mode) {
      this.switchAuthMode(mode);
      this.authModal.open = true;
    },

    switchAuthMode(mode) {
      this.authModal.mode = mode;
      if (mode === 'register') {
        this.regForm = { full_name: '', nim_nip: '', unit_prodi: '', phone: '', email: '', password: '' };
      } else if (mode === 'forgot') {
        this.forgotForm = {
          step: 1,
          email: this.loginForm.email || '',
          otp: '',
          new_password: '',
          confirm_password: '',
        };
      }
    },

    syncActiveLabContext() {
      if (!this.session) return;
      if (!this.session.active_lab_id && Array.isArray(this.session.labs) && this.session.labs.length > 0) {
        this.session.active_lab_id = this.session.labs[0].lab_id;
        this.session.active_lab_name = this.session.labs[0].lab_name;
      }
    },

    async submitLogin() {
      try {
        const res = await this.runGas('apiLogin', this.loginForm.email, this.loginForm.password);
        const sessionObj = res?.session ? res.session : res;
        if (!sessionObj?.token) throw new Error('Respons sesi login tidak valid dari server.');

        this.session = sessionObj;
        this.syncActiveLabContext();
        localStorage.setItem(CONFIG.SESSION_STORAGE_KEY, JSON.stringify(this.session));
        this.authModal.open = false;
        this.profileForm.full_name = this.session.full_name || '';
        if (this.bookingForm) {
          this.bookingForm.pic_name = this.session.full_name || '';
          this.bookingForm.unit_prodi = this.session.unit_prodi || '';
        }
        this.showToast('Selamat datang di SILARAS, ' + this.session.full_name);
        await this.loadWorkspaceBundle(false);
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async submitRegister() {
      try {
        const res = await this.runGas('apiRegisterSelf', this.regForm);
        this.showToast(res.message || 'Registrasi berhasil, silakan login.');
        this.switchAuthMode('login');
        this.loginForm.email = this.regForm.email;
        this.loginForm.password = '';
      } catch (e) {
        this.showToast(e.message, 'error');
      }
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

    startSessionWatcher() {
      if (this.sessionCheckTimer) clearInterval(this.sessionCheckTimer);
      this.sessionCheckTimer = setInterval(() => {
        if (!this.session?.token) return;
        this.runGasSilent('apiValidateSession', this.session.token).catch(() => {});
      }, CONFIG.SESSION_CHECK_INTERVAL_MS);
    },

    handleSessionExpired(msg) {
      if (this.isHandlingSessionExpiry) return;
      this.isHandlingSessionExpiry = true;
      this.session = null;
      this.activeMenu = 'dashboard';
      this.bundleLoaded = false;
      localStorage.removeItem(CONFIG.SESSION_STORAGE_KEY);
      this.showToast(msg || 'Sesi Anda telah berakhir. Silakan masuk kembali.', 'warn');
      this.loadPublicHome();
      setTimeout(() => { this.isHandlingSessionExpiry = false; }, 1500);
    },

    async switchContext(role, labId) {
      if (!this.session?.token) return;
      try {
        const res = await this.runGas('apiSwitchRoleLab', this.session.token, role, labId);
        this.session = res.session || res;
        this.syncActiveLabContext();
        localStorage.setItem(CONFIG.SESSION_STORAGE_KEY, JSON.stringify(this.session));
        this.bundleLoaded = false;
        await this.loadWorkspaceBundle(true);
        this.showToast('Konteks aktif diperbarui.');
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async submitCompleteProfile() {
      try {
        const res = await this.runGas('apiCompleteProfile', this.session.token, this.profileForm);
        this.session = { ...this.session, ...this.profileForm, is_profile_complete: true };
        localStorage.setItem(CONFIG.SESSION_STORAGE_KEY, JSON.stringify(this.session));
        this.showToast(res.message || 'Profil berhasil dilengkapi.');
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    logout() {
      if (this.session?.token) {
        this.runGas('apiLogout', this.session.token).catch(() => {});
      }
      this.session = null;
      this.activeMenu = 'dashboard';
      this.bundleLoaded = false;
      this.invCache = { Alat: [], Bahan: [], 'Bahan Kimia': [] };
      this.damagedEquipmentList = [];
      localStorage.removeItem(CONFIG.SESSION_STORAGE_KEY);
      this.loadPublicHome();
    },
  };
}
