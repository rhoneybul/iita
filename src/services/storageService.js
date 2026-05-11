// Storage — AsyncStorage-backed, local-first. Optional remote sync via
// /api/state when EXPO_PUBLIC_SERVER_URL is set. Two collections:
//   • weeks   — keyed by ISO Monday-of-week date (YYYY-MM-DD)
//   • events  — flat list of one-off year events
//
// Shape:
//   week = {
//     weekStart: '2026-05-11',
//     days: { Mon: { donde, juntos, oficina, importante, ejercicio, queMas }, ... }
//   }
//   event = { id, date: 'YYYY-MM-DD', endDate?: 'YYYY-MM-DD', title, location?, withWho? }

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { isoWeekStart } from '../utils/dates';

const KEYS = {
  WEEKS:        '@iita_weeks_v1',
  EVENTS:       '@iita_events_v1',
  CURRENT_USER: '@iita_current_user_id',
  USER_PREFS:   '@iita_user_prefs_v1',
};

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
  return { donde: '', juntos: '', oficina: '', importante: '', ejercicio: '', queMas: '' };
}

export function emptyWeek(weekStart) {
  return {
    weekStart,
    days: WEEKDAYS.reduce((acc, d) => ({ ...acc, [d]: emptyDay() }), {}),
  };
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
    if (force || !(await getJSON(KEYS.WEEKS)))  await setJSON(KEYS.WEEKS,  remote.weeks  || {});
    if (force || !(await getJSON(KEYS.EVENTS))) await setJSON(KEYS.EVENTS, remote.events || []);
    return true;
  } catch {
    return false;
  }
}

// ── Weeks ────────────────────────────────────────────────────────────────────

export async function getWeek(weekStart) {
  const all = (await getJSON(KEYS.WEEKS)) || {};
  return all[weekStart] || emptyWeek(weekStart);
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

// ── First-run seed ───────────────────────────────────────────────────────────

export async function seedIfEmpty(seedEvents) {
  const existing = await getEvents();
  if (existing.length > 0) return;
  await bulkUpsertEvents(seedEvents);
}
