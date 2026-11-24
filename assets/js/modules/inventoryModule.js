import { sortByItemName, readFileAsBase64 } from '../utils/mediaHelper.js';
import { downloadDisposalBeritaAcaraDoc } from '../utils/docGenerator.js';

export function createInventoryModule() {
  return {
    invCache: { Alat: [], Bahan: [], 'Bahan Kimia': [] },
    invList: [],
    invSearch: '',
    invSortOrder: 'asc',
    invFilterLab: '',
    invFilterCategory: '',
    invPage: 1,
    invPerPage: 15,

    masterItemsList: [],
    masterSearch: '',
    masterFilterCat: '',
    masterModal: { open: false, editMode: false },
    masterForm: {
      master_id: '',
      item_name: '',
      category: 'Alat',
      brand: '',
      spec: '',
      unit: 'Unit',
      min_stock: 1,
      is_hazardous: false,
      photo_base64: '',
      photo_mime: '',
      photo_name: '',
      photo_preview: '',
    },

    damagedEquipmentList: [],
    damageSearch: '',
    damageFilterStatus: '',
    damageModal: { open: false },
    damageForm: { inv_id: '', item_name: '', qty: 1, damage_level: 'Rusak Ringan', notes: '' },

    get filteredInvList() {
      const q = (this.invSearch || '').toLowerCase();
      const filtered = (this.invList || []).filter((item) => {
        if (this.invFilterLab && item.lab_id !== this.invFilterLab) return false;
        if (q) {
          const hay = `${item.item_name} ${item.brand} ${item.spec} ${item.lab_name}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      return sortByItemName(filtered, this.invSortOrder);
    },

    get paginatedInvList() {
      const start = (this.invPage - 1) * this.invPerPage;
      return this.filteredInvList.slice(start, start + this.invPerPage);
    },

    async loadInventory(category, force = false) {
      if (!force && this.invCache[category]?.length) {
        this.invList = this.invCache[category];
        return;
      }
      try {
        const res = await this.runGas('apiGetInventory', this.session.token, category, this.session.active_lab_id || '');
        const items = res.items || res || [];
        this.invCache[category] = items;
        this.invList = items;
        this.invPage = 1;
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async loadMasterData() {
      try {
        const res = await this.runGas('apiGetMasterItems', this.session.token);
        this.masterItemsList = res.items || res || [];
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    openMasterModal(item = null) {
      if (item) {
        this.masterModal = { open: true, editMode: true };
        this.masterForm = { ...item, photo_base64: '', photo_mime: '', photo_name: '', photo_preview: item.photo_url || '' };
      } else {
        this.masterModal = { open: true, editMode: false };
        this.masterForm = {
          master_id: '', item_name: '', category: 'Alat', brand: '', spec: '',
          unit: 'Unit', min_stock: 1, is_hazardous: false,
          photo_base64: '', photo_mime: '', photo_name: '', photo_preview: '',
        };
      }
    },

    async handleMasterPhotoUpload(event) {
      const file = event.target?.files?.[0];
      if (!file) return;
      const data = await readFileAsBase64(file);
      this.masterForm.photo_base64 = data.base64;
      this.masterForm.photo_mime = data.mimeType;
      this.masterForm.photo_name = data.fileName;
      this.masterForm.photo_preview = data.previewUrl;
    },

    async submitMasterItem() {
      try {
        const res = await this.runGas('apiSaveMasterItem', this.session.token, this.masterForm);
        this.masterModal.open = false;
        this.showToast(res.message || 'Master data berhasil disimpan.');
        await this.loadMasterData();
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async loadDamagedEquipment() {
      try {
        const res = await this.runGas('apiGetDamagedEquipment', this.session.token, this.session.active_lab_id || '');
        this.damagedEquipmentList = res.items || res || [];
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    downloadBeritaAcara(record) {
      downloadDisposalBeritaAcaraDoc(record, this.session);
    },
  };
}
