// Free-text time parsing for activity sorting / display.
//
// Activities can have a `time` string that's whatever the user typed
// ("9am", "18:30", "evening", ""). We need a number we can compare to
// order them on the day. parseTime returns minutes-since-midnight, or
// null if it can't make sense of the input — null sorts last.

const VAGUE_BUCKETS = [
  [/\b(early|dawn|sunrise)\b/i,        6 * 60],
  [/\b(morning)\b/i,                   9 * 60],
  [/^am$/i,                            9 * 60],
  [/\b(noon|midday|lunch)\b/i,        12 * 60],
  [/\b(afternoon)\b/i,                14 * 60],
  [/^pm$/i,                           14 * 60],
  [/\b(evening|tonight|sunset)\b/i,   19 * 60],
  [/\b(night|late)\b/i,               21 * 60],
];

export function parseTime(t) {
  if (!t) return null;
  const lc = String(t).trim().toLowerCase();
  if (!lc) return null;

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
