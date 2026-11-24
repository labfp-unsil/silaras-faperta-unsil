export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function formatDateYMD(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeYMD(val) {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return formatDateYMD(val);
  }
  const s = String(val).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return formatDateYMD(parsed);
  }
  return s;
}

export function formatDateIndonesian(dateStr) {
  const ymd = normalizeYMD(dateStr);
  if (!ymd) return '-';
  const d = new Date(ymd + 'T00:00:00');
  if (isNaN(d.getTime())) return ymd;
  return `${DAYS_ID[d.getDay()]}, ${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function getMonthYearLabel(dateStr, isDayMode = false) {
  const ymd = normalizeYMD(dateStr);
  if (!ymd) return '';
  const d = new Date(ymd + 'T00:00:00');
  if (isNaN(d.getTime())) return ymd;
  if (isDayMode) {
    return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
  }
  return `${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function buildCalendarDays(cursorDateStr, events = [], dateField = 'booking_date') {
  const ymd = normalizeYMD(cursorDateStr) || formatDateYMD(new Date());
  const cursor = new Date(ymd + 'T00:00:00');
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const todayStr = formatDateYMD(new Date());

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const cellYmd = formatDateYMD(cellDate);
    const cellEvents = (events || []).filter((ev) => normalizeYMD(ev[dateField]) === cellYmd);
    cells.push({
      date: cellYmd,
      dayNum: cellDate.getDate(),
      inCurrentMonth: cellDate.getMonth() === month,
      isToday: cellYmd === todayStr,
      events: cellEvents,
    });
  }
  return cells;
}
