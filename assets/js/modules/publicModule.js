export function createPublicModule() {
  return {
    publicData: { labs: [], catalog: [], schedules: [] },

    publicLoading: true,

    publicCatalogSearch: '',

    publicCatalogView: 'grid',

    publicCatalogPage: 1,

    publicCatalogPerPage: 12,

    pubFilterLab: '',

    pubFilterType: '',

    pubFilterDate: '',

    pubFilterSearch: '',

    calendarMode: 'month',

    calendarAnchorDate: new Date().toISOString().slice(0, 10),

    selectedCalendarDate: new Date().toISOString().slice(0, 10),

    async loadPublicHome() {
          this.publicLoading = true;
          try {
            const res = await this.runGasSilent('apiGetPublicHomeData');
            this.publicData = {
              labs: res.labs || [],
              catalog: res.catalog || [],
              schedules: (res.schedules || []).map(s => ({
                ...s,
                booking_date: this.normalizeYMD(s.booking_date)
              }))
            };
            this.publicCatalogPage = 1;
          } catch (e) {
            console.warn(e.message);
          } finally {
            this.publicLoading = false;
          }
        },

    filteredPublicCatalog() {
          const q = this.publicCatalogSearch.toLowerCase().trim();
          const list = this.publicData.catalog || [];
          if (!q) return list;
          return list.filter(x =>
            (x.item_name || '').toLowerCase().includes(q) ||
            (x.laboratories || '').toLowerCase().includes(q) ||
            (x.maker_type_spec || '').toLowerCase().includes(q)
          );
        },

    publicCatalogTotalPages() {
          const total = this.filteredPublicCatalog().length;
          return Math.max(1, Math.ceil(total / this.publicCatalogPerPage));
        },

    paginatedPublicCatalog() {
          const list = this.filteredPublicCatalog();
          const totalPages = Math.max(1, Math.ceil(list.length / this.publicCatalogPerPage));
          if (this.publicCatalogPage > totalPages) {
            this.publicCatalogPage = totalPages;
          }
          const start = (this.publicCatalogPage - 1) * this.publicCatalogPerPage;
          return list.slice(start, start + this.publicCatalogPerPage);
        },

    goToPublicCatalogPage(page) {
          const totalPages = this.publicCatalogTotalPages();
          const target = Math.min(Math.max(1, Number(page) || 1), totalPages);
          this.publicCatalogPage = target;
          const el = document.getElementById('katalog-publik');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },

    getPublicCatalogPageNumbers() {
          const total = this.publicCatalogTotalPages();
          const current = this.publicCatalogPage;
          if (total <= 7) {
            return Array.from({ length: total }, (_, i) => i + 1);
          }
          const pages = [];
          if (current <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', total);
          } else if (current >= total - 3) {
            pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
          } else {
            pages.push(1, '...', current - 1, current, current + 1, '...', total);
          }
          return pages;
        },

    filteredPublicSchedules() {
          return (this.publicData.schedules || []).filter(s => {
            if (s.status !== 'Terkonfirmasi') return false;
            if (this.pubFilterLab && s.lab_id !== this.pubFilterLab) return false;
            if (this.pubFilterType && s.activity_type !== this.pubFilterType) return false;
            if (this.pubFilterDate && this.normalizeYMD(s.booking_date) !== this.pubFilterDate) return false;
            if (this.pubFilterSearch) {
              const q = this.pubFilterSearch.toLowerCase();
              const hay = `${s.activity_title} ${s.pic_display} ${s.lab_name}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          });
        },

    getCalendarEventsForDate(dateStr) {
          const targetYMD = this.normalizeYMD(dateStr);
          return (this.publicData.schedules || []).filter(s => {
            if (this.normalizeYMD(s.booking_date) !== targetYMD) return false;
            if (this.pubFilterLab && s.lab_id !== this.pubFilterLab) return false;
            return true;
          }).sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
        },

    getSelectedDateEvents() {
          return this.getCalendarEventsForDate(this.selectedCalendarDate);
        },

    formatShortEventPill(ev) {
          const start = String(ev.start_time || '').slice(0, 5);
          if (ev.status === 'Proses Pengajuan') return `${start} Proses`;
          const prefix = ev.activity_type === 'Praktikum' ? 'Prak:' : (ev.activity_type === 'Penelitian' ? 'Pen:' : '');
          return `${start} ${prefix} ${ev.activity_title}`.trim();
        },

    getEventBadgeClass(ev) {
          if (ev.status === 'Proses Pengajuan') {
            return 'bg-amber-100 text-amber-900 border border-amber-300';
          }
          if (ev.activity_type === 'Praktikum') {
            return 'bg-[#064E3B] text-white';
          }
          if (ev.activity_type === 'Penelitian') {
            return 'bg-[#84CC16] text-emerald-950';
          }
          return 'bg-[#0284C7] text-white';
        },

    getEventCardClass(ev) {
          if (ev.status === 'Proses Pengajuan') {
            return 'bg-amber-50 border border-amber-300 text-amber-950';
          }
          if (ev.activity_type === 'Praktikum') {
            return 'bg-[#064E3B] text-white';
          }
          if (ev.activity_type === 'Penelitian') {
            return 'bg-[#84CC16] text-emerald-950';
          }
          return 'bg-[#0284C7] text-white';
        }
  };
}
