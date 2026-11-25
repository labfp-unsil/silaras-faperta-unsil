export function createTransactionModule() {
  return {
    loanForm: { lab_id: '', loan_date: new Date().toISOString().slice(0,10), due_date: new Date().toISOString().slice(0,10), purpose: '', items: [] },

    usageForm: { category: 'Bahan', lab_id: '', usage_date: new Date().toISOString().slice(0,10), purpose: '', items: [] },

    bookingForm: { lab_id: '', pic_name: '', unit_prodi: '', activity_type: 'Praktikum', activity_title: '', booking_date: new Date().toISOString().slice(0,10), start_time: '08:00', end_time: '10:00', participant_count: 20, equipment_items: [], material_items: [], chemical_items: [] },

    catalogPickerModal: { open: false, category: 'Alat', target: '', search: '', items: [] },

    filteredApprovalList(list) {
          const items = list || [];
          if (this.isSuperAdmin()) return items;
          const assigned = Array.isArray(this.session?.assigned_labs) ? this.session.assigned_labs : [];
          if (assigned.length === 0 || assigned.includes('ALL')) return items;
          return items.filter(item => assigned.includes(item.lab_id));
        },

    canApproveKalab() {
          return this.hasRole('Kepala Laboratorium') || this.isSuperAdmin();
        },

    async openCatalogPickerModal(category, labId, target) {
          if (!labId) {
            this.showToast('Silakan pilih lokasi laboratorium/gudang terlebih dahulu', 'error');
            return;
          }
          try {
            let items = [];
            if (labId === 'GUDANG') {
              let stockList = this.warehouseData.stock || [];
              if (stockList.length === 0) {
                const whRes = await this.runGas('apiGetWarehouseData', this.session.token);
                this.warehouseData = whRes;
                stockList = whRes.stock || [];
              }
              items = stockList
                .filter(s => (category === 'ALL' || s.category === category) && Number(s.qty_available) > 0)
                .map(s => ({ ...s, pickQty: 1 }));
            } else {
              const res = await this.runGas('apiGetInventory', this.session.token, category, labId);
              items = (res.items || [])
                .filter(x => x.location_id === labId && Number(x.qty_available) > 0)
                .map(x => ({
                  ...x,
                  inv_id: x.eq_inv_id || x.mat_inv_id || x.chem_inv_id,
                  pickQty: 1
                }));
            }
            this.catalogPickerModal = { open: true, category, target, search: '', items };
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        },

    filteredPickerCatalog() {
          const q = (this.catalogPickerModal.search || '').toLowerCase().trim();
          const list = (this.catalogPickerModal.items || []).filter(i =>
            !q ||
            (i.item_name || '').toLowerCase().includes(q) ||
            (i.item_id || '').toLowerCase().includes(q) ||
            (i.category || '').toLowerCase().includes(q) ||
            (i.maker_type_spec || '').toLowerCase().includes(q)
          );
          return this.sortByItemName(list, 'asc');
        },

    confirmPickItem(c, ev) {
          const now = Date.now();
          if (this._lastPickKey === (c.inv_id || c.item_id) && (now - (this._lastPickTime || 0)) < 350) {
            return;
          }
          this._lastPickKey = c.inv_id || c.item_id;
          this._lastPickTime = now;

          const maxAvail = Number(c.qty_available || 0);
          if (maxAvail <= 0) {
            this.showToast('Stok tersedia 0, tidak dapat dipilih.', 'error');
            return;
          }

          // Baca langsung dari elemen <input> di sebelah tombol jika ada agar nilai selalu akurat
          let domQty = c.pickQty;
          if (ev && ev.currentTarget && ev.currentTarget.parentElement) {
            const inp = ev.currentTarget.parentElement.querySelector('input[type="number"]');
            if (inp && inp.value !== '') domQty = inp.value;
          }

          const t = this.catalogPickerModal.target;
          const isEquipment = this.catalogPickerModal.category === 'Alat' || c.category === 'Alat' || t === 'loan' || t === 'booking_eq';
          const rawQty = Number(domQty || 1);
          const qty = isEquipment ? Math.round(rawQty) : rawQty;

          if (qty <= 0 || qty > maxAvail) {
            this.showToast('Kuantitas tidak valid atau melebihi stok tersedia (' + maxAvail + ' ' + (c.unit || 'Unit') + ')', 'error');
            return;
          }

          const mergeOrPush = (list, newItem) => {
            const normName = String(c.item_name || '').trim().toLowerCase();
            const existingIdx = list.findIndex(x =>
              (c.eq_inv_id && x.eq_inv_id === c.eq_inv_id) ||
              (c.inv_id && x.inv_id === c.inv_id) ||
              (normName && String(x.item_name || '').trim().toLowerCase() === normName)
            );
            if (existingIdx >= 0) {
              const combined = Number(list[existingIdx].qty || 0) + qty;
              if (combined > maxAvail) {
                this.showToast('Total kuantitas melebihi stok tersedia (' + maxAvail + ' ' + (c.unit || 'Unit') + ')', 'error');
                return false;
              }
              list[existingIdx].qty = combined;
              if ('qty_requested' in list[existingIdx]) list[existingIdx].qty_requested = combined;
            } else {
              list.push(newItem);
            }
            return true;
          };

          let ok = false;
          if (t === 'whOut') {
            ok = mergeOrPush(this.whOutForm.items, {
              inv_id: c.inv_id,
              item_id: c.item_id,
              category: c.category,
              item_name: c.item_name,
              qty,
              max_qty: maxAvail,
              unit: c.unit
            });
          } else if (t === 'loan') {
            ok = mergeOrPush(this.loanForm.items, {
              eq_inv_id: c.eq_inv_id || c.inv_id,
              item_id: c.item_id,
              item_name: c.item_name,
              qty,
              qty_requested: qty,
              unit: c.unit || 'Unit'
            });
          } else if (t === 'usage') {
            ok = mergeOrPush(this.usageForm.items, {
              inv_id: c.inv_id,
              item_id: c.item_id,
              item_name: c.item_name,
              qty,
              unit: c.unit
            });
          } else if (t === 'booking_eq') {
            ok = mergeOrPush(this.bookingForm.equipment_items, {
              eq_inv_id: c.eq_inv_id || c.inv_id,
              item_id: c.item_id,
              item_name: c.item_name,
              qty
            });
          } else if (t === 'booking_mat') {
            ok = mergeOrPush(this.bookingForm.material_items, {
              inv_id: c.inv_id,
              item_id: c.item_id,
              item_name: c.item_name,
              qty
            });
          } else if (t === 'booking_chem') {
            ok = mergeOrPush(this.bookingForm.chemical_items, {
              inv_id: c.inv_id,
              item_id: c.item_id,
              item_name: c.item_name,
              qty
            });
          }

          if (ok) {
            c.pickQty = 1;
            if (ev && ev.currentTarget && ev.currentTarget.parentElement) {
              const inp = ev.currentTarget.parentElement.querySelector('input[type="number"]');
              if (inp) inp.value = '1';
            }
            this.showToast(c.item_name + ' ditambahkan');
          }
        },

    async submitLoan() {
          if (!this.loanForm.lab_id) {
            this.showToast('Silakan pilih laboratorium terlebih dahulu.', 'error');
            return;
          }
          if (!this.loanForm.purpose || !String(this.loanForm.purpose).trim()) {
            this.showToast('Tujuan peminjaman wajib diisi.', 'error');
            return;
          }
          if (!this.loanForm.items || this.loanForm.items.length === 0) {
            this.showToast('Pilih minimal 1 alat sebelum mengirim permohonan.', 'error');
            return;
          }
          const invalidItem = this.loanForm.items.find(it => Number(it.qty || 0) <= 0);
          if (invalidItem) {
            this.showToast(`Jumlah pinjam untuk "${invalidItem.item_name}" tidak valid.`, 'error');
            return;
          }
          try {
            const res = await this.runGas('apiCreateEquipmentLoan', this.session.token, this.loanForm);
            this.showToast(res.message || 'Permohonan peminjaman alat berhasil dikirim');
            this.loanForm.items = [];
            this.loanForm.purpose = '';
            await this.loadDashboard();
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        },

    async submitUsage() {
          try {
            const res = await this.runGas('apiCreateMaterialUsage', this.session.token, this.usageForm);
            this.showToast(res.message);
            this.usageForm.items = [];
            await this.loadDashboard();
          } catch (e) { this.showToast(e.message, 'error'); }
        },

    async submitBooking() {
          try {
            const res = await this.runGas('apiCreateRoomBooking', this.session.token, this.bookingForm);
            this.showToast(res.message);
            this.bookingForm.equipment_items = [];
            this.bookingForm.material_items = [];
            this.bookingForm.chemical_items = [];
            await this.loadDashboard();
            await this.loadPublicHome();
          } catch (e) { this.showToast(e.message, 'error'); }
        },

    async processStep(type, id, step) {
          let reason = '';
          if (step === 'reject') {
            const input = await this.askPrompt('Masukkan alasan penolakan permohonan ini:', '', 'Alasan Penolakan', 'Tulis alasan penolakan...');
            if (input === null) return;
            reason = input;
          } else if (step === 'approve_kalab') {
            const confirmMsg = this.isSuperAdmin()
              ? 'Setujui langsung permohonan ini atas nama Kepala Laboratorium / Super Admin?'
              : 'Setujui permohonan ini sebagai Kepala Laboratorium?';
            const ok = await this.askConfirm(confirmMsg, 'Konfirmasi Persetujuan');
            if (!ok) return;
          }
          try {
            const fn = type === 'booking' ? 'apiProcessRoomBookingStep' : (type === 'loan' ? 'apiProcessLoanStep' : 'apiProcessUsageStep');
            const res = await this.runGas(fn, this.session.token, id, step, reason);
            this.showToast(res.message || 'Status permohonan berhasil diperbarui');
            await this.loadWorkspaceBundle(true);
            await this.loadPublicHome();
          } catch (e) { this.showToast(e.message, 'error'); }
        },

    async userRequestReturn(loanId) {
          try {
            const res = await this.runGas('apiUserRequestReturn', this.session.token, loanId);
            this.showToast(res.message);
            await this.loadDashboard();
          } catch (e) { this.showToast(e.message, 'error'); }
        },

    async openReturnAssessmentModal(loan) {
          const item = loan.items[0];
          if (!item) return;
          const cond = await this.askPrompt(
            `Penilaian Kondisi Pengembalian Alat:\n${item.item_name} (Pinjam: ${item.qty_requested})`,
            'Baik',
            'Penilaian Kondisi Alat',
            '',
            ['Baik', 'Rusak Ringan', 'Rusak Berat']
          );
          if (!cond) return;
          const notes = await this.askPrompt('Catatan kondisi / kerusakan (opsional):', '', 'Catatan Pengembalian', 'Tulis catatan kondisi...');
          if (notes === null) return;
          try {
            const res = await this.runGas('apiProcessLoanReturnAssessment', this.session.token, loan.loan_id, [
              { loan_item_id: item.loan_item_id, qty_returned: item.qty_requested, return_condition: cond, condition_notes: notes || '' }
            ]);
            this.showToast(res.message);
            await this.loadDashboard();
          } catch (e) { this.showToast(e.message, 'error'); }
        }
  };
}
