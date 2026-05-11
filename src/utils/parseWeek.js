// Offline / fallback parser. Splits free-text into per-day buckets and
// makes a rough guess at which column each phrase belongs in. Replaced
// by Claude on the server when EXPO_PUBLIC_SERVER_URL is set, but this
// keeps the feature working with zero infra.

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

const CATEGORY_HINTS = {
  ejercicio:  ['cycling', 'cycle', 'ride', 'rowing', 'erg', 'gym', 'run', 'running', 'surf', 'surfing', 'yoga', 'swim', 'lift', 'climb', 'tennis', 'pilates', 'workout', 'training'],
  oficina:    ['office', 'oficina', 'work from office', 'wfo', 'in person'],
  juntos:     ['together', 'date', 'dinner with', 'lunch with', 'breakfast with', 'drinks with', 'with you', 'us '],
  importante: ['wedding', 'birthday', 'flight', 'flying', 'appointment', 'doctor', 'interview', 'exam', 'funeral', 'anniversary', 'lawyer', 'tax'],
  donde:      ['in ', 'at ', 'london', 'balham', 'spain', 'france', 'morocco', 'paris', 'bristol'],
};

function blankDay() {
  return { donde: '', juntos: '', oficina: '', importante: '', ejercicio: '', queMas: '' };
}

function detectDay(token) {
  const lc = token.toLowerCase();
  for (const [day, names] of Object.entries(DAY_ALIASES)) {
    if (names.some(n => lc === n || lc.startsWith(n + ' ') || lc.endsWith(' ' + n))) return day;
  }
  return null;
}

// Pick the best column for a phrase. Returns the first hint that matches,
// falling back to 'queMas' (catch-all).
function categorise(phrase) {
  const lc = phrase.toLowerCase();
  for (const [cat, hints] of Object.entries(CATEGORY_HINTS)) {
    if (hints.some(h => lc.includes(h))) return cat;
  }
  return 'queMas';
}

function appendTo(day, cat, phrase) {
  const trimmed = phrase.trim();
  if (!trimmed) return;
  day[cat] = day[cat] ? `${day[cat]}; ${trimmed}` : trimmed;
}

export function heuristicParseWeek(text) {
  const days = WEEKDAYS.reduce((acc, d) => ({ ...acc, [d]: blankDay() }), {});

  // Split on sentence-ish boundaries first.
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+|\n+/).filter(Boolean);

  let currentDay = null;
  for (const raw of sentences) {
    // Look for a day name at the start: "Monday I'm in Balham..."
    const lead = raw.split(/[\s,;:]/).slice(0, 3).join(' ');
    let dayFromLead = null;
    for (const [day, names] of Object.entries(DAY_ALIASES)) {
      if (names.some(n => new RegExp(`\\b${n}\\b`, 'i').test(lead))) {
        dayFromLead = day; break;
      }
    }
    if (dayFromLead) currentDay = dayFromLead;
    if (!currentDay) continue;

    // Split into clauses (commas / "and" / semicolons) and route each one.
    const cleaned = raw
      .replace(new RegExp(`^\\s*${Object.values(DAY_ALIASES).flat().join('|')}\\b[\\s,:-]*`, 'i'), '')
      .trim();
    const clauses = cleaned.split(/,| and | then |;|·/i).map(c => c.trim()).filter(Boolean);

    for (const clause of clauses) {
      const cat = categorise(clause);
      appendTo(days[currentDay], cat, clause);
    }
  }

  return { days };
}
