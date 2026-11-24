export function createInventoryModule() {
  return {
    invCache: { Alat: [], Bahan: [], 'Bahan Kimia': [] },

    inventoryList: [],

    invLocationFilter: 'ALL',

    invSearch: '',

    invSortOrder: 'asc',

    invViewMode: 'grid',

    invDetailModal: { open: false, item: null },

    invFormModal: { open: false, is_edit: false, data: {} },

    invFormSuggestions: [],

    // State Menu Alat Perbaikan & Rusak
        damagedEquipmentList: [],

    damagedLocationFilter: 'ALL',

    damagedConditionFilter: 'ALL',

    damagedSearch: '',

    damagedViewMode: 'grid',

    damagedDetailModal: { open: false, item: null, nextCondition: 'Baik', processQty: 1, notes: '' },

    // Riwayat isian Maker/Type/Spek & Satuan
        savedMakerHistory: [],

    savedUnitHistory: [],

    masterFormModal: { open: false, is_edit: false, data: {} },

    masterItemsList: [],

    masterCategoryFilter: 'ALL',

    masterSearch: '',

    masterSortOrder: 'asc',

    loadLocalInputHistories() {
          try {
            const makers = JSON.parse(localStorage.getItem('SILARAS_MAKER_HISTORY') || '[]');
            const units = JSON.parse(localStorage.getItem('SILARAS_UNIT_HISTORY') || '[]');
            if (Array.isArray(makers)) this.savedMakerHistory = makers;
            if (Array.isArray(units)) this.savedUnitHistory = units;
          } catch (e) {}
        },

    recordInputHistory(maker, unit) {
          const cleanMaker = String(maker || '').trim();
          const cleanUnit = String(unit || '').trim();
          if (cleanMaker && !this.savedMakerHistory.some(x => x.toLowerCase() === cleanMaker.toLowerCase())) {
            this.savedMakerHistory.push(cleanMaker);
            localStorage.setItem('SILARAS_MAKER_HISTORY', JSON.stringify(this.savedMakerHistory));
          }
          if (cleanUnit && !this.savedUnitHistory.some(x => x.toLowerCase() === cleanUnit.toLowerCase())) {
            this.savedUnitHistory.push(cleanUnit);
            localStorage.setItem('SILARAS_UNIT_HISTORY', JSON.stringify(this.savedUnitHistory));
          }
        },

    getMakerHistoryOptions() {
          const set = new Set(this.savedMakerHistory || []);
          (this.masterItemsList || []).forEach(m => {
            const v = String(m.maker_type_spec || '').trim();
            if (v && v !== '-') set.add(v);
          });
          return Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
        },

    getUnitHistoryOptions() {
          const defaults = ['Unit', 'Buah', 'Set', 'Gram', 'Kg', 'mL', 'Liter', 'Botol', 'Pack', 'Lembar'];
          const set = new Set([...defaults, ...(this.savedUnitHistory || [])]);
          (this.masterItemsList || []).forEach(m => {
            const v = String(m.unit || '').trim();
            if (v && v !== '-') set.add(v);
          });
          return Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
        },

    onLocationFilterChange(newLabId, source) {
          if (!this.session) return;
          this.session.active_lab_id = newLabId || 'ALL';
          this.invLocationFilter = this.session.active_lab_id;
          this.damagedLocationFilter = this.session.active_lab_id;
          localStorage.setItem('SILARAS_SESSION', JSON.stringify(this.session));

          if (source === 'inv') {
            this.loadInventory();
          } else if (source === 'damaged') {
            if ((this.damagedEquipmentList || []).length === 0) {
              this.loadDamagedEquipment(false);
            }
          }
        },

    getActiveLabLabel() {
          if (!this.session || !this.session.active_lab_id || this.session.active_lab_id === 'ALL') {
            return 'Semua Lokasi Akses';
          }
          if (this.session.active_lab_id === 'GUDANG') return 'Gudang Pusat';
          const found = (this.session.accessible_labs || []).find(l => l.lab_id === this.session.active_lab_id);
          return found ? found.lab_name : this.session.active_lab_id;
        },

    currentInvCategory() {
          if (this.activeMenu === 'inv_bahan') return 'Bahan';
          if (this.activeMenu === 'inv_kimia') return 'Bahan Kimia';
          return 'Alat';
        },

    async loadInventory() {
          try {
            const cat = this.currentInvCategory();
            const res = await this.runGas('apiGetInventory', this.session.token, cat, this.invLocationFilter);
            this.inventoryList = res.items || [];
            if (this.invLocationFilter === 'ALL') {
              this.invCache[cat] = this.inventoryList;
            }
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        },

    filteredInventory() {
          const q = this.invSearch.toLowerCase().trim();
          const base = (this.inventoryList || []).filter(r =>
            !q ||
            (r.item_name || '').toLowerCase().includes(q) ||
            (r.item_id || '').toLowerCase().includes(q) ||
            (r.maker_type_spec || '').toLowerCase().includes(q) ||
            (r.condition_status || '').toLowerCase().includes(q)
          );
          return this.sortByItemName(base, this.invSortOrder);
        },

    getConditionBadgeClass(status) {
          const s = String(status || 'Baik').trim();
          if (s === 'Rusak Berat') return 'bg-red-600 text-white';
          if (s === 'Rusak Ringan') return 'bg-amber-500 text-white';
          return 'bg-emerald-600 text-white';
        },

    damagedCount() {
          return (this.damagedEquipmentList || []).filter(r => {
            const cond = String(r.condition_status || '');
            return cond === 'Rusak Ringan' || cond === 'Rusak Berat';
          }).length;
        },

    async loadDamagedEquipment(forceRefresh = false) {
          try {
            if (!forceRefresh && this.bundleLoaded && (this.invCache['Alat'] || []).length > 0) {
              this.damagedEquipmentList = (this.invCache['Alat'] || []).filter(r =>
                r.condition_status === 'Rusak Ringan' || r.condition_status === 'Rusak Berat'
              );
              return;
            }
            const res = await this.runGas('apiGetInventory', this.session.token, 'Alat', 'ALL');
            const allAlat = res.items || [];
            this.invCache['Alat'] = allAlat;
            this.damagedEquipmentList = allAlat.filter(r =>
              r.condition_status === 'Rusak Ringan' || r.condition_status === 'Rusak Berat'
            );
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        },

    filteredDamagedEquipment() {
          const q = this.damagedSearch.toLowerCase().trim();
          const list = (this.damagedEquipmentList || []).filter(r => {
            const cond = String(r.condition_status || '');
            if (cond !== 'Rusak Ringan' && cond !== 'Rusak Berat') return false;
            if (this.damagedLocationFilter && this.damagedLocationFilter !== 'ALL' && r.location_id !== this.damagedLocationFilter) {
              return false;
            }
            if (this.damagedConditionFilter && this.damagedConditionFilter !== 'ALL' && cond !== this.damagedConditionFilter) {
              return false;
            }
            if (q) {
              const hay = `${r.item_name || ''} ${r.item_id || ''} ${r.location_name || ''} ${r.maker_type_spec || ''} ${r.damage_notes || ''}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          });
          return this.sortByItemName(list, 'asc');
        },

    openDamagedDetailModal(row) {
          if (!row) return;
          const maxQty = Number(row.qty_total || row.qty_available || 1);
          this.damagedDetailModal = {
            open: true,
            item: { ...row },
            nextCondition: row.condition_status === 'Rusak Berat' ? 'Rusak Ringan' : 'Baik',
            processQty: maxQty,
            notes: row.damage_notes || ''
          };
        },

    async submitQuickConditionUpdate() {
          const item = this.damagedDetailModal.item;
          if (!item) return;
          const maxQty = Number(item.qty_total || item.qty_available || 0);
          const procQty = Number(this.damagedDetailModal.processQty || 0);

          if (!procQty || procQty < 1 || procQty > maxQty) {
            this.showToast(`Jumlah unit diproses harus antara 1 s.d. ${maxQty}`, 'error');
            return;
          }

          try {
            const payload = {
              ...item,
              condition_status: this.damagedDetailModal.nextCondition,
              original_condition_status: item.condition_status,
              split_qty: procQty,
              max_split_qty: maxQty,
              damage_notes: this.damagedDetailModal.notes
            };
            const res = await this.runGas('apiSaveInventoryItem', this.session.token, 'Alat', payload);
            this.damagedDetailModal.open = false;
            this.showToast(res.message || 'Status kondisi alat berhasil diperbarui');
            await this.loadDamagedEquipment(true);
            if (this.activeMenu === 'inv_alat') {
              await this.loadInventory();
            }
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        },

    openInvDetailModal(row) {
          this.invDetailModal = { open: true, item: row };
        },

    async toggleEquipmentPublic(item, isPublic) {
          if (!item || !item.item_id) return;
          const prevVal = item.is_public_catalog !== false;
          item.is_public_catalog = !!isPublic;
          try {
            const res = await this.runGas('apiToggleEquipmentPublic', this.session.token, item.item_id, !!isPublic);
            (this.inventoryList || []).forEach(r => {
              if (r.item_id === item.item_id) r.is_public_catalog = !!isPublic;
            });
            (this.invCache['Alat'] || []).forEach(r => {
              if (r.item_id === item.item_id) r.is_public_catalog = !!isPublic;
            });
            (this.masterItemsList || []).forEach(m => {
              if (m.item_id === item.item_id) m.is_public_catalog = !!isPublic;
            });
            this.loadPublicHome();
            this.showToast(res.message || (isPublic ? 'Peralatan ditampilkan di katalog publik' : 'Peralatan disembunyikan dari katalog publik'));
          } catch (e) {
            item.is_public_catalog = prevVal;
            this.showToast(e.message, 'error');
          }
        },

    openInvFormModal(row) {
          this.invFormSuggestions = [];
          if (!this.masterItemsList || this.masterItemsList.length === 0) {
            this.runGasSilent('apiGetMasterItems', this.session.token)
              .then(res => { this.masterItemsList = res.items || []; })
              .catch(() => {});
          }
          if (row) {
            const currentCond = row.condition_status || 'Baik';
            const totalStock = Number(row.qty_total || row.qty_available || 0);
            this.invFormModal = {
              open: true,
              is_edit: true,
              data: {
                ...row,
                condition_status: currentCond,
                original_condition_status: currentCond,
                split_qty: totalStock > 0 ? totalStock : 1,
                max_split_qty: totalStock,
                damage_notes: row.damage_notes || '',
                photo_base64: ''
              }
            };
          } else {
            const defaultLoc = (this.invLocationFilter !== 'ALL' && this.invLocationFilter !== 'GUDANG')
              ? this.invLocationFilter
              : (this.session?.accessible_labs?.[0]?.lab_id || '');
            this.invFormModal = {
              open: true,
              is_edit: false,
              data: {
                location_id: defaultLoc,
                item_id: '',
                item_name: '',
                maker_type_spec: '',
                unit: '',
                acquisition_year: new Date().getFullYear(),
                bmn_category: '',
                condition_status: 'Baik',
                original_condition_status: 'Baik',
                split_qty: 1,
                max_split_qty: 1,
                damage_notes: '',
                qty_available: '',
                batch_lot: '',
                expiry_date: '',
                cas_number: '',
                storage_position: '',
                photo_base64: '',
                photo_url: ''
              }
            };
          }
        },

    searchMasterForInvForm() {
          const q = (this.invFormModal.data.item_name || '').toLowerCase().trim();
          const cat = this.currentInvCategory();
          if (!q) {
            this.invFormSuggestions = [];
            if (!this.invFormModal.is_edit) {
              this.invFormModal.data.item_id = '';
            }
            return;
          }

          const matches = (this.masterItemsList || []).filter(m =>
            m.category === cat &&
            ((m.item_name || '').toLowerCase().includes(q) || (m.item_id || '').toLowerCase().includes(q))
          );

          if (!this.invFormModal.is_edit) {
            const exact = matches.find(m => (m.item_name || '').toLowerCase() === q);
            if (!exact) {
              this.invFormModal.data.item_id = '';
            }
          }

          this.invFormSuggestions = matches.slice(0, 8);
        },

    selectInvFormSuggestion(m) {
          this.invFormModal.data.item_id = m.item_id;
          this.invFormModal.data.item_name = m.item_name;
          if (m.maker_type_spec) this.invFormModal.data.maker_type_spec = m.maker_type_spec;
          if (m.unit) this.invFormModal.data.unit = m.unit;
          if (m.cas_number) this.invFormModal.data.cas_number = m.cas_number;
          if (m.grade) this.invFormModal.data.grade = m.grade;
          if (m.ghs_symbol) this.invFormModal.data.ghs_symbol = m.ghs_symbol;
          if (m.photo_url && !this.invFormModal.data.photo_base64) {
            this.invFormModal.data.photo_url = m.photo_url;
          }
          this.invFormSuggestions = [];
        },

    async submitInventoryForm() {
          try {
            const cat = this.currentInvCategory();
            const d = this.invFormModal.data;
            if (cat === 'Alat' && this.invFormModal.is_edit && d.condition_status !== d.original_condition_status) {
              const maxSplit = Number(d.max_split_qty || d.qty_available || 0);
              const splitVal = Number(d.split_qty || 0);
              if (!splitVal || splitVal < 1 || splitVal > maxSplit) {
                this.showToast(`Jumlah unit dipisahkan harus antara 1 s.d. ${maxSplit}`, 'error');
                return;
              }
            }
            const res = await this.runGas('apiSaveInventoryItem', this.session.token, cat, d);
            this.recordInputHistory(d.maker_type_spec, d.unit);
            this.invFormModal.open = false;
            this.invFormSuggestions = [];
            this.showToast(res.message);
            await this.loadInventory();
            if (cat === 'Alat') {
              await this.loadDamagedEquipment(true);
            }
            this.runGasSilent('apiGetMasterItems', this.session.token)
              .then(mRes => { this.masterItemsList = mRes.items || []; })
              .catch(() => {});
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        },

    async deleteInventoryItem(item) {
          const ok = await this.askConfirm('Yakin ingin menghapus data inventaris ini? (Dibatalkan otomatis jika masih dipinjam/dipesan)', 'Hapus Inventaris');
          if (!ok) return;
          try {
            const invId = item.eq_inv_id || item.mat_inv_id || item.chem_inv_id;
            const res = await this.runGas('apiDeleteInventoryItem', this.session.token, this.currentInvCategory(), invId);
            this.invDetailModal.open = false;
            this.showToast(res.message);
            await this.loadInventory();
            if (this.currentInvCategory() === 'Alat') {
              await this.loadDamagedEquipment(true);
            }
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        },

    quickRequestFromDetail(item) {
          this.invDetailModal.open = false;
          if (this.currentInvCategory() === 'Alat') {
            this.loanForm.lab_id = item.location_id;
            this.loanForm.items = [{ eq_inv_id: item.eq_inv_id, item_id: item.item_id, item_name: item.item_name, qty: 1, unit: item.unit || 'Unit' }];
            this.navigate('pinjam_alat');
          } else {
            this.usageForm.category = this.currentInvCategory();
            this.usageForm.lab_id = item.location_id;
            this.usageForm.items = [{ inv_id: item.mat_inv_id || item.chem_inv_id, item_id: item.item_id, item_name: item.item_name, qty: 1, unit: item.unit }];
            this.navigate('guna_bahan');
          }
        },

    async loadMasterItems() {
          try {
            const res = await this.runGas('apiGetMasterItems', this.session.token);
            this.masterItemsList = res.items || [];
          } catch (e) { this.showToast(e.message, 'error'); }
        },

    filteredMasterItems() {
          const q = (this.masterSearch || '').toLowerCase().trim();
          const filtered = (this.masterItemsList || []).filter(m => {
            if (this.masterCategoryFilter && this.masterCategoryFilter !== 'ALL' && m.category !== this.masterCategoryFilter) {
              return false;
            }
            if (!q) return true;
            return (
              (m.item_name || '').toLowerCase().includes(q) ||
              (m.item_id || '').toLowerCase().includes(q) ||
              (m.maker_type_spec || '').toLowerCase().includes(q) ||
              (m.cas_number || '').toLowerCase().includes(q)
            );
          });
          return this.sortByItemName(filtered, this.masterSortOrder);
        },

    openMasterFormModal(item) {
          if (item) {
            this.masterFormModal = {
              open: true,
              is_edit: true,
              data: { ...item, photo_base64: '' }
            };
          } else {
            this.masterFormModal = {
              open: true,
              is_edit: false,
              data: {
                category: 'Alat',
                item_name: '',
                maker_type_spec: '',
                unit: 'Unit',
                cas_number: '',
                grade: '',
                ghs_symbol: '',
                is_public_catalog: true,
                photo_url: '',
                photo_base64: ''
              }
            };
          }
        },

    async submitMasterFormModal() {
          try {
            const d = this.masterFormModal.data;
            const res = await this.runGas('apiSaveMasterItem', this.session.token, d);
            this.recordInputHistory(d.maker_type_spec, d.unit);
            this.masterFormModal.open = false;
            this.showToast(res.message || 'Master barang berhasil disimpan');
            await this.loadMasterItems();
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        },

    async deleteMasterItem(item) {
          const ok = await this.askConfirm(`Yakin ingin menghapus "${item.item_name}" (${item.item_id}) dari Master Data Barang?`, 'Hapus Master Barang');
          if (!ok) return;
          try {
            const res = await this.runGas('apiDeleteMasterItem', this.session.token, item.item_id);
            this.showToast(res.message || 'Master barang dihapus');
            await this.loadMasterItems();
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        }
  };
}
