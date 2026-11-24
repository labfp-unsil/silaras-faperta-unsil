export function createWarehouseModule() {
  return {
    warehouseData: { stock: [], transactions: [], labs: [], takers: [], courses: [] },

    warehouseTab: 'stock',

    whViewMode: 'grid',

    whStockSearch: '',

    whSortOrder: 'asc',

    whLogSearch: '',

    whInForm: { category: 'Alat', trx_date: new Date().toISOString().slice(0,10), item_id: '', item_name: '', maker_type_spec: '', unit: '', acquisition_year: '', bmn_category: '', batch_lot: '', expiry_date: '', cas_number: '', grade: '', ghs_symbol: '', qty: '', photo_base64: '', photo_url: '' },

    whInSuggestions: [],

    whOutForm: { taker_name: '', course_name: '', destination_lab_id: '', items: [] },

    signatureHasStroke: false,

    whDetailModal: { open: false, item: null },

    whEditModal: { open: false, data: {} },

    async loadWarehouse() {
          try {
            const res = await this.runGas('apiGetWarehouseData', this.session.token);
            this.warehouseData = res;
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        },

    sortedWarehouseStock() {
          const q = (this.whStockSearch || '').toLowerCase().trim();
          const filtered = (this.warehouseData.stock || []).filter(st => {
            if (!q) return true;
            return (
              (st.item_name || '').toLowerCase().includes(q) ||
              (st.item_id || '').toLowerCase().includes(q) ||
              (st.category || '').toLowerCase().includes(q) ||
              (st.maker_type_spec || '').toLowerCase().includes(q)
            );
          });
          return this.sortByItemName(filtered, this.whSortOrder);
        },

    flattenedWarehouseInLogs() {
          const q = (this.whLogSearch || '').toLowerCase().trim();
          const trxs = (this.warehouseData.transactions || []).filter(t => t.trx_type === 'IN');
          const rows = [];
          trxs.forEach(t => {
            const items = t.items || [];
            items.forEach((it, idx) => {
              const detailParts = [];
              if (it.batch_lot && it.batch_lot !== '-') detailParts.push('Batch: ' + it.batch_lot);
              if (it.expiry_date) detailParts.push('Exp: ' + it.expiry_date);
              if (it.cas_number) detailParts.push('CAS: ' + it.cas_number);
              const row = {
                row_key: (t.trx_id || 'IN') + '-' + (it.trx_item_id || idx),
                trx_id: t.trx_id,
                trx_date: t.trx_date,
                category: it.category || '-',
                item_id: it.item_id || '-',
                item_name: it.item_name || '-',
                maker_type_spec: it.maker_type_spec || '',
                detail_info: detailParts.join(' | '),
                qty: it.qty || 0,
                unit: it.unit || '',
                created_by: t.created_by || '-',
                notes: t.notes || '-'
              };
              if (!q || `${row.trx_id} ${row.item_id} ${row.item_name} ${row.category} ${row.created_by} ${row.notes}`.toLowerCase().includes(q)) {
                rows.push(row);
              }
            });
          });
          return rows;
        },

    filteredWarehouseOutLogs() {
          const q = (this.whLogSearch || '').toLowerCase().trim();
          const trxs = (this.warehouseData.transactions || []).filter(t => t.trx_type === 'OUT');
          if (!q) return trxs;
          return trxs.filter(t => {
            const itemNames = (t.items || []).map(i => `${i.item_id} ${i.item_name}`).join(' ');
            const hay = `${t.trx_id} ${t.trx_date} ${t.destination_lab_name} ${t.taker_name} ${t.course_name} ${t.created_by} ${itemNames}`.toLowerCase();
            return hay.includes(q);
          });
        },

    resetWhInForm(keepCategory = false) {
          const cat = keepCategory ? (this.whInForm.category || 'Alat') : 'Alat';
          this.whInForm = {
            category: cat,
            trx_date: new Date().toISOString().slice(0, 10),
            item_id: '',
            item_name: '',
            maker_type_spec: '',
            unit: '',
            acquisition_year: '',
            bmn_category: '',
            batch_lot: '',
            expiry_date: '',
            cas_number: '',
            grade: '',
            ghs_symbol: '',
            qty: '',
            photo_base64: '',
            photo_url: ''
          };
          this.whInSuggestions = [];
        },

    openWhDetailModal(item) {
          this.whDetailModal = { open: true, item };
        },

    openWhEditModal(item) {
          this.whDetailModal.open = false;
          this.whEditModal = {
            open: true,
            data: {
              inv_id: item.inv_id,
              item_id: item.item_id,
              category: item.category || 'Bahan',
              trx_date: item.entry_date || new Date().toISOString().slice(0, 10),
              item_name: item.item_name || '',
              maker_type_spec: item.maker_type_spec || '',
              unit: item.unit || '',
              batch_lot: item.batch_lot === '-' ? '' : (item.batch_lot || ''),
              expiry_date: item.expiry_date || '',
              cas_number: item.cas_number || '',
              grade: item.grade || '',
              ghs_symbol: item.ghs_symbol || '',
              qty_available: Number(item.qty_available || 0),
              photo_url: item.photo_url || '',
              photo_base64: ''
            }
          };
        },

    async submitWhEditModal() {
          try {
            const d = this.whEditModal.data;
            const res = await this.runGas('apiUpdateWarehouseStockItem', this.session.token, d);
            this.recordInputHistory(d.maker_type_spec, d.unit);
            this.whEditModal.open = false;
            this.showToast(res.message || 'Detail barang gudang berhasil diperbarui');
            await this.loadWarehouse();
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        },

    async deleteWarehouseStockItem(item) {
          const ok = await this.askConfirm(`Yakin ingin menghapus "${item.item_name}" (${item.item_id}) dari Stok Gudang Pusat?`, 'Hapus Barang Gudang');
          if (!ok) return;
          try {
            const res = await this.runGas('apiDeleteWarehouseStockItem', this.session.token, item.inv_id);
            this.whDetailModal.open = false;
            this.showToast(res.message || 'Barang berhasil dihapus dari gudang');
            await this.loadWarehouse();
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        },

    async searchMasterForWhIn() {
		  const q = (this.whInForm.item_name || '').toLowerCase().trim();
		  const cat = String(this.whInForm.category || '').toLowerCase().trim();

		  if (!q) {
			this.whInSuggestions = [];
			this.whInForm.item_id = '';
			return;
		  }

		  // Pastikan masterItemsList sudah terisi di memori browser (jika belum, ambil sekali saja)
		  if (!this.masterItemsList || this.masterItemsList.length === 0) {
			try {
			  const res = await this.runGasSilent('apiGetMasterItems', this.session.token);
			  this.masterItemsList = Array.isArray(res) ? res : (res?.items || []);
			} catch (e) {
			  console.error('Gagal memuat master data:', e);
			}
		  }

		  // Filter langsung di memori browser (Instan / 0 ms)
		  this.whInSuggestions = (this.masterItemsList || [])
			.filter(m => String(m.category || '').toLowerCase().trim() === cat)
			.filter(m =>
			  String(m.item_name || '').toLowerCase().includes(q) ||
			  String(m.item_id || '').toLowerCase().includes(q) ||
			  String(m.maker_type_spec || '').toLowerCase().includes(q)
			)
			.slice(0, 15);
		},

    selectWhInSuggestion(s) {
          this.whInForm.item_id = s.item_id;
          this.whInForm.item_name = s.item_name;
          this.whInForm.maker_type_spec = s.maker_type_spec;
          this.whInForm.unit = s.unit;
          this.whInForm.cas_number = s.cas_number;
          this.whInForm.grade = s.grade;
          this.whInForm.ghs_symbol = s.ghs_symbol;
          this.whInForm.photo_url = s.photo_url;
          this.whInSuggestions = [];
        },

    async submitWarehouseIn() {
          try {
            const d = this.whInForm;
            const res = await this.runGas('apiWarehouseStockIn', this.session.token, d);
            this.recordInputHistory(d.maker_type_spec, d.unit);
            this.showToast(res.message);
            this.resetWhInForm(true);
            await this.loadWarehouse();
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        },

    initSignaturePad(forceReset = false) {
          const canvas = document.getElementById('whSignatureCanvas');
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#064E3B';

          if (forceReset) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.signatureHasStroke = false;
          }

          if (canvas.dataset.bound === '1') return;
          canvas.dataset.bound = '1';

          let drawing = false;
          const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) };
          };
          const start = (e) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); this.signatureHasStroke = true; };
          const move = (e) => { if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
          const end = () => { drawing = false; };

          canvas.addEventListener('mousedown', start);
          canvas.addEventListener('mousemove', move);
          window.addEventListener('mouseup', end);
          canvas.addEventListener('touchstart', start, { passive: false });
          canvas.addEventListener('touchmove', move, { passive: false });
          window.addEventListener('touchend', end);
        },

    clearSignaturePad() {
          const canvas = document.getElementById('whSignatureCanvas');
          if (!canvas) return;
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
          this.signatureHasStroke = false;
        },

    async submitWarehouseOut() {
          if (!this.whOutForm.destination_lab_id || this.whOutForm.items.length === 0) {
            this.showToast('Pilih lab tujuan dan minimal 1 barang', 'error'); return;
          }
          if (!this.signatureHasStroke) {
            this.showToast('Tanda tangan digital pengambil wajib diisi', 'error'); return;
          }
          try {
            const canvas = document.getElementById('whSignatureCanvas');
            const payload = { ...this.whOutForm, signature_base64: canvas.toDataURL('image/png') };
            const res = await this.runGas('apiWarehouseStockOut', this.session.token, payload);
            this.showToast(res.message);
            this.whOutForm = { taker_name: '', course_name: '', destination_lab_id: '', items: [] };
            this.clearSignaturePad();
            await this.loadWarehouse();
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        }
  };
}
