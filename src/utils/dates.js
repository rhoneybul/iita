// Date helpers — ISO weeks (Mon-Sun), short labels, parsing free-text
// dates like "9th December" / "Sunday".

export const WEEKDAYS_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export const WEEKDAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export const MONTHS_LONG = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
export const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function pad(n) { return String(n).padStart(2, '0'); }

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// Monday-start ISO week. Returns YYYY-MM-DD of the Monday of the week
// containing `d`. Defensive against Sundays (JS Sunday = 0).
export function isoWeekStart(d = new Date()) {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = dt.getDay();           // Sun=0
  const offset = dow === 0 ? -6 : 1 - dow;
  dt.setDate(dt.getDate() + offset);
  return toISODate(dt);
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function shiftWeek(weekStartISO, weeks) {
  return isoWeekStart(addDays(fromISODate(weekStartISO), weeks * 7));
}

export function weekRangeLabel(weekStartISO) {
  const start = fromISODate(weekStartISO);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()}–${end.getDate()}`;
  }
  return `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}`;
}

export function dayLabel(weekStartISO, dayShort) {
  const idx = WEEKDAYS_SHORT.indexOf(dayShort);
  if (idx < 0) return dayShort;
  const d = addDays(fromISODate(weekStartISO), idx);
  return `${WEEKDAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function isToday(date) {
  const t = new Date();
  return date.getFullYear() === t.getFullYear()
      && date.getMonth() === t.getMonth()
      && date.getDate() === t.getDate();
}

// Tries to coerce "4 Apr", "4th April", "April 4", "9th December" into a
// YYYY-MM-DD for the given year. Returns null on failure.
export function guessDate(text, year = new Date().getFullYear()) {
  if (!text) return null;
  const t = text.toLowerCase().replace(/(st|nd|rd|th)/g, '').replace(/,/g, ' ').trim();
  // "4 apr" / "4 april"
  let m = t.match(/^(\d{1,2})\s+([a-z]+)/);
  if (m) {
    const day = parseInt(m[1], 10);
    const monIdx = monthIndex(m[2]);
    if (monIdx >= 0 && day >= 1 && day <= 31) return `${year}-${pad(monIdx + 1)}-${pad(day)}`;
  }
  // "apr 4" / "april 4"
  m = t.match(/^([a-z]+)\s+(\d{1,2})/);
  if (m) {
    const monIdx = monthIndex(m[1]);
    const day = parseInt(m[2], 10);
    if (monIdx >= 0 && day >= 1 && day <= 31) return `${year}-${pad(monIdx + 1)}-${pad(day)}`;
  }
  return null;
}

function monthIndex(s) {
  if (!s) return -1;
  const lc = s.toLowerCase();
  const longIdx = MONTHS_LONG.findIndex(m => m.toLowerCase() === lc);
  if (longIdx >= 0) return longIdx;
  const shortIdx = MONTHS_SHORT.findIndex(m => m.toLowerCase() === lc.slice(0, 3));
  return shortIdx;
}
