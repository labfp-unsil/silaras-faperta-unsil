import { formatDateYMD } from '../utils/dateHelper.js';

export function createWarehouseModule() {
  return {
    warehouseTab: 'stok',
    warehouseStocks: [],
    warehouseMovements: [],
    warehouseSearch: '',
    warehouseCategoryFilter: '',
    warehouseInForm: {
      master_id: '',
      qty: 1,
      batch_no: '',
      expired_date: '',
      supplier: '',
      notes: '',
    },
    warehouseOutModal: { open: false, sigDrawing: false },
    warehouseOutForm: {
      stock_id: '',
      item_name: '',
      qty: 1,
      target_lab_id: '',
      recipient_name: '',
      notes: '',
      signature_data_url: '',
    },

    async loadWarehouse() {
      try {
        const res = await this.runGas('apiGetWarehouseData', this.session.token);
        this.warehouseStocks = res.stocks || [];
        this.warehouseMovements = res.movements || [];
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async submitWarehouseIn() {
      try {
        const res = await this.runGas('apiRecordWarehouseIn', this.session.token, this.warehouseInForm);
        this.showToast(res.message || 'Barang masuk gudang berhasil dicatat.');
        this.warehouseInForm = { master_id: '', qty: 1, batch_no: '', expired_date: '', supplier: '', notes: '' };
        await this.loadWarehouse();
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    openWarehouseOutModal(stock) {
      this.warehouseOutForm = {
        stock_id: stock.stock_id,
        item_name: stock.item_name,
        qty: 1,
        target_lab_id: '',
        recipient_name: '',
        notes: '',
        signature_data_url: '',
      };
      this.warehouseOutModal.open = true;
    },

    clearSignaturePad(canvasId = 'warehouseSigCanvas') {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.warehouseOutForm.signature_data_url = '';
    },

    async submitWarehouseOut() {
      const canvas = document.getElementById('warehouseSigCanvas');
      if (canvas) {
        this.warehouseOutForm.signature_data_url = canvas.toDataURL('image/png');
      }
      try {
        const res = await this.runGas('apiRecordWarehouseOut', this.session.token, this.warehouseOutForm);
        this.warehouseOutModal.open = false;
        this.showToast(res.message || 'Distribusi barang keluar berhasil dicatat.');
        await this.loadWarehouse();
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },
  };
}
