// Free-text time parsing for activity sorting / display.
//
// Activities can store `time` as one of:
//   • a bucket: "morning", "noon", "night"
//   • a clock value: "9am", "18:30"
//   • a range: "09:00-11:00" or "9am-11am" (en-dash also accepted)
//   • "" (untimed)
//
// parseTime returns minutes-since-midnight (start of range) for sorting.
// formatTime renders the value for display.

const VAGUE_BUCKETS = [
  [/\ball\s*day\b/i,                  -1],
  [/\b(early|dawn|sunrise)\b/i,        6 * 60],
  [/\b(morning)\b/i,                   9 * 60],
  [/^am$/i,                            9 * 60],
  [/\b(noon|midday|lunch)\b/i,        12 * 60],
  [/\b(afternoon)\b/i,                14 * 60],
  [/^pm$/i,                           14 * 60],
  [/\b(evening|tonight|sunset)\b/i,   19 * 60],
  [/\b(night|late)\b/i,               21 * 60],
];

// Stored on the item as lowercase strings. "all day" carries a space so
// it round-trips as a human-readable phrase too.
export const TIME_BUCKETS = ['all day', 'morning', 'noon', 'night'];

const BUCKET_LABELS = {
  'all day': 'All day',
  morning:   'Morning',
  noon:      'Noon',
  night:     'Night',
};

export function parseTime(t) {
  if (!t) return null;
  const lc = String(t).trim().toLowerCase();
  if (!lc) return null;

  // Range like "09:00-11:00", "9am - 11am" — sort by start.
  const dash = lc.split(/\s*[-–—]\s*/);
  if (dash.length === 2 && dash[0] && dash[1]) {
    const start = parseSingle(dash[0]);
    if (start != null) return start;
  }

  return parseSingle(lc);
}

function parseSingle(lc) {
  // 24-hour: "18:30", "9:05"
  let m = lc.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const h = clamp(parseInt(m[1], 10), 0, 23);
    const min = clamp(parseInt(m[2], 10), 0, 59);
    return h * 60 + min;
  }

  // 12-hour: "9am", "6:30pm", "10 pm"
  m = lc.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (m) {
    let h = clamp(parseInt(m[1], 10), 0, 12);
    const min = m[2] ? clamp(parseInt(m[2], 10), 0, 59) : 0;
    if (m[3] === 'pm' && h < 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    return h * 60 + min;
  }

  // Vague buckets ("morning", "evening", etc).
  for (const [re, mins] of VAGUE_BUCKETS) {
    if (re.test(lc)) return mins;
  }

  return null;
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// Display: bucket → capitalised; range → en-dash separator; pass through
// anything else (already typed by user or returned by parser).
export function formatTime(t) {
  if (!t) return '';
  const s = String(t).trim();
  const lc = s.toLowerCase();
  if (BUCKET_LABELS[lc]) return BUCKET_LABELS[lc];
  const dash = s.split(/\s*[-–—]\s*/);
  if (dash.length === 2 && dash[0] && dash[1]) {
    return `${dash[0].trim()}–${dash[1].trim()}`;
  }
  return s;
}

// Inverse of TIME_BUCKETS look-up — what kind of value is this?
//   'bucket' | 'range' | 'free' | 'empty'
export function timeKind(t) {
  if (!t) return 'empty';
  const lc = String(t).trim().toLowerCase();
  if (TIME_BUCKETS.includes(lc)) return 'bucket';
  if (/[-–—]/.test(lc) && lc.split(/\s*[-–—]\s*/).length === 2) return 'range';
  return 'free';
}

// Build a HH:MM string from a Date.
export function hhmm(date) {
  if (!date) return '';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Parse "HH:MM" (24h only) into a Date with today's date — used to feed
// DateTimePicker which wants a Date object.
export function dateFromHHMM(s, base = new Date()) {
  const d = new Date(base);
  d.setSeconds(0, 0);
  const m = String(s || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) { d.setHours(9, 0, 0, 0); return d; }
  d.setHours(clamp(parseInt(m[1], 10), 0, 23), clamp(parseInt(m[2], 10), 0, 59));
  return d;
}

export function sortActivities(activities) {
  return [...(activities || [])].sort((a, b) => {
    const am = parseTime(a?.time);
    const bm = parseTime(b?.time);
    if (am == null && bm == null) return 0;
    if (am == null) return 1;
    if (bm == null) return -1;
    return am - bm;
  });
}
