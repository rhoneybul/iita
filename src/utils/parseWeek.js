// Offline / fallback parser. Splits free-text by day, then splits each
// day into clauses. Each clause becomes an activity with a best-guess
// label, an extracted time (if any), and a together flag based on
// pronoun signals ("we"/"us"/"together"/"date"). Replaced by Claude on
// the server when EXPO_PUBLIC_SERVER_URL is set.

import { WEEKDAYS } from '../services/storageService';

const DAY_ALIASES = {
  Mon: ['monday', 'mon'],
  Tue: ['tuesday', 'tue', 'tues'],
  Wed: ['wednesday', 'wed', 'weds'],
  Thu: ['thursday', 'thu', 'thur', 'thurs'],
  Fri: ['friday', 'fri'],
  Sat: ['saturday', 'sat'],
  Sun: ['sunday', 'sun'],
};

// Keyword → label mapping. First match wins.
const LABEL_HINTS = [
  ['exercise',  ['cycling', 'cycle', 'ride', 'rowing', 'erg', 'gym', 'run', 'running', 'surf', 'surfing', 'yoga', 'swim', 'lift', 'climb', 'tennis', 'pilates', 'workout', 'training']],
  ['work',      ['office', 'oficina', 'wfo', 'meeting', 'standup', 'review', 'demo', 'sprint', 'on-site']],
  ['travel',    ['flying', 'flight', 'train', 'driving to', 'trip', 'spain', 'france', 'morocco', 'portugal', 'canada']],
  ['important', ['wedding', 'birthday', 'appointment', 'doctor', 'dentist', 'interview', 'exam', 'funeral', 'anniversary', 'lawyer', 'tax']],
  ['social',    ['dinner', 'drinks', 'lunch with', 'breakfast with', 'brunch', 'date', 'party']],
];

// Phrases that strongly indicate the partner is along.
const TOGETHER_HINTS = [
  /\bwith you\b/i, /\bwe(?:'re|'ll| are| will)?\b/i, /\bus\b/i, /\btogether\b/i,
  /\bdate night\b/i, /\bour\b/i,
];

// Time-of-day patterns. Order matters — more specific first.
const TIME_PATTERNS = [
  /\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b/i,        // 18:30, 9:00 am
  /\b(\d{1,2}\s*(?:am|pm))\b/i,               // 9am, 6 pm
  /\b(morning|afternoon|evening|night|noon)\b/i,
  /\b(am|pm)\b/i,                              // standalone
];

function detectDayLead(text) {
  const head = text.toLowerCase().split(/[\s,;:]/).slice(0, 3).join(' ');
  for (const [day, names] of Object.entries(DAY_ALIASES)) {
    if (names.some(n => new RegExp(`\\b${n}\\b`).test(head))) return day;
  }
  return null;
}

function extractTime(clause) {
  for (const re of TIME_PATTERNS) {
    const m = clause.match(re);
    if (m) {
      const value = m[1] || m[0];
      const remainder = (clause.slice(0, m.index) + clause.slice(m.index + m[0].length))
        .replace(/\s{2,}/g, ' ')
        .replace(/^[\s,.-]+|[\s,.-]+$/g, '');
      return { time: value.trim(), text: remainder };
    }
  }
  return { time: '', text: clause };
}

function pickLabel(text) {
  const lc = text.toLowerCase();
  for (const [label, hints] of LABEL_HINTS) {
    if (hints.some(h => lc.includes(h))) return label;
  }
  return '';
}

function isTogether(text) {
  return TOGETHER_HINTS.some(re => re.test(text));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function heuristicParseWeek(text) {
  const days = WEEKDAYS.reduce((acc, d) => ({ ...acc, [d]: { activities: [] } }), {});
  const sentences = String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|\n+/)
    .filter(Boolean);

  let currentDay = null;
  for (const raw of sentences) {
    const dayFromLead = detectDayLead(raw);
    if (dayFromLead) currentDay = dayFromLead;
    if (!currentDay) continue;

    // Strip the leading day name so it doesn't end up in the title.
    const allDayNames = Object.values(DAY_ALIASES).flat().join('|');
    const cleaned = raw.replace(new RegExp(`^\\s*(${allDayNames})\\b[\\s,:-]*`, 'i'), '').trim();

    // Split by commas / "and" / "then" / semicolons.
    const clauses = cleaned.split(/,| and | then |;|·/i).map(c => c.trim()).filter(Boolean);

    for (const clause of clauses) {
      const { time, text: rest } = extractTime(clause);
      const title = rest.trim();
      if (!title) continue;
      days[currentDay].activities.push({
        id: uid(),
        title,
        time,
        label: pickLabel(clause),
        together: isTogether(clause),
      });
    }
  }

  return { days };
}
