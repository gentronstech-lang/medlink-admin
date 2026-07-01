/**
 * Doctor availability is stored as timezone-agnostic wall-clock times in UTC
 * (e.g. 09:00 → 1970-01-01T09:00:00.000Z). Never use toLocaleTimeString on these.
 */

export function parseWallClockHoursMinutes(value) {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const hhmm = /^(\d{1,2}):(\d{2})/.exec(trimmed);
    if (hhmm) {
      const hh = Number(hhmm[1]);
      const mm = Number(hhmm[2]);
      if (Number.isFinite(hh) && Number.isFinite(mm) && hh <= 23 && mm <= 59) {
        return { hh, mm };
      }
    }
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) {
      return { hh: d.getUTCHours(), mm: d.getUTCMinutes() };
    }
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { hh: value.getUTCHours(), mm: value.getUTCMinutes() };
  }

  return null;
}

export function formatWallClockTime12h(value) {
  const parts = parseWallClockHoursMinutes(value);
  if (!parts) return '';
  const { hh, mm } = parts;
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${mm.toString().padStart(2, '0')} ${period}`;
}

export function formatWallClockRange(start, end) {
  const a = formatWallClockTime12h(start);
  const b = formatWallClockTime12h(end);
  if (!a || !b) return '';
  return `${a} – ${b}`;
}
