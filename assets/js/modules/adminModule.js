import { AVAILABLE_ROLES, PERMISSION_MODULES, DEFAULT_MATRIX_FALLBACK } from '../config/constants.js';

export function createAdminModule() {
  return {
    availableRoles: AVAILABLE_ROLES,
    permissionModules: PERMISSION_MODULES,
    permissionMatrix: {},
    settingsTab: 'users',
    usersList: [],
    labsList: [],
    auditLogs: [],
    auditSearch: '',

    userModal: { open: false, editMode: false },
    userForm: {
      user_id: '',
      full_name: '',
      email: '',
      nim_nip: '',
      unit_prodi: '',
      phone: '',
      roles: ['User'],
      lab_ids: [],
      is_active: true,
    },

    labModal: { open: false, editMode: false },
    labForm: { lab_id: '', lab_code: '', lab_name: '', location: '', head_name: '', is_active: true },

    initPermissionMatrix(serverMatrix) {
      const base = JSON.parse(JSON.stringify(DEFAULT_MATRIX_FALLBACK));
      if (serverMatrix && typeof serverMatrix === 'object') {
        for (const role of Object.keys(serverMatrix)) {
          base[role] = { ...(base[role] || {}), ...serverMatrix[role] };
        }
      }
      this.permissionMatrix = base;
    },

    canAccess(moduleKey) {
      if (!this.session) return false;
      const role = this.session.active_role;
      if (role === 'Super Admin') return true;
      return Boolean(this.permissionMatrix?.[role]?.[moduleKey]);
    },

    async loadSettingsData() {
      try {
        const res = await this.runGas('apiGetAdminSettings', this.session.token);
        this.usersList = res.users || [];
        this.labsList = res.labs || [];
        if (res.permission_matrix) {
          this.initPermissionMatrix(res.permission_matrix);
        }
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async savePermissionMatrix() {
      try {
        const res = await this.runGas('apiSavePermissionMatrix', this.session.token, this.permissionMatrix);
        this.showToast(res.message || 'Matriks hak akses berhasil disimpan.');
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    async loadAuditLogs() {
      try {
        const res = await this.runGas('apiGetAuditLogs', this.session.token);
        this.auditLogs = res.logs || res || [];
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },
  };
}
