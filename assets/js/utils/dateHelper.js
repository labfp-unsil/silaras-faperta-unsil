export function createDateHelperMixin() {
  return {
    normalizeYMD(val) {
          if (!val) return '';
          const s = String(val).trim();
          const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
          if (m) return m[1];
          const parsed = new Date(s);
          if (!isNaN(parsed.getTime())) {
            const y = parsed.getFullYear();
            const mo = String(parsed.getMonth() + 1).padStart(2, '0');
            const d = String(parsed.getDate()).padStart(2, '0');
            return `${y}-${mo}-${d}`;
          }
          return s;
        },

    getCalendarGridCells() {
          const anchor = new Date((this.calendarAnchorDate || this.selectedCalendarDate) + 'T00:00:00');
          const todayStr = new Date().toISOString().slice(0, 10);
          const cells = [];

          if (this.calendarMode === 'week') {
            const dayOfWeek = anchor.getDay();
            const startOfWeek = new Date(anchor);
            startOfWeek.setDate(anchor.getDate() - dayOfWeek);
            for (let i = 0; i < 7; i++) {
              const d = new Date(startOfWeek);
              d.setDate(startOfWeek.getDate() + i);
              const dateStr = this.formatDateYMD(d);
              cells.push({
                key: 'w-' + dateStr,
                isEmpty: false,
                dateStr,
                dayNumber: d.getDate(),
                isToday: dateStr === todayStr,
                events: this.getCalendarEventsForDate(dateStr)
              });
            }
            return cells;
          }

          const year = anchor.getFullYear();
          const month = anchor.getMonth();
          const firstDay = new Date(year, month, 1).getDay();
          const daysInMonth = new Date(year, month + 1, 0).getDate();

          for (let i = 0; i < firstDay; i++) {
            cells.push({ key: 'empty-' + i, isEmpty: true });
          }
          for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(year, month, day);
            const dateStr = this.formatDateYMD(d);
            cells.push({
              key: 'm-' + dateStr,
              isEmpty: false,
              dateStr,
              dayNumber: day,
              isToday: dateStr === todayStr,
              events: this.getCalendarEventsForDate(dateStr)
            });
          }
          return cells;
        },

    shiftCalendarPeriod(step) {
          const d = new Date((this.calendarAnchorDate || this.selectedCalendarDate) + 'T00:00:00');
          if (this.calendarMode === 'day') {
            d.setDate(d.getDate() + step);
            const nextStr = this.formatDateYMD(d);
            this.calendarAnchorDate = nextStr;
            this.selectedCalendarDate = nextStr;
          } else if (this.calendarMode === 'week') {
            d.setDate(d.getDate() + (step * 7));
            const nextStr = this.formatDateYMD(d);
            this.calendarAnchorDate = nextStr;
            this.selectedCalendarDate = nextStr;
          } else {
            d.setMonth(d.getMonth() + step, 1);
            const nextStr = this.formatDateYMD(d);
            this.calendarAnchorDate = nextStr;
            this.selectedCalendarDate = nextStr;
          }
        },

    resetCalendarToday() {
          const today = new Date().toISOString().slice(0, 10);
          this.calendarAnchorDate = today;
          this.selectedCalendarDate = today;
        },

    getCalendarPeriodLabel() {
          const d = new Date((this.calendarAnchorDate || this.selectedCalendarDate) + 'T00:00:00');
          const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          if (this.calendarMode === 'day') {
            return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
          }
          return `${months[d.getMonth()]} ${d.getFullYear()}`;
        },

    formatDateYMD(dateObj) {
          const y = dateObj.getFullYear();
          const m = String(dateObj.getMonth() + 1).padStart(2, '0');
          const d = String(dateObj.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        },

    formatDateIndonesian(dateStr) {
          if (!dateStr) return '-';
          const d = new Date(dateStr + 'T00:00:00');
          const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
          const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        }
  };
}
