import { formatDateYMD, normalizeYMD, getMonthYearLabel, buildCalendarDays } from '../utils/dateHelper.js';
import { sortByItemName } from '../utils/mediaHelper.js';

export function createPublicModule() {
  return {
    publicCatalog: [],
    publicSchedule: [],
    publicLabs: [],
    publicFilter: { lab_id: '', category: '', search: '' },
    publicCatalogPage: 1,
    publicCatalogPerPage: 10,
    publicScheduleView: 'list',
    publicCalendarMode: 'month',
    publicCalendarCursor: formatDateYMD(new Date()),
    publicScheduleFilter: { lab_id: '', date: '' },
    publicSummary: { totalTools: 0, totalMaterials: 0 },

    get filteredPublicCatalog() {
      const q = (this.publicFilter.search || '').toLowerCase();
      const filtered = (this.publicCatalog || []).filter((item) => {
        if (this.publicFilter.lab_id && item.lab_id !== this.publicFilter.lab_id) return false;
        if (this.publicFilter.category && item.category !== this.publicFilter.category) return false;
        if (q) {
          const hay = `${item.item_name} ${item.brand} ${item.spec} ${item.lab_name}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      return sortByItemName(filtered, 'asc');
    },

    get publicCatalogTotalPages() {
      return Math.max(1, Math.ceil(this.filteredPublicCatalog.length / this.publicCatalogPerPage));
    },

    get publicPageStart() {
      if (this.filteredPublicCatalog.length === 0) return 0;
      const page = Math.min(this.publicCatalogPage, this.publicCatalogTotalPages);
      return (page - 1) * this.publicCatalogPerPage + 1;
    },

    get publicPageEnd() {
      const page = Math.min(this.publicCatalogPage, this.publicCatalogTotalPages);
      return Math.min(this.filteredPublicCatalog.length, page * this.publicCatalogPerPage);
    },

    get paginatedPublicCatalog() {
      const page = Math.min(Math.max(1, this.publicCatalogPage), this.publicCatalogTotalPages);
      const start = (page - 1) * this.publicCatalogPerPage;
      return this.filteredPublicCatalog.slice(start, start + this.publicCatalogPerPage);
    },

    get filteredPublicSchedule() {
      return (this.publicSchedule || []).filter((s) => {
        if (this.publicScheduleFilter.lab_id && s.lab_id !== this.publicScheduleFilter.lab_id) return false;
        if (this.publicScheduleFilter.date && normalizeYMD(s.booking_date) !== this.publicScheduleFilter.date) return false;
        return true;
      });
    },

    get publicCalendarMonthLabel() {
      return getMonthYearLabel(this.publicCalendarCursor, this.publicCalendarMode === 'day');
    },

    get publicCalendarDays() {
      return buildCalendarDays(this.publicCalendarCursor, this.filteredPublicSchedule, 'booking_date');
    },

    shiftPublicCalendar(delta) {
      const d = new Date((normalizeYMD(this.publicCalendarCursor) || formatDateYMD(new Date())) + 'T00:00:00');
      if (this.publicCalendarMode === 'day') {
        d.setDate(d.getDate() + delta);
      } else {
        d.setMonth(d.getMonth() + delta);
      }
      this.publicCalendarCursor = formatDateYMD(d);
    },

    async loadPublicHome() {
      try {
        const res = await this.runGasSilent('apiGetPublicHomeData');
        this.publicCatalog = res.catalog || [];
        this.publicSchedule = res.schedule || [];
        this.publicLabs = res.labs || [];
        this.publicSummary = res.summary || {
          totalTools: this.publicCatalog.filter((x) => x.category === 'Alat').length,
          totalMaterials: this.publicCatalog.filter((x) => x.category !== 'Alat').length,
        };
      } catch (e) {
        console.warn('Public home load warning:', e.message);
      }
    },
  };
}
