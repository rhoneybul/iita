// Storage — AsyncStorage-backed, local-first. Optional remote sync via
// /api/state when EXPO_PUBLIC_SERVER_URL is set. Two collections:
//   • weeks   — keyed by ISO Monday-of-week date (YYYY-MM-DD)
//   • events  — flat list of one-off year events
//
// Shape:
//   week = {
//     weekStart: '2026-05-11',
//     days: {
//       Mon: { activities: [ { id, title, time, label, together }, ... ] },
//       ...
//     }
//   }
//   event = { id, date: 'YYYY-MM-DD', endDate?: 'YYYY-MM-DD', title, location?, withWho?, done? }

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { isoWeekStart } from '../utils/dates';

const KEYS = {
  WEEKS:        '@iita_weeks_v1',
  EVENTS:       '@iita_events_v1',
  CURRENT_USER: '@iita_current_user_id',
  USER_PREFS:   '@iita_user_prefs_v1',
  LIST_TODO:    '@iita_list_todo_v1',
  LIST_WISH:    '@iita_list_wish_v1',
};

// Maps the `kind` route param to a storage key. Keep this in lock-step
// with the `kind` check constraint in the SQL migration.
const LIST_KEY_FOR = {
  todo: KEYS.LIST_TODO,
  wish: KEYS.LIST_WISH,
};

export const LIST_KINDS = ['todo', 'wish'];

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function getJSON(key) {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}
async function setJSON(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function emptyDay() {
  return { activities: [] };
}

export function emptyWeek(weekStart) {
  return {
    weekStart,
    days: WEEKDAYS.reduce((acc, d) => ({ ...acc, [d]: emptyDay() }), {}),
  };
}

// One-way migration from the old six-column shape to the new
// activity-list shape. Pre-launch only — once we're confident no
// devices still hold v1 data, this can come out.
function normaliseDay(day) {
  if (!day) return emptyDay();
  if (Array.isArray(day.activities)) return day;
  const acts = [];
  const push = (title, label, together = false) => {
    const trimmed = String(title || '').trim();
    if (!trimmed) return;
    acts.push({ id: uid(), title: trimmed, time: '', label, together });
  };
  push(day.donde,      'travel');
  push(day.oficina === 'Yes' ? 'Office' : day.oficina, 'work');
  push(day.juntos,     'social',    true);
  push(day.importante, 'important');
  push(day.ejercicio,  'exercise');
  push(day.queMas,     'other');
  return { activities: acts };
}

// ── User scoping ─────────────────────────────────────────────────────────────
// If a different user logs in on the same device, wipe local state so we
// don't mix two people's calendars. Mirrors etapa's ensureUserData.

export async function ensureUserData(currentUserId) {
  const prev = await AsyncStorage.getItem(KEYS.CURRENT_USER);
  if (prev && prev !== currentUserId) {
    await AsyncStorage.multiRemove([KEYS.WEEKS, KEYS.EVENTS, KEYS.USER_PREFS]);
    await AsyncStorage.setItem(KEYS.CURRENT_USER, currentUserId);
    return true;
  }
  if (!prev) await AsyncStorage.setItem(KEYS.CURRENT_USER, currentUserId || 'guest');
  return false;
}

export async function hydrateFromServer({ force = false } = {}) {
  try {
    const remote = await api.state.get();
    if (!remote) return false;
    if (force || !(await getJSON(KEYS.WEEKS)))      await setJSON(KEYS.WEEKS,      remote.weeks  || {});
    if (force || !(await getJSON(KEYS.EVENTS)))     await setJSON(KEYS.EVENTS,     remote.events || []);
    if (force || !(await getJSON(KEYS.LIST_TODO))) await setJSON(KEYS.LIST_TODO, remote.todos  || []);
    if (force || !(await getJSON(KEYS.LIST_WISH))) await setJSON(KEYS.LIST_WISH, remote.wishes || []);
    return true;
  } catch {
    return false;
  }
}

// ── Weeks ────────────────────────────────────────────────────────────────────

export async function getWeek(weekStart) {
  const all = (await getJSON(KEYS.WEEKS)) || {};
  const week = all[weekStart] || emptyWeek(weekStart);
  // Defensive normalisation — anything stored under the old six-column
  // shape gets converted into activities here on first read.
  for (const k of WEEKDAYS) {
    week.days[k] = normaliseDay(week.days[k]);
  }
  return week;
}

export async function getCurrentWeek(now = new Date()) {
  return getWeek(isoWeekStart(now));
}

export async function saveWeek(week) {
  if (!week?.weekStart) throw new Error('week.weekStart required');
  const all = (await getJSON(KEYS.WEEKS)) || {};
  all[week.weekStart] = week;
  await setJSON(KEYS.WEEKS, all);
  api.state.upsertWeek(week).catch(() => {});
  return week;
}

export async function saveDay(weekStart, day, patch) {
  const week = await getWeek(weekStart);
  week.days[day] = { ...emptyDay(), ...(week.days[day] || {}), ...patch };
  return saveWeek(week);
}

// ── Activity-level helpers ───────────────────────────────────────────────────

function normaliseActivity(a) {
  return {
    id:       a.id || uid(),
    title:    String(a.title || '').trim(),
    time:     String(a.time  || '').trim(),
    label:    a.label || '',
    notes:    a.notes ? String(a.notes).trim() : null,
    together: !!a.together,
    addedBy:  a.addedBy || '',
  };
}

async function currentDisplayName() {
  const prefs = await getUserPrefs();
  return prefs?.displayName || '';
}

export async function saveActivity(weekStart, dayKey, activity) {
  const week = await getWeek(weekStart);
  const day = week.days[dayKey] || emptyDay();
  const idx = day.activities.findIndex(a => a.id === activity.id);
  const isNew = idx < 0;
  // Stamp addedBy only on creation. Edits preserve whatever author the
  // row already had; pre-existing rows without an author stay blank.
  const stamped = isNew && !activity.addedBy
    ? { ...activity, addedBy: await currentDisplayName() }
    : activity;
  const next = normaliseActivity(stamped);
  if (!next.title) return null;
  if (isNew) {
    day.activities.push(next);
  } else {
    day.activities[idx] = { ...next, addedBy: day.activities[idx].addedBy || next.addedBy };
  }
  week.days[dayKey] = day;
  await saveWeek(week);
  return next;
}

export async function deleteActivity(weekStart, dayKey, activityId) {
  const week = await getWeek(weekStart);
  const day = week.days[dayKey] || emptyDay();
  day.activities = day.activities.filter(a => a.id !== activityId);
  week.days[dayKey] = day;
  await saveWeek(week);
}

// Used by the WeekIntake flow — overwrite all activities for the days
// the LLM/heuristic produced output for; leave other days untouched.
export async function replaceDays(weekStart, daysPatch) {
  const week = await getWeek(weekStart);
  const author = await currentDisplayName();
  for (const dayKey of Object.keys(daysPatch || {})) {
    if (!WEEKDAYS.includes(dayKey)) continue;
    const incoming = daysPatch[dayKey];
    if (!incoming || !Array.isArray(incoming.activities)) continue;
    week.days[dayKey] = {
      activities: incoming.activities
        .map(a => normaliseActivity({ ...a, addedBy: a.addedBy || author }))
        .filter(a => a.title),
    };
  }
  await saveWeek(week);
  return week;
}

export async function getAllWeeks() {
  return (await getJSON(KEYS.WEEKS)) || {};
}

// ── Events ───────────────────────────────────────────────────────────────────

export async function getEvents() {
  return (await getJSON(KEYS.EVENTS)) || [];
}

export async function saveEvent(event) {
  if (!event.date || !event.title) throw new Error('event.date and event.title required');
  const events = await getEvents();
  const data = { id: event.id || uid(), createdAt: new Date().toISOString(), ...event };
  const idx = events.findIndex(e => e.id === data.id);
  if (idx >= 0) events[idx] = data; else events.push(data);
  events.sort((a, b) => a.date.localeCompare(b.date));
  await setJSON(KEYS.EVENTS, events);
  api.state.upsertEvent(data).catch(() => {});
  return data;
}

export async function deleteEvent(id) {
  const events = (await getEvents()).filter(e => e.id !== id);
  await setJSON(KEYS.EVENTS, events);
  api.state.deleteEvent(id).catch(() => {});
}

export async function bulkUpsertEvents(items) {
  const events = await getEvents();
  for (const it of items) {
    const data = { id: it.id || uid(), createdAt: new Date().toISOString(), ...it };
    const idx = events.findIndex(e => e.id === data.id);
    if (idx >= 0) events[idx] = data; else events.push(data);
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  await setJSON(KEYS.EVENTS, events);
}

// ── User prefs ───────────────────────────────────────────────────────────────

export async function getUserPrefs() {
  return (await getJSON(KEYS.USER_PREFS)) || {};
}

export async function setUserPrefs(patch) {
  const prev = await getUserPrefs();
  const next = { ...prev, ...patch };
  await setJSON(KEYS.USER_PREFS, next);
  return next;
}

// ── Lists (todo + wish, both pair-scoped) ────────────────────────────────────

export async function getList(kind) {
  const key = LIST_KEY_FOR[kind];
  if (!key) throw new Error(`unknown list kind: ${kind}`);
  return (await getJSON(key)) || [];
}

export async function saveListItem(kind, item) {
  const key = LIST_KEY_FOR[kind];
  if (!key) throw new Error(`unknown list kind: ${kind}`);
  if (!item?.title) throw new Error('item.title required');
  const list = await getList(kind);
  const data = {
    id: item.id || uid(),
    title: item.title,
    notes: item.notes || null,
    label: item.label || null,
    done: !!item.done,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const idx = list.findIndex(i => i.id === data.id);
  if (idx >= 0) list[idx] = data; else list.push(data);
  await setJSON(key, list);
  api.list?.upsert(kind, data).catch(() => {});
  return data;
}

export async function deleteListItem(kind, id) {
  const key = LIST_KEY_FOR[kind];
  if (!key) throw new Error(`unknown list kind: ${kind}`);
  const list = (await getList(kind)).filter(i => i.id !== id);
  await setJSON(key, list);
  api.list?.remove(kind, id).catch(() => {});
}

// ── Local wipe (used by partner-join, since joining adopts the
//    partner's calendar instead of merging) ─────────────────────────────────

export async function wipeLocalCalendar() {
  await AsyncStorage.multiRemove([
    KEYS.WEEKS,
    KEYS.EVENTS,
    KEYS.LIST_TODO,
    KEYS.LIST_WISH,
  ]);
}
