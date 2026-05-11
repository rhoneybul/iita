// Tiny API client. Talks to the iita server if EXPO_PUBLIC_SERVER_URL is
// set, otherwise every method resolves to null/undefined so the app stays
// fully usable offline (state stays in AsyncStorage only).

import Constants from 'expo-constants';
import { getAccessToken } from './authService';

const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL ||
  Constants.expoConfig?.extra?.serverUrl ||
  '';

const enabled = !!SERVER_URL;

async function request(path, { method = 'GET', body, signal } = {}) {
  if (!enabled) return null;
  const token = await getAccessToken();
  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  enabled,
  state: {
    get:           ()        => request('/state'),
    upsertWeek:    (week)    => request('/state/week',  { method: 'PUT',    body: week }),
    upsertEvent:   (event)   => request('/state/event', { method: 'PUT',    body: event }),
    deleteEvent:   (id)      => request(`/state/event/${id}`, { method: 'DELETE' }),
  },
  parseWeek: (input) => request('/parse-week', { method: 'POST', body: input }),
};
