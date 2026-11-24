import { formatDateYMD } from '../utils/dateHelper.js';

export function createTransactionModule() {
  return {
    loansList: [],
    usagesList: [],
    bookingsList: [],
    pendingVerifications: { loans: [], usages: [], bookings: [] },
    verifTab: 'loans',

    loanForm: {
      lab_id: '',
      inv_id: '',
      qty: 1,
      borrow_date: formatDateYMD(new Date()),
      return_date: formatDateYMD(new Date()),
      purpose: '',
    },

    usageForm: {
      lab_id: '',
      inv_id: '',
      qty: 1,
      usage_date: formatDateYMD(new Date()),
      purpose: '',
    },

    bookingForm: {
      lab_id: '',
      booking_date: formatDateYMD(new Date()),
      start_time: '08:00',
      end_time: '10:00',
      activity_title: '',
      pic_name: '',
      unit_prodi: '',
      participants_count: 1,
      notes: '',
    },

    async loadLoans() {
      try {
        const res = await this.runGas('apiGetLoans', this.session.token);
        this.loansList = res.items || res || [];
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async submitLoan() {
      try {
        const res = await this.runGas('apiCreateLoan', this.session.token, this.loanForm);
        this.showToast(res.message || 'Pengajuan peminjaman alat berhasil dikirim.');
        await this.loadLoans();
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async loadUsages() {
      try {
        const res = await this.runGas('apiGetUsages', this.session.token);
        this.usagesList = res.items || res || [];
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async submitUsage() {
      try {
        const res = await this.runGas('apiCreateUsage', this.session.token, this.usageForm);
        this.showToast(res.message || 'Pengajuan penggunaan bahan berhasil dikirim.');
        await this.loadUsages();
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async loadBookings() {
      try {
        const res = await this.runGas('apiGetBookings', this.session.token);
        this.bookingsList = res.items || res || [];
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async submitBooking() {
      try {
        const res = await this.runGas('apiCreateBooking', this.session.token, this.bookingForm);
        this.showToast(res.message || 'Pengajuan jadwal ruangan berhasil dikirim.');
        await this.loadBookings();
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async loadVerifications() {
      try {
        const res = await this.runGas('apiGetPendingVerifications', this.session.token);
        this.pendingVerifications = {
          loans: res.loans || [],
          usages: res.usages || [],
          bookings: res.bookings || [],
        };
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async verifyTransaction(type, id, decision, notes = '') {
      try {
        const res = await this.runGas('apiVerifyTransaction', this.session.token, type, id, decision, notes);
        this.showToast(res.message || 'Status verifikasi diperbarui.');
        await this.loadVerifications();
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },
  };
}
