export function createAdminModule() {
  return {
    auditLogsList: [],

    adminData: { users: [], labs: [], role_permissions: null },

    userModal: { open: false, data: { roles: ['User'], assigned_labs: [], status: 'active' } },

    labModal: { open: false, is_edit: false, data: { lab_id: '', lab_name: '', lab_position: '', description: '', pic_name: '', max_capacity: 40, status: 'active' } },

    selectedMatrixRole: 'Laboran',

    rolePermissionsMatrix: {},

    getDefaultPermissionMatrix() {
          const full = { view: true, edit: true, delete: true };
          const viewEdit = { view: true, edit: true, delete: false };
          const viewOnly = { view: true, edit: false, delete: false };
          const none = { view: false, edit: false, delete: false };

          const build = (overrides) => {
            const out = {};
            this.permissionModules.forEach(m => {
              out[m.key] = { ...(overrides[m.key] || none) };
            });
            return out;
          };

          return {
            'Super Admin': build(Object.fromEntries(this.permissionModules.map(m => [m.key, full]))),
            'Admin': build({
              master_data: full, inv_alat: full, alat_rusak: full, inv_bahan: full, inv_kimia: full,
              gudang: viewEdit, pinjam_alat: viewOnly, guna_bahan: viewOnly, booking_ruang: viewOnly,
              verifikasi: viewOnly, laporan: viewOnly, audit: viewOnly
            }),
            'Petugas Gudang': build({
              master_data: viewEdit, inv_alat: viewOnly, alat_rusak: viewOnly, inv_bahan: viewOnly, inv_kimia: viewOnly,
              gudang: full, laporan: viewOnly
            }),
            'Laboran': build({
              master_data: viewEdit, inv_alat: full, alat_rusak: full, inv_bahan: full, inv_kimia: full,
              gudang: viewOnly, pinjam_alat: viewOnly, guna_bahan: viewOnly, booking_ruang: viewOnly,
              verifikasi: viewEdit, laporan: viewOnly
            }),
            'Kepala Laboratorium': build({
              inv_alat: viewOnly, alat_rusak: viewEdit, inv_bahan: viewOnly, inv_kimia: viewOnly,
              pinjam_alat: viewOnly, guna_bahan: viewOnly, booking_ruang: viewOnly,
              verifikasi: viewEdit, laporan: viewOnly, audit: viewOnly
            }),
            'User': build({
              inv_alat: viewOnly, inv_bahan: viewOnly, inv_kimia: viewOnly,
              pinjam_alat: viewEdit, guna_bahan: viewEdit, booking_ruang: viewEdit
            })
          };
        },

    initPermissionMatrix(serverMatrix) {
          const defaults = this.getDefaultPermissionMatrix();
          if (serverMatrix && typeof serverMatrix === 'object') {
            this.availableRoles.forEach(role => {
              if (serverMatrix[role]) {
                this.permissionModules.forEach(m => {
                  if (serverMatrix[role][m.key]) {
                    defaults[role][m.key] = {
                      view: !!serverMatrix[role][m.key].view,
                      edit: !!serverMatrix[role][m.key].edit,
                      delete: !!serverMatrix[role][m.key].delete
                    };
                  }
                });
              }
            });
          }
          this.rolePermissionsMatrix = defaults;
        },

    getRolePerm(role, moduleKey, action) {
          return !!(this.rolePermissionsMatrix?.[role]?.[moduleKey]?.[action]);
        },

    toggleRolePerm(role, moduleKey, action, checked) {
          if (!this.rolePermissionsMatrix[role]) this.rolePermissionsMatrix[role] = {};
          if (!this.rolePermissionsMatrix[role][moduleKey]) {
            this.rolePermissionsMatrix[role][moduleKey] = { view: false, edit: false, delete: false };
          }
          this.rolePermissionsMatrix[role][moduleKey][action] = checked;
          if ((action === 'edit' || action === 'delete') && checked) {
            this.rolePermissionsMatrix[role][moduleKey].view = true;
          }
          if (action === 'view' && !checked) {
            this.rolePermissionsMatrix[role][moduleKey].edit = false;
            this.rolePermissionsMatrix[role][moduleKey].delete = false;
          }
        },

    async resetDefaultPermissionMatrix() {
          const ok = await this.askConfirm('Kembalikan pengaturan matriks hak akses ke standar default sistem SILARAS?', 'Reset Hak Akses');
          if (!ok) return;
          this.rolePermissionsMatrix = this.getDefaultPermissionMatrix();
          this.showToast('Matriks dikembalikan ke default (klik Simpan untuk menerapkan ke server)');
        },

    async saveRolePermissionsMatrix() {
          try {
            const res = await this.runGas('apiSaveRolePermissions', this.session.token, this.rolePermissionsMatrix);
            this.adminData.role_permissions = res.role_permissions || this.rolePermissionsMatrix;
            this.showToast(res.message || 'Matriks hak akses berhasil disimpan');
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        },

    getUserRoles() {
          const roles = Array.isArray(this.session?.roles) && this.session.roles.length > 0
            ? this.session.roles
            : (this.session?.active_role ? [this.session.active_role] : []);
          return roles;
        },

    hasRole(role) {
          return this.getUserRoles().includes(role) || this.isSuperAdmin();
        },

    isSuperAdmin() {
          return this.getUserRoles().includes('Super Admin');
        },

    canView(menu) {
          const userRoles = this.getUserRoles();
          if (userRoles.length === 0) return false;
          if (this.isSuperAdmin()) return true;

          if (menu === 'alat_rusak' && !this.isSuperAdmin() && (userRoles.includes('User') || userRoles.includes('Petugas Gudang'))) {
            return false;
          }
          const map = {
            master_data: ['Admin', 'Petugas Gudang', 'Laboran'],
            inv_alat: ['Admin', 'Petugas Gudang', 'Laboran', 'Kepala Laboratorium', 'User'],
            alat_rusak: ['Admin', 'Laboran', 'Kepala Laboratorium'],
            inv_bahan: ['Admin', 'Petugas Gudang', 'Laboran', 'Kepala Laboratorium', 'User'],
            inv_kimia: ['Admin', 'Petugas Gudang', 'Laboran', 'Kepala Laboratorium', 'User'],
            gudang: ['Admin', 'Petugas Gudang', 'Laboran'],
            pinjam_alat: ['Admin', 'Laboran', 'Kepala Laboratorium', 'User'],
            guna_bahan: ['Admin', 'Laboran', 'Kepala Laboratorium', 'User'],
            booking_ruang: ['Admin', 'Laboran', 'Kepala Laboratorium', 'User'],
            verifikasi: ['Admin', 'Laboran', 'Kepala Laboratorium'],
            laporan: ['Admin', 'Petugas Gudang', 'Laboran', 'Kepala Laboratorium'],
            audit: ['Admin', 'Kepala Laboratorium'],
            settings: ['Admin']
          };

          return userRoles.some(role => {
            if (this.rolePermissionsMatrix?.[role]?.[menu]) {
              return !!this.rolePermissionsMatrix[role][menu].view;
            }
            return (map[menu] || []).includes(role);
          });
        },

    canEdit(menu) {
          const userRoles = this.getUserRoles();
          if (userRoles.length === 0) return false;
          if (this.isSuperAdmin()) return true;

          return userRoles.some(role => {
            if (this.rolePermissionsMatrix?.[role]?.[menu]) {
              return !!this.rolePermissionsMatrix[role][menu].edit;
            }
            if (menu === 'gudang') return ['Petugas Gudang', 'Admin'].includes(role);
            if (['inv_alat','alat_rusak','inv_bahan','inv_kimia','master_data'].includes(menu)) {
              return ['Laboran', 'Admin', 'Petugas Gudang'].includes(role);
            }
            return false;
          });
        },

    canDelete(menu) {
          const userRoles = this.getUserRoles();
          if (userRoles.length === 0) return false;
          if (this.isSuperAdmin()) return true;

          return userRoles.some(role => {
            if (this.rolePermissionsMatrix?.[role]?.[menu]) {
              return !!this.rolePermissionsMatrix[role][menu].delete;
            }
            return ['Admin', 'Laboran', 'Petugas Gudang'].includes(role);
          });
        },

    async loadAuditLogs() {
          try {
            const res = await this.runGas('apiGetAuditLogs', this.session.token);
            this.auditLogsList = res.logs || [];
          } catch (e) { this.showToast(e.message, 'error'); }
        },

    async loadAdminSettings() {
          try {
            const res = await this.runGas('apiGetAdminSettingsData', this.session.token);
            this.adminData = res;
            this.initPermissionMatrix(res.role_permissions || null);
          } catch (e) { this.showToast(e.message, 'error'); }
        },

    openLabModal(lab) {
          if (lab) {
            this.labModal = {
              open: true,
              is_edit: true,
              data: {
                lab_id: lab.lab_id,
                lab_name: lab.lab_name || '',
                lab_position: lab.lab_position || lab.lab_code || '',
                description: lab.description || '',
                pic_name: lab.pic_name || '',
                max_capacity: Number(lab.max_capacity || 40),
                status: lab.status || 'active'
              }
            };
          } else {
            this.labModal = {
              open: true,
              is_edit: false,
              data: {
                lab_id: '',
                lab_name: '',
                lab_position: '',
                description: '',
                pic_name: '',
                max_capacity: 40,
                status: 'active'
              }
            };
          }
        },

    async submitLabModal() {
          try {
            const res = await this.runGas('apiSaveLab', this.session.token, this.labModal.data);
            this.labModal.open = false;
            this.showToast(res.message || 'Data laboratorium berhasil disimpan');
            await this.loadAdminSettings();
            await this.loadPublicHome();
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        },

    async deleteLab(labId) {
          const ok = await this.askConfirm('Yakin ingin menghapus laboratorium ini? Tindakan ini tidak dapat dibatalkan.', 'Hapus Laboratorium');
          if (!ok) return;
          try {
            const res = await this.runGas('apiDeleteLab', this.session.token, labId);
            this.showToast(res.message);
            await this.loadAdminSettings();
            await this.loadPublicHome();
          } catch (e) { this.showToast(e.message, 'error'); }
        },

    openUserModal(u) {
          if (u) {
            this.userModal = { open: true, data: { ...u, new_password: '' } };
          } else {
            this.userModal = { open: true, data: { full_name: '', email: '', roles: ['User'], assigned_labs: [], status: 'active', new_password: '' } };
          }
        },

    async submitUserModal() {
          try {
            const res = await this.runGas('apiSaveUserAdmin', this.session.token, this.userModal.data);
            this.userModal.open = false;
            this.showToast(res.message);
            await this.loadAdminSettings();
          } catch (e) { this.showToast(e.message, 'error'); }
        }
  };
}
